// Trusted control-repository script. Never execute this file from the release checkout.
import {
  appendFile,
  cp,
  mkdir,
  readFile,
  readdir,
  writeFile,
  lstat,
} from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const migrationHash = (text) =>
  createHash('sha256').update(text.replaceAll('\r\n', '\n')).digest('hex');
export function validatePlan(plan) {
  const r = plan?.run;
  if (
    !r ||
    !['repository', 'version', 'sha', 'id'].every(
      (key) => typeof r[key] === 'string' && r[key] === r[key].trim(),
    ) ||
    !/^[a-z0-9][a-z0-9-]{0,38}\/[a-z0-9][a-z0-9._-]{0,99}$/.test(
      r.repository,
    ) ||
    !/^[a-f0-9]{40}$/.test(r.sha) ||
    !/^\d+\.\d+\.\d+$/.test(r.version) ||
    !/^[a-f0-9-]{36}$/.test(r.id)
  )
    throw new Error('Invalid update plan');
  if (
    !plan.installedMigrations ||
    typeof plan.installedMigrations !== 'object' ||
    Array.isArray(plan.installedMigrations)
  )
    throw new Error('Missing migration baseline');
  return plan;
}
export function additiveMigration(text) {
  const stripped = text
    .replace(/--[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/'(?:''|[^'])*'/g, "''");
  return stripped
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)
    .every(
      (s) =>
        /^CREATE\s+(?:TABLE|(?:UNIQUE\s+)?INDEX)\s/i.test(s) ||
        /^ALTER\s+TABLE\s+[`"\w]+\s+ADD\s+(?!CONSTRAINT\b)/i.test(s),
    );
}
export function validateMigrations(installed, files) {
  for (const [name, hash] of Object.entries(installed))
    if (!(name in files) || migrationHash(files[name]) !== hash)
      throw new Error(
        `Previously installed migration changed or missing: ${name}`,
      );
  for (const [name, sql] of Object.entries(files))
    if (!(name in installed) && !additiveMigration(sql))
      throw new Error(
        `Non-additive migration needs a separately reviewed manual upgrade: ${name}`,
      );
}
async function endpoint(body) {
  const url = new URL(process.env.ENGINE_SITE_URL);
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  )
    throw new Error('ENGINE_SITE_URL must be an HTTPS origin');
  if (
    !process.env.UPDATE_RUNNER_SECRET ||
    process.env.UPDATE_RUNNER_SECRET.length < 32
  )
    throw new Error('Missing runner secret');
  const response = await fetch(new URL('/api/updates/runner', url), {
    method: 'POST',
    redirect: 'error',
    headers: {
      authorization: `Bearer ${process.env.UPDATE_RUNNER_SECRET}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ ...body, githubRunId: process.env.GITHUB_RUN_ID }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok)
    throw new Error(`Site rejected updater request (${response.status})`);
  return response.json();
}
function planFromEnv() {
  return validatePlan(
    JSON.parse(
      Buffer.from(process.env.UPDATE_PLAN ?? '', 'base64').toString('utf8'),
    ),
  );
}
async function noLinks(directory) {
  for (const name of await readdir(directory)) {
    const full = path.join(directory, name),
      stat = await lstat(full);
    if (stat.isSymbolicLink())
      throw new Error('Symlinks are forbidden in deployment artifacts');
    if (stat.isDirectory()) await noLinks(full);
  }
}
async function main(mode) {
  if (mode === 'plan') {
    const plan = await endpoint({ action: 'claim' });
    if (!plan.run) {
      await appendFile(process.env.GITHUB_OUTPUT, 'has_update=false\n');
      return;
    }
    validatePlan(plan);
    await appendFile(
      process.env.GITHUB_OUTPUT,
      `has_update=true\nplan=${Buffer.from(JSON.stringify(plan)).toString('base64')}\nrepository=${plan.run.repository}\nsha=${plan.run.sha}\nversion=${plan.run.version}\n`,
    );
  } else if (mode === 'package') {
    const plan = planFromEnv();
    const source = path.resolve(process.env.UPDATE_SOURCE || 'source');
    const manifest = JSON.parse(
      await readFile(path.join(source, 'engine-release.json'), 'utf8'),
    );
    if (
      manifest.engine !== 'northstar-engine' ||
      manifest.updateProtocol !== 1 ||
      manifest.migrationPolicy !== 'additive'
    )
      throw new Error('Release is not compatible with this updater');
    const files = {};
    for (const name of await readdir(path.join(source, 'drizzle')))
      if (name.endsWith('.sql'))
        files[name] = await readFile(
          path.join(source, 'drizzle', name),
          'utf8',
        );
    validateMigrations(plan.installedMigrations, files);
    await noLinks(path.join(source, 'dist/server'));
    await noLinks(path.join(source, 'dist/client'));
    await readFile(path.join(source, 'dist/server/index.js'));
    await mkdir('update-bundle', { recursive: true });
    await cp(path.join(source, 'dist/server'), 'update-bundle/server', {
      recursive: true,
    });
    await cp(path.join(source, 'dist/client'), 'update-bundle/client', {
      recursive: true,
    });
    await mkdir('update-bundle/migrations', { recursive: true });
    for (const [name, sql] of Object.entries(files))
      await writeFile(path.join('update-bundle/migrations', name), sql);
    await writeFile('update-bundle/plan.json', JSON.stringify(plan));
  } else if (mode === 'deploy') {
    const plan = planFromEnv();
    const claim = validatePlan(
      await endpoint({ action: 'authorize', runId: plan.run.id }),
    );
    if (
      claim.run.sha !== plan.run.sha ||
      claim.run.repository !== plan.run.repository
    )
      throw new Error('Update authorization changed');
    const bundle = path.resolve('update-bundle');
    await noLinks(bundle);
    const artifact = JSON.parse(
      await readFile(path.join(bundle, 'plan.json'), 'utf8'),
    );
    if (JSON.stringify(artifact) !== JSON.stringify(plan))
      throw new Error('Artifact does not match plan');
    const files = {};
    for (const name of await readdir(path.join(bundle, 'migrations')))
      files[name] = await readFile(
        path.join(bundle, 'migrations', name),
        'utf8',
      );
    validateMigrations(claim.installedMigrations, files);
    const config = JSON.parse(
      await readFile('control/deployment/worker.json', 'utf8'),
    );
    if (
      !config.name ||
      !config.d1_databases?.some(
        (db) => db.binding === 'DB' && !db.database_id.includes('REPLACE'),
      )
    )
      throw new Error(
        'Configure deployment/worker.json in the control repository',
      );
    // All credentials/configuration come from the control repo, never the release.
    config.main = path.join(bundle, 'server/index.js');
    config.no_bundle = true;
    delete config.build;
    config.rules = [{ type: 'ESModule', globs: ['**/*.js', '**/*.mjs'] }];
    config.assets = {
      ...config.assets,
      directory: path.join(bundle, 'client'),
    };
    config.d1_databases = config.d1_databases.map((db) =>
      db.binding === 'DB'
        ? { ...db, migrations_dir: path.join(bundle, 'migrations') }
        : db,
    );
    await writeFile('update-deploy.json', JSON.stringify(config));
    const cli = path.resolve('control/node_modules/wrangler/bin/wrangler.js');
    const exec = (args) => {
      const r = spawnSync(process.execPath, [cli, ...args], {
        stdio: 'inherit',
        env: process.env,
      });
      if (r.status !== 0)
        throw new Error(
          'Cloudflare command failed; inspect migration/deployment logs before retrying',
        );
    };
    exec([
      'd1',
      'migrations',
      'apply',
      'DB',
      '--remote',
      '--config',
      'update-deploy.json',
    ]);
    exec(['deploy', '--config', 'update-deploy.json', '--keep-vars']);
  } else if (mode === 'report') {
    const plan = planFromEnv();
    const success = process.env.UPDATE_RESULT === 'success';
    for (let attempt = 0; attempt < 12; attempt++) {
      try {
        await endpoint({
          action: 'complete',
          runId: plan.run.id,
          status: success ? 'succeeded' : 'failed',
        });
        return;
      } catch (error) {
        if (attempt === 11) throw error;
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  } else throw new Error('Unknown updater command');
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main(process.argv[2]).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });

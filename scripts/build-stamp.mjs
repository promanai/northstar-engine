import { createHash } from 'node:crypto';
import { lstatSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const textExtension =
  /\.(?:tsx?|jsx?|mjs|cjs|json|jsonc|css|sql|html|svg|txt)$/i;

export function fingerprintEntries(entries, metadata) {
  return hash(
    JSON.stringify({
      format: 1,
      metadata,
      files: entries
        .map(([name, bytes]) => [
          name.replaceAll('\\', '/'),
          hash(
            textExtension.test(name)
              ? Buffer.from(bytes).toString('utf8').replaceAll('\r\n', '\n')
              : bytes,
          ),
        ])
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
    }),
  );
}

export function createBuildStamp(root, { version, repository, sha, mode }) {
  if (
    typeof version !== 'string' ||
    version.length > 100 ||
    !/^\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?(?:\+[A-Za-z0-9.-]+)?$/.test(version) ||
    (sha !== '' && !/^[a-f0-9]{40}$/.test(sha)) ||
    (repository !== '' &&
      !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) ||
    !['lite', 'standard'].includes(mode)
  )
    throw new Error('Invalid build identity configuration');
  const entries = [];
  const visit = (relative) => {
    const absolute = path.join(root, relative);
    let stat;
    try {
      stat = lstatSync(absolute);
    } catch (error) {
      if (error.code === 'ENOENT') return;
      throw error;
    }
    if (stat.isSymbolicLink())
      throw new Error('Build source symlinks are not supported');
    if (stat.isDirectory()) {
      for (const name of readdirSync(absolute).sort()) {
        if (name.startsWith('.') || name === 'node_modules') continue;
        visit(path.join(relative, name));
      }
    } else if (stat.isFile()) entries.push([relative, readFileSync(absolute)]);
  };
  // Explicit source surface only: never traverse working D1, backups, .env,
  // user cookies, output reports, Git state or node_modules.
  for (const name of [
    'app',
    'components',
    'lib',
    'db',
    'drizzle',
    'hooks',
    'public',
    'scripts',
    'worker.ts',
    'proxy.ts',
    'vite.config.ts',
    'next.config.ts',
    'tsconfig.json',
    'drizzle.config.ts',
    'package.json',
    'package-lock.json',
    'site.config.json',
    'engine-release.json',
  ])
    visit(name);
  if (!entries.length) throw new Error('Build source is empty');
  return {
    format: 1,
    id: fingerprintEntries(entries, {
      version,
      repository,
      sha,
      mode,
      node: process.version,
    }),
    version,
    commit: sha || null,
  };
}

export function validateBuildStamp(value) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).sort().join(',') !== 'commit,format,id,version' ||
    value.format !== 1 ||
    typeof value.id !== 'string' ||
    !/^[a-f0-9]{64}$/.test(value.id) ||
    typeof value.version !== 'string' ||
    value.version.length > 100 ||
    !/^\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?(?:\+[A-Za-z0-9.-]+)?$/.test(
      value.version,
    ) ||
    !(
      value.commit === null ||
      (typeof value.commit === 'string' && /^[a-f0-9]{40}$/.test(value.commit))
    )
  )
    throw new Error('INVALID_BUILD_STAMP');
  return {
    format: 1,
    id: value.id,
    version: value.version,
    commit: value.commit,
  };
}

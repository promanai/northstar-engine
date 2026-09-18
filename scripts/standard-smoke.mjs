import { open } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateBuildStamp } from './build-stamp.mjs';
import {
  runStandardSmoke,
  smokeTarget,
  smokeCredentials,
} from './standard-smoke-policy.mjs';

export function smokeArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    if (
      ![
        '--url',
        '--report',
        '--admin-origin',
        '--expect-build',
        '--allow-local',
        '--help',
      ].includes(key) ||
      key in args
    )
      throw new Error('INVALID_ARGUMENTS');
    if (['--allow-local', '--help'].includes(key)) args[key] = true;
    else {
      const value = argv[++i];
      if (!value || value.startsWith('--'))
        throw new Error('INVALID_ARGUMENTS');
      args[key] = value;
    }
  }
  if (!args['--help'] && (!args['--url'] || !args['--report']))
    throw new Error('URL_AND_REPORT_REQUIRED');
  return args;
}

export async function main(argv = process.argv.slice(2), env = process.env) {
  const args = smokeArgs(argv);
  if (args['--help']) {
    console.log(
      'Standard HTTP smoke (GET only)\n npm run check:standard -- --url https://YOUR-SITE.example --report outputs/smoke.json --expect-build dist/engine-build.json\nOptional: --admin-origin EXACT_ORIGIN with NORTHSTAR_SMOKE_COOKIE environment variable.\n--expect-build checks the expected release before sending a session. Without it the release is NOT verified.\n--allow-local permits loopback HTTP for local tests. Existing reports are never overwritten.',
    );
    return;
  }
  const origin = smokeTarget(args['--url'], args['--allow-local']);
  const cookie = smokeCredentials(
    origin,
    args['--admin-origin'],
    env.NORTHSTAR_SMOKE_COOKIE ?? '',
  );
  const expectedBuild = args['--expect-build']
    ? await readExpectedBuild(args['--expect-build'])
    : undefined;
  // Reserve a NEW report before any HTTP request; do not clobber evidence/files.
  const file = await open(path.resolve(args['--report']), 'wx', 0o600);
  try {
    const report = await runStandardSmoke({
      url: origin,
      allowLocal: args['--allow-local'],
      adminOrigin: args['--admin-origin'],
      cookie,
      expectedBuild,
    });
    await file.writeFile(JSON.stringify(report, null, 2) + '\n');
    console.log(
      `Standard HTTP smoke: ${report.passed ? 'PASS' : 'FAIL'}; release: ${report.release.status}; ${report.requests} GET requests; ${report.checks.filter((c) => c.status === 'skipped').length} skipped groups. See JSON report.`,
    );
    if (!report.passed) process.exitCode = 1;
  } finally {
    await file.close();
  }
}

export async function readExpectedBuild(filename) {
  const file = await open(path.resolve(filename), 'r');
  try {
    if (!(await file.stat()).isFile()) throw new Error('INVALID_BUILD_STAMP');
    const buffer = Buffer.alloc(4097);
    const { bytesRead } = await file.read(buffer, 0, buffer.length, 0);
    if (bytesRead > 4096) throw new Error('INVALID_BUILD_STAMP');
    return validateBuildStamp(
      JSON.parse(buffer.subarray(0, bytesRead).toString('utf8')),
    );
  } finally {
    await file.close();
  }
}

if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url))
  main().catch(() => {
    // OS/network errors can contain paths, credentials or untrusted remote text.
    console.error(
      'Standard smoke could not run. Check arguments, exact origin, session format and a NEW report path in an existing directory. No raw error is printed.',
    );
    process.exitCode = 1;
  });

// Three independent clean runs, NOT retries: fail immediately on any failure.
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const output = await mkdtemp(path.join(root, '.test-state-lite-stability-'));
const report = {
  version: 1,
  startedAt: new Date().toISOString(),
  expectedRuns: 3,
  build: JSON.parse(
    await readFile(path.join(root, 'dist/engine-build.json'), 'utf8'),
  ),
  scope:
    'Local Lite API including single-connection rejection probes, then Chromium with mocked lead delivery; no external delivery',
  runs: [],
  passed: false,
};
try {
  for (let round = 1; round <= report.expectedRuns; round++) {
    console.log(`Lite stability ${round}/${report.expectedRuns}`);
    const code = await new Promise((resolve, reject) => {
      const child = spawn(
        process.execPath,
        [path.join(root, 'tests/lite-integration.mjs'), '--after-api-browser'],
        {
          cwd: root,
          windowsHide: true,
          stdio: 'inherit',
        },
      );
      child.on('error', reject);
      child.on('exit', (exitCode) => resolve(exitCode ?? 1));
    });
    report.runs.push({ round, exitCode: code });
    if (code !== 0) {
      process.exitCode = 1;
      break;
    }
  }
  report.passed =
    report.runs.length === report.expectedRuns &&
    report.runs.every((run) => run.exitCode === 0);
} catch {
  process.exitCode = 1;
} finally {
  await writeFile(
    path.join(output, 'stability-report.json'),
    JSON.stringify(
      { ...report, finishedAt: new Date().toISOString() },
      null,
      2,
    ),
  );
  console.log(
    'Lite stability report: ' + path.join(output, 'stability-report.json'),
  );
}

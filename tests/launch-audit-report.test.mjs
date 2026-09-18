import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  validateAuditReport,
  compareAuditReports,
} from '../scripts/launch-audit-report.mjs';
import { auditLaunch } from '../scripts/launch-audit.mjs';
const plan = JSON.parse(await readFile('onboarding/checklist.json', 'utf8'));
const fixture = () => ({
  version: 1,
  kind: 'launch-source-audit',
  mode: 'lite',
  summary: { pass: 0, warn: 1, fail: 0, manual: 0 },
  checks: [
    {
      id: 'brand.name',
      taskId: 'brand',
      status: 'warn',
      title: 'Brand',
      action: 'Review name',
    },
  ],
  boundaries: ['Local sources only'],
});
const v2 = () => ({
  ...fixture(),
  version: 2,
  generatedAt: '2026-09-11T10:00:00.000Z',
  source: {
    scope: 'checked-inputs-v1',
    algorithm: 'sha256',
    digest: 'a'.repeat(64),
    complete: true,
    files: 5,
  },
});
void test('version 2 source claims reject invalid timestamp, digest, scope and impossible counts', () => {
  for (const mutate of [
    (r) => {
      r.generatedAt = '2026-02-30T10:00:00.000Z';
    },
    (r) => {
      r.source.algorithm = 'md5';
    },
    (r) => {
      r.source.digest = 'not-a-hash';
    },
    (r) => {
      r.source.complete = 'true';
    },
    (r) => {
      r.source.files = 4;
    },
    (r) => {
      r.source.files = 7;
    },
    (r) => {
      r.source.scope = 'whole-site';
    },
    (r) => {
      r.source.path = 'PRIVATE_PATH';
    },
  ]) {
    const report = v2();
    mutate(report);
    assert.throws(() => validateAuditReport(plan, report));
  }
});
void test('report comparison distinguishes changed, older, incomplete, legacy, mode and inconsistent findings', () => {
  const previous = v2();
  assert.equal(compareAuditReports(plan, previous, v2()), 'matched');
  for (const [mutate, expected] of [
    [
      (r) => {
        r.source.digest = 'b'.repeat(64);
      },
      'changed',
    ],
    [
      (r) => {
        r.source.complete = false;
      },
      'incomplete',
    ],
    [
      (r) => {
        r.generatedAt = '2026-09-10T10:00:00.000Z';
      },
      'older',
    ],
    [
      (r) => {
        r.mode = 'standard';
      },
      'mode_mismatch',
    ],
    [
      (r) => {
        r.checks[0].action = 'Different claim';
      },
      'inconsistent',
    ],
  ]) {
    const next = v2();
    mutate(next);
    assert.equal(compareAuditReports(plan, previous, next), expected);
  }
  assert.equal(compareAuditReports(plan, fixture(), v2()), 'legacy');
  const reordered = v2();
  reordered.checks[0] = Object.fromEntries(
    Object.entries(reordered.checks[0]).reverse(),
  );
  assert.equal(compareAuditReports(plan, previous, reordered), 'matched');
});
void test('audit report parser accepts current producer output and does not mutate data', async () => {
  const report = await auditLaunch(process.cwd());
  const before = structuredClone(report);
  assert.equal(validateAuditReport(plan, report), report);
  assert.deepEqual(report, before);
});
void test('audit report parser rejects unknown schema, forged counters, duplicate IDs and unknown steps', () => {
  for (const mutate of [
    (r) => {
      r.kind = 'launch-passport';
    },
    (r) => {
      r.version = 2;
    },
    (r) => {
      r.mode = 'custom';
    },
    (r) => {
      r.summary.warn = 0;
    },
    (r) => {
      r.summary.warn = '1';
    },
    (r) => {
      r.extra = 'PRIVATE';
    },
    (r) => {
      r.checks[0].taskId = 'unknown';
    },
    (r) => {
      r.checks[0].status = 'ready';
    },
    (r) => {
      r.checks.push({ ...r.checks[0] });
      r.summary.warn++;
    },
    (r) => {
      r.checks[0].action = 'x'.repeat(4001);
    },
    (r) => {
      r.checks = [];
    },
    (r) => {
      r.boundaries = null;
    },
    (r) => {
      r.checks[0].href = 'https://example.invalid';
    },
  ]) {
    const r = fixture();
    mutate(r);
    assert.throws(() => validateAuditReport(plan, r), /INVALID_AUDIT_REPORT/);
  }
  for (const r of [null, [], 'text'])
    assert.throws(() => validateAuditReport(plan, r));
});
void test('audit report parser bounds total UTF-8 size and leaves HTML as inert text data', () => {
  const r = fixture();
  r.checks[0].action = '<img src=x onerror=alert(1)>';
  assert.equal(
    validateAuditReport(plan, r).checks[0].action,
    r.checks[0].action,
  );
  r.checks = Array.from({ length: 100 }, (_, i) => ({
    ...r.checks[0],
    id: `check.${i}`,
    action: 'я'.repeat(4000),
  }));
  r.summary.warn = 100;
  assert.throws(() => validateAuditReport(plan, r), /INVALID_AUDIT_REPORT/);
});

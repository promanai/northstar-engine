// Pure shared parser: imported reports are untrusted data, never executable instructions.
export const AUDIT_REPORT_MAX_BYTES = 256 * 1024;
export function validateAuditReport(plan, report) {
  const invalid = () => {
    throw new Error('INVALID_AUDIT_REPORT');
  };
  const keys = (value, expected) =>
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).length === expected.length &&
    expected.every((key) => Object.hasOwn(value, key));
  const string = (value, max) =>
    typeof value === 'string' && value.trim().length > 0 && value.length <= max;
  const statuses = ['pass', 'warn', 'fail', 'manual'];
  if (
    !keys(report, [
      'version',
      'kind',
      'mode',
      'summary',
      'checks',
      'boundaries',
      ...(report?.version === 2 ? ['generatedAt', 'source'] : []),
    ]) ||
    ![1, 2].includes(report.version) ||
    report.kind !== 'launch-source-audit' ||
    !['lite', 'standard'].includes(report.mode) ||
    !Array.isArray(report.checks) ||
    !report.checks.length ||
    report.checks.length > 100 ||
    !keys(report.summary, statuses) ||
    !Array.isArray(report.boundaries) ||
    !report.boundaries.length ||
    report.boundaries.length > 10 ||
    !report.boundaries.every((b) => string(b, 1000))
  )
    invalid();
  if (report.version === 2) {
    if (
      !keys(report.source, [
        'scope',
        'algorithm',
        'digest',
        'complete',
        'files',
      ]) ||
      report.source.scope !== 'checked-inputs-v1' ||
      report.source.algorithm !== 'sha256' ||
      typeof report.source.digest !== 'string' ||
      !/^[a-f0-9]{64}$/.test(report.source.digest) ||
      typeof report.source.complete !== 'boolean' ||
      !Number.isInteger(report.source.files) ||
      report.source.files < 0 ||
      report.source.files > 6 ||
      (report.source.complete && report.source.files < 5) ||
      typeof report.generatedAt !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
        report.generatedAt,
      ) ||
      !Number.isFinite(Date.parse(report.generatedAt)) ||
      new Date(report.generatedAt).toISOString() !== report.generatedAt
    )
      invalid();
  }
  const ids = new Set();
  const counts = { pass: 0, warn: 0, fail: 0, manual: 0 };
  for (const check of report.checks) {
    if (
      !keys(check, ['id', 'taskId', 'status', 'title', 'action']) ||
      typeof check.id !== 'string' ||
      !/^[a-z][a-z0-9_.-]{1,79}$/.test(check.id) ||
      ids.has(check.id) ||
      !plan.tasks.some((task) => task.id === check.taskId) ||
      !statuses.includes(check.status) ||
      !string(check.title, 200) ||
      !string(check.action, 4000)
    )
      invalid();
    ids.add(check.id);
    counts[check.status]++;
  }
  if (statuses.some((status) => report.summary[status] !== counts[status]))
    invalid();
  if (
    new TextEncoder().encode(JSON.stringify(report)).byteLength >
    AUDIT_REPORT_MAX_BYTES
  )
    invalid();
  return report;
}

export function compareAuditReports(plan, previous, current) {
  validateAuditReport(plan, previous);
  validateAuditReport(plan, current);
  if (previous.mode !== current.mode) return 'mode_mismatch';
  if (previous.version !== 2 || current.version !== 2) return 'legacy';
  if (!previous.source.complete || !current.source.complete)
    return 'incomplete';
  if (current.generatedAt < previous.generatedAt) return 'older';
  if (
    previous.source.digest !== current.source.digest ||
    previous.source.files !== current.source.files
  )
    return 'changed';
  // Equal source claims with different findings cannot be accepted as a match.
  const findings = (report) =>
    JSON.stringify(
      report.checks
        .map((c) => [c.id, c.taskId, c.status, c.title, c.action])
        .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)),
    );
  if (findings(previous) !== findings(current)) return 'inconsistent';
  return 'matched';
}

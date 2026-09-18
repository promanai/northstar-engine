const object = (v) => v && typeof v === 'object' && !Array.isArray(v);
const compareKeys = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const exactKeys = (v, keys) =>
  object(v) &&
  Object.keys(v).sort(compareKeys).join(',') ===
    [...keys].sort(compareKeys).join(',');
const text = (v, max = 4000) => typeof v === 'string' && v.length <= max;
const fail = () => {
  throw new Error('INVALID_LAUNCH_PASSPORT');
};

export const PASSPORT_MAX_BYTES = 512 * 1024;
export function serializePassport(plan, state) {
  validatePassport(plan, state);
  const data = JSON.stringify(state, null, 2) + '\n';
  if (new TextEncoder().encode(data).byteLength > PASSPORT_MAX_BYTES)
    throw new Error('PASSPORT_TOO_LARGE');
  return data;
}

export function validateChecklist(plan) {
  if (
    !exactKeys(plan, ['version', 'title', 'stages', 'tasks']) ||
    plan.version !== 1 ||
    !text(plan.title, 120) ||
    !Array.isArray(plan.stages) ||
    !plan.stages.every((s) => text(s, 80)) ||
    !Array.isArray(plan.tasks) ||
    !plan.tasks.length ||
    plan.tasks.length > 100
  )
    fail();
  const seen = new Set();
  for (const t of plan.tasks) {
    if (
      !exactKeys(t, [
        'id',
        'stage',
        'title',
        'dependsOn',
        'optional',
        'modes',
        'questions',
        'acceptance',
      ]) ||
      !/^[a-z][a-z_]{1,40}$/.test(t.id) ||
      seen.has(t.id) ||
      !plan.stages.includes(t.stage) ||
      !text(t.title, 140) ||
      typeof t.optional !== 'boolean' ||
      !Array.isArray(t.dependsOn) ||
      !t.dependsOn.every((id) => seen.has(id)) ||
      new Set(t.dependsOn).size !== t.dependsOn.length ||
      !Array.isArray(t.modes) ||
      !t.modes.length ||
      !t.modes.every((m) => ['lite', 'standard'].includes(m)) ||
      !Array.isArray(t.questions) ||
      !t.questions.length ||
      !t.questions.every((q) => text(q, 600) && q.trim()) ||
      !Array.isArray(t.acceptance) ||
      !t.acceptance.length ||
      !t.acceptance.every((q) => text(q, 600) && q.trim())
    )
      fail();
    seen.add(t.id); // Topological order is mandatory: rejects cycles and unknown dependencies.
  }
  return plan;
}

export function createPassport(plan, mode) {
  validateChecklist(plan);
  if (!['lite', 'standard'].includes(mode)) fail();
  return {
    version: plan.version,
    mode,
    site: '',
    tasks: Object.fromEntries(
      plan.tasks.map((t) => [
        t.id,
        {
          status: 'todo',
          answers: t.questions.map(() => ''),
          evidence: '',
          reason: '',
        },
      ]),
    ),
  };
}

export function validatePassport(plan, state) {
  validateChecklist(plan);
  if (
    !exactKeys(state, ['version', 'mode', 'site', 'tasks']) ||
    state.version !== plan.version ||
    !['lite', 'standard'].includes(state.mode) ||
    !text(state.site, 200) ||
    !exactKeys(
      state.tasks,
      plan.tasks.map((t) => t.id),
    )
  )
    fail();
  for (const t of plan.tasks) {
    const s = state.tasks[t.id];
    if (
      !exactKeys(s, ['status', 'answers', 'evidence', 'reason']) ||
      !['todo', 'in_progress', 'done', 'not_applicable'].includes(s.status) ||
      !Array.isArray(s.answers) ||
      s.answers.length !== t.questions.length ||
      !s.answers.every((a) => text(a)) ||
      !text(s.evidence) ||
      !text(s.reason, 1000)
    )
      fail();
    if (s.status === 'not_applicable' && (!t.optional || !s.reason.trim()))
      fail();
    if (
      s.status === 'done' &&
      (!s.answers.every((a) => a.trim()) || !s.evidence.trim())
    )
      fail();
  }
  return state;
}

export function evaluatePassport(plan, state) {
  validatePassport(plan, state);
  const resolved = new Map();
  const tasks = plan.tasks.map((t) => {
    const s = state.tasks[t.id];
    const applicable = t.modes.includes(state.mode);
    const blockedBy = applicable
      ? t.dependsOn.filter((id) => !resolved.get(id))
      : [];
    const waived = applicable && s.status === 'not_applicable';
    const complete =
      !applicable || waived || (s.status === 'done' && blockedBy.length === 0);
    resolved.set(t.id, complete);
    return {
      id: t.id,
      title: t.title,
      stage: t.stage,
      applicable,
      declaredStatus: s.status,
      status: !applicable
        ? 'out_of_scope'
        : waived
          ? 'not_applicable'
          : blockedBy.length
            ? 'blocked'
            : s.status,
      blockedBy,
      complete,
      questions: t.questions,
      acceptance: t.acceptance,
    };
  });
  const applicable = tasks.filter((t) => t.applicable);
  const completed = applicable.filter((t) => t.complete).length;
  return {
    version: 1,
    mode: state.mode,
    ready: tasks.every((t) => t.complete),
    completed,
    total: applicable.length,
    percent: Math.floor((completed / applicable.length) * 100),
    next: tasks
      .filter((t) => t.applicable && !t.complete && !t.blockedBy.length)
      .map((t) => t.id),
    tasks,
  };
}

export function launchMarkdown(plan, state) {
  const report = evaluatePassport(plan, state);
  const lines = [
    '# ' + plan.title,
    '',
    `Режим: ${state.mode}. Закрыто: ${report.completed}/${report.total} (${report.percent}%).`,
    '',
    report.ready
      ? 'Все пункты отмечены и зависимости закрыты. Это декларация проверяющего, не автоматический аудит.'
      : 'К рабочему запуску не готов: остались незакрытые пункты.',
    '',
    'Следующие доступные шаги: ' + (report.next.join(', ') || 'нет'),
    '',
    'Ответы и доказательства намеренно не включены в этот отчёт. Статусы отражают заполненный паспорт, а не независимую проверку.',
    '',
    '## Граф зависимостей',
    '',
    '```mermaid',
    'flowchart TD',
  ];
  for (const t of report.tasks)
    lines.push(`  ${t.id}["${t.title} (${t.status})"]`);
  for (const t of plan.tasks)
    for (const dep of t.dependsOn) lines.push(`  ${dep} --> ${t.id}`);
  lines.push('```');
  for (const stage of plan.stages) {
    lines.push('', '## ' + stage, '');
    for (const t of report.tasks.filter((t) => t.stage === stage)) {
      lines.push(
        `- [${t.complete ? 'x' : ' '}] **${t.title}** — \`${t.id}\`, ${t.status}`,
        '',
      );
      if (t.blockedBy.length)
        lines.push('  Зависит от: ' + t.blockedBy.join(', '), '');
      for (const q of t.questions) lines.push('  - Вопрос: ' + q);
      for (const a of t.acceptance) lines.push('  - Проверка: ' + a);
      lines.push('');
    }
  }
  return lines.join('\n') + '\n';
}

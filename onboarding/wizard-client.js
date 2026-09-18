/* Shared validation and plan are injected by launch-wizard.mjs. No network calls. */
const $ = (id) => document.getElementById(id);
const labels = {
  todo: 'Не начато',
  in_progress: 'В работе',
  done: 'Выполнено',
  not_applicable: 'Не требуется',
  blocked: 'Ожидает условий',
  out_of_scope: 'Не входит в режим',
};
let state = createPassport(plan, 'lite');
let selected = plan.tasks[0].id;
let dirty = false;
let draftDirty = false;
let busy = false;
let auditReport = null;
let auditComparison = null;
function message(text, error = false) {
  $('message').setAttribute('role', error ? 'alert' : 'status');
  $('message').textContent = text;
  $('message').classList.toggle('error', error);
}
function changed() {
  dirty = true;
  $('save-status').textContent =
    'Есть изменения в этой вкладке · сохраните JSON-файл';
}
function el(tag, text, className) {
  const e = document.createElement(tag);
  if (text !== undefined) e.textContent = text;
  if (className) e.className = className;
  return e;
}
function commit() {
  for (const field of $('form').querySelectorAll('[aria-invalid]'))
    field.removeAttribute('aria-invalid');
  const candidate = structuredClone(state);
  candidate.site = $('site').value;
  candidate.mode = $('mode').value;
  candidate.tasks[selected] = {
    status: $('status').value,
    answers: [...$('questions').querySelectorAll('textarea')].map(
      (t) => t.value,
    ),
    evidence: $('evidence').value,
    reason: $('reason').value,
  };
  try {
    validatePassport(plan, candidate);
  } catch {
    showView(false);
    message(
      'Шаг не применён: для «Выполнено» заполните все ответы и доказательство; для «Не требуется» укажите причину. Можно сохранить незавершённое как «В работе».',
      true,
    );
    const missing =
      candidate.tasks[selected].status === 'done'
        ? [
            ...$('questions').querySelectorAll('textarea'),
            $('evidence'),
          ].filter((f) => !f.value.trim())
        : candidate.tasks[selected].status === 'not_applicable' &&
            !$('reason').value.trim()
          ? [$('reason')]
          : [];
    for (const field of missing) field.setAttribute('aria-invalid', 'true');
    missing[0]?.focus();
    return false;
  }
  if (JSON.stringify(candidate) !== JSON.stringify(state)) {
    state = candidate;
    changed();
  }
  draftDirty = false;
  const report = evaluatePassport(plan, state);
  $('progress-text').textContent =
    `${report.completed} из ${report.total} · ${report.percent}%`;
  $('progress').value = report.percent;
  $('next').disabled = !report.next.length;
  return true;
}
function selectTask(id) {
  if (busy || !commit()) return;
  selected = id;
  render();
  $('title').focus();
}
function render() {
  const report = evaluatePassport(plan, state);
  $('progress-text').textContent =
    `${report.completed} из ${report.total} · ${report.percent}%`;
  $('progress').value = report.percent;
  $('next').disabled = !report.next.length;
  $('site').value = state.site;
  $('mode').value = state.mode;
  $('steps').replaceChildren();
  for (const stage of plan.stages) {
    $('steps').append(el('p', stage, 'stage'));
    for (const t of report.tasks.filter((t) => t.stage === stage)) {
      const b = el('button', undefined, 'step');
      b.type = 'button';
      b.append(el('span', t.title), el('small', labels[t.status]));
      if (t.id === selected) b.setAttribute('aria-current', 'step');
      b.addEventListener('click', () => selectTask(t.id));
      $('steps').append(b);
    }
  }
  const t = plan.tasks.find((t) => t.id === selected),
    s = state.tasks[selected],
    result = report.tasks.find((t) => t.id === selected);
  $('stage').textContent = t.stage;
  $('title').textContent = t.title;
  $('task-status').textContent =
    labels[result.status] +
    (result.status === 'blocked' && s.status === 'done'
      ? ' · отмечено выполненным, но условия не закрыты'
      : '');
  $('deps').replaceChildren();
  for (const id of t.dependsOn) {
    const b = el(
      'button',
      'Условие: ' + plan.tasks.find((t) => t.id === id).title,
    );
    b.type = 'button';
    b.addEventListener('click', () => selectTask(id));
    $('deps').append(b);
  }
  $('questions').replaceChildren();
  t.questions.forEach((q, i) => {
    const l = el('label', q);
    const a = el('textarea');
    a.value = s.answers[i];
    a.maxLength = 4000;
    a.name = 'answer-' + i;
    l.append(a);
    $('questions').append(l);
  });
  $('criteria').replaceChildren(...t.acceptance.map((a) => el('li', a)));
  $('evidence').value = s.evidence;
  $('reason').value = s.reason;
  $('status').value = s.status;
  $('status').querySelector('[value=not_applicable]').disabled = !t.optional;
  $('reason-label').hidden = s.status !== 'not_applicable';
  for (const input of $('form').querySelectorAll(
    'input,textarea,select,button',
  ))
    input.disabled = !result.applicable;
  if (result.applicable)
    $('status').querySelector('[value=not_applicable]').disabled = !t.optional;
  $('forward').disabled = selected === plan.tasks.at(-1).id;
  renderGraph(report);
  showView(false);
  draftDirty = false;
}
function showView(graph) {
  const audit = graph === 'audit';
  graph = graph === true;
  $('audit-panel').hidden = !audit;
  $('graph-panel').hidden = !graph;
  $('editor').hidden = graph || audit;
  $('graph-tab').setAttribute('aria-pressed', String(graph));
  $('list-tab').setAttribute('aria-pressed', String(!graph && !audit));
  $('audit-tab').setAttribute('aria-pressed', String(audit));
  if (audit) renderAudit();
}
function auditMessage(text, error = false) {
  $('audit-message').textContent = text;
  $('audit-message').classList.toggle('error', error);
  $('audit-message').setAttribute('role', error ? 'alert' : 'status');
}
function renderAudit() {
  $('audit-empty').hidden = Boolean(auditReport);
  $('audit-results').hidden = !auditReport;
  $('audit-clear').hidden = !auditReport;
  $('audit-compare').hidden = !auditReport;
  $('audit-list').replaceChildren();
  if (!auditReport) return;
  $('audit-source').textContent =
    auditReport.version === 2
      ? `Дата отчёта (UTC): ${auditReport.generatedAt}. Прочитано файлов: ${auditReport.source.files}. ${auditReport.source.complete ? 'Отпечаток сформирован' : 'Часть файлов недоступна — совпадение подтвердить нельзя'}.`
      : 'Старый отчёт версии 1 без отпечатка. Создайте новый для сверки.';
  const comparisons = {
    matched:
      'Отпечатки проверенных входов совпадают с выбранным новым отчётом. Это не подпись, не ID клиента и не подтверждение работы сайта. Файлы вне проверки, D1, DNS и внешние изображения не сверялись.',
    changed:
      'Отпечатки отличаются: проверенные файлы, режим работы проверок или их код изменились, либо выбран отчёт другого проекта. Создайте свежий отчёт для нужного сайта и откройте его основным.',
    incomplete:
      'Сверка не подтверждена: в одном из отчётов часть файлов не прочитана. Устраните ошибки доступа и повторите аудит.',
    mode_mismatch:
      'Отчёты относятся к разным режимам Lite/Standard. Выберите отчёт того же режима.',
    legacy:
      'Для сверки нужны два отчёта версии 2 с отпечатками. Версия 1 доступна только для просмотра.',
    older:
      'Выбранный отчёт датирован раньше основного. Создайте новый аудит и проверьте часы компьютера.',
    inconsistent:
      'При одинаковом отпечатке результаты проверок различаются. Сверка не подтверждена: создайте отчёты заново из доверенной копии движка.',
  };
  $('audit-comparison').textContent = auditComparison
    ? comparisons[auditComparison]
    : 'Сверка ещё не выполнена. Создайте новый JSON через launch audit в каталоге нужного сайта и выберите «Сверить с новым отчётом». Сервер не проверяет текущие файлы автоматически.';
  $('audit-warning').textContent =
    (auditReport.mode !== state.mode
      ? 'Режим отчёта не совпадает с паспортом. '
      : '') +
    `Отчёт: ${auditReport.mode === 'lite' ? 'Lite' : 'Standard'}. Принадлежность этому сайту и актуальность не проверены. После изменений создайте новый отчёт. Это данные выбранного файла, а не разрешение на запуск.`;
  const names = {
    pass: 'Пройдено',
    warn: 'Предупреждения',
    fail: 'Ошибки',
    manual: 'Вручную',
  };
  $('audit-summary').textContent = ['fail', 'warn', 'manual', 'pass']
    .map((s) => `${names[s]}: ${auditReport.summary[s]}`)
    .join(' · ');
  const filter = $('audit-filter').value;
  const checks = auditReport.checks.filter(
    (c) =>
      filter === 'all' ||
      (filter === 'attention' ? c.status !== 'pass' : c.status === filter),
  );
  if (!checks.length)
    $('audit-list').append(
      el(
        'p',
        'Нет результатов для выбранного фильтра. Это не подтверждает готовность сайта.',
        'empty',
      ),
    );
  for (const check of checks) {
    const card = el('article', undefined, 'audit-card');
    card.dataset.status = check.status;
    card.append(
      el('span', names[check.status], 'audit-status'),
      el('h3', check.title),
      el('p', check.action),
    );
    const actions = el('div', undefined, 'actions');
    const task = plan.tasks.find((t) => t.id === check.taskId);
    const button = el('button', 'К шагу: ' + task.title);
    button.addEventListener('click', () => selectTask(task.id));
    actions.append(button);
    card.append(actions);
    $('audit-list').append(card);
  }
}
function renderGraph(report) {
  const ns = 'http://www.w3.org/2000/svg';
  const node = (tag, attrs = {}) => {
    const n = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
    return n;
  };
  const depth = new Map(),
    rows = [];
  for (const t of plan.tasks) {
    const d = t.dependsOn.length
      ? 1 + Math.max(...t.dependsOn.map((id) => depth.get(id)))
      : 0;
    depth.set(t.id, d);
    (rows[d] ??= []).push(t);
  }
  const width = Math.max(500, Math.max(...rows.map((r) => r.length)) * 245);
  const positions = new Map();
  rows.forEach((row, d) =>
    row.forEach((t, i) =>
      positions.set(t.id, {
        x: (width - row.length * 245) / 2 + i * 245 + 10,
        y: d * 135 + 15,
      }),
    ),
  );
  const svg = node('svg', {
    width,
    height: rows.length * 135 + 10,
    role: 'group',
    'aria-label': 'Граф: условия и шаги запуска',
  });
  const defs = node('defs'),
    marker = node('marker', {
      id: 'arrow',
      viewBox: '0 0 10 10',
      refX: 9,
      refY: 5,
      markerWidth: 6,
      markerHeight: 6,
      orient: 'auto-start-reverse',
    });
  marker.append(node('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: '#7e94ae' }));
  defs.append(marker);
  svg.append(defs);
  for (const t of plan.tasks) {
    const b = positions.get(t.id);
    for (const id of t.dependsOn) {
      const a = positions.get(id);
      svg.append(
        node('path', {
          d: `M ${a.x + 110} ${a.y + 92} C ${a.x + 110} ${a.y + 115}, ${b.x + 110} ${b.y - 20}, ${b.x + 110} ${b.y}`,
          fill: 'none',
          stroke: '#7e94ae',
          'stroke-width': 1.5,
          'marker-end': 'url(#arrow)',
        }),
      );
    }
  }
  for (const t of report.tasks) {
    const p = positions.get(t.id);
    const g = node('g', {
      class: 'node',
      role: 'button',
      tabindex: 0,
      'aria-label': t.title + ': ' + labels[t.status],
    });
    g.append(
      node('rect', {
        x: p.x,
        y: p.y,
        width: 225,
        height: 92,
        rx: 10,
        fill: t.complete ? '#203f3e' : '#233347',
        stroke: selected === t.id ? '#a6e3da' : '#58728f',
      }),
    );
    const text = node('text', { x: p.x + 12, y: p.y + 23 });
    let line = '';
    const lines = [];
    for (const word of t.title.split(' ')) {
      if ((line + ' ' + word).trim().length > 25) {
        lines.push(line);
        line = word;
      } else line = (line + ' ' + word).trim();
    }
    if (line) lines.push(line);
    lines.slice(0, 2).forEach((l, i) => {
      const span = node('tspan', { x: p.x + 12, dy: i ? 20 : 0 });
      span.textContent = l;
      text.append(span);
    });
    const st = node('text', { x: p.x + 12, y: p.y + 77, class: 'status-text' });
    st.textContent = labels[t.status];
    g.append(text, st);
    g.addEventListener('click', () => selectTask(t.id));
    g.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectTask(t.id);
      }
    });
    svg.append(g);
  }
  $('graph').replaceChildren(svg);
}
function download(text, name, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = el('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
function lock(value) {
  busy = value;
  document.querySelector('.layout').inert = value;
  for (const id of ['open', 'save', 'report', 'mode', 'site'])
    $(id).disabled = value;
}
$('form').addEventListener('input', () => {
  draftDirty = true;
  changed();
});
$('site').addEventListener('input', () => {
  draftDirty = true;
  changed();
});
$('status').addEventListener('change', () => {
  $('reason-label').hidden = $('status').value !== 'not_applicable';
});
$('mode').addEventListener('change', () => {
  if (!commit()) {
    $('mode').value = state.mode;
    return;
  }
  render();
  message('Изменён только режим паспорта. Сайт не переключён.');
});
$('form').addEventListener('submit', (e) => {
  e.preventDefault();
  if (commit()) {
    render();
    message(
      'Шаг применён к черновику. Для сохранения на компьютере нажмите «Сохранить JSON».',
    );
  }
});
$('forward').addEventListener('click', () => {
  const i = plan.tasks.findIndex((t) => t.id === selected);
  if (i + 1 < plan.tasks.length) selectTask(plan.tasks[i + 1].id);
});
$('next').addEventListener('click', () => {
  if (commit()) {
    const id = evaluatePassport(plan, state).next[0];
    if (id) selectTask(id);
  }
});
$('list-tab').addEventListener('click', () => showView(false));
$('audit-tab').addEventListener('click', () => {
  if (!busy) showView('audit');
});
$('audit-filter').addEventListener('change', renderAudit);
$('audit-open').addEventListener('click', () => {
  if (!busy) $('audit-file').click();
});
$('audit-clear').addEventListener('click', () => {
  if (busy) return;
  auditReport = null;
  auditComparison = null;
  renderAudit();
  auditMessage('Отчёт убран из вкладки. Файл на диске и паспорт не изменены.');
  $('audit-open').focus();
});
$('audit-file').addEventListener('change', async () => {
  const file = $('audit-file').files[0];
  $('audit-file').value = '';
  if (!file || busy) return;
  lock(true);
  try {
    if (file.size > AUDIT_REPORT_MAX_BYTES) throw new Error('REPORT_TOO_LARGE');
    const next = validateAuditReport(plan, JSON.parse(await file.text()));
    auditReport = next;
    auditComparison = null;
    $('audit-filter').value = 'attention';
    showView('audit');
    auditMessage('Отчёт открыт локально. Паспорт не изменён.');
  } catch {
    auditMessage(
      'Отчёт не принят: нужен JSON launch-source-audit версии 1 или 2 до 256 КиБ с корректными шагами и счётчиками. Предыдущий отчёт и черновик сохранены.',
      true,
    );
  } finally {
    lock(false);
  }
});
$('audit-compare').addEventListener('click', () => {
  if (!busy && auditReport) $('audit-compare-file').click();
});
$('audit-compare-file').addEventListener('change', async () => {
  const file = $('audit-compare-file').files[0];
  $('audit-compare-file').value = '';
  if (!file || busy || !auditReport) return;
  auditComparison = null;
  lock(true);
  try {
    if (file.size > AUDIT_REPORT_MAX_BYTES) throw new Error('REPORT_TOO_LARGE');
    const candidate = validateAuditReport(plan, JSON.parse(await file.text()));
    auditComparison = compareAuditReports(plan, auditReport, candidate);
    auditMessage(
      'Сверка выполнена только между выбранными файлами. Основной отчёт и паспорт не заменены.',
    );
  } catch {
    auditMessage(
      'Файл для сверки не принят. Предыдущее подтверждение сброшено; основной отчёт и черновик сохранены.',
      true,
    );
  } finally {
    renderAudit();
    lock(false);
  }
});
$('graph-tab').addEventListener('click', () => {
  if (commit()) {
    render();
    showView(true);
  }
});
$('open').addEventListener('click', () => {
  if (!busy) $('file').click();
});
$('file').addEventListener('change', async () => {
  const file = $('file').files[0];
  $('file').value = '';
  if (!file) return;
  if (
    (dirty || draftDirty) &&
    !confirm(
      'Заменить текущий черновик? Несохранённые изменения будут потеряны.',
    )
  )
    return;
  lock(true);
  try {
    if (file.size > PASSPORT_MAX_BYTES) throw new Error();
    const next = JSON.parse(await file.text());
    validatePassport(plan, next);
    state = next;
    auditReport = null;
    auditComparison = null;
    auditMessage('');
    renderAudit();
    selected = plan.tasks[0].id;
    dirty = false;
    draftDirty = false;
    render();
    $('save-status').textContent = 'Файл открыт · изменения ещё не вносились';
    message('Паспорт открыт локально. Файл на диске не изменён.');
  } catch {
    message(
      'Файл не принят: нужна поддерживаемая схема паспорта размером до 512 КБ. Текущий черновик сохранён.',
      true,
    );
  } finally {
    lock(false);
  }
});
$('save').addEventListener('click', async () => {
  if (busy || !commit()) return;
  let text;
  try {
    text = serializePassport(plan, state);
  } catch {
    message(
      'Паспорт больше 512 КБ. Сократите длинные ответы или доказательства перед сохранением. Черновик остаётся в этой вкладке.',
      true,
    );
    return;
  }
  const snapshot = text;
  lock(true);
  try {
    if (typeof window.showSaveFilePicker === 'function') {
      const handle = await window.showSaveFilePicker({
        suggestedName: 'launch-state.json',
        types: [
          {
            description: 'Паспорт запуска',
            accept: { 'application/json': ['.json'] },
          },
        ],
      });
      const writable = await handle.createWritable();
      try {
        await writable.write(text);
        await writable.close();
      } catch (e) {
        await writable.abort().catch(() => {});
        throw e;
      }
      if (JSON.stringify(state, null, 2) + '\n' === snapshot && !draftDirty) {
        dirty = false;
        $('save-status').textContent = 'JSON сохранён на компьютере';
      }
      message(
        'Файл сохранён. Храните его вне public/dist и публичного репозитория.',
      );
    } else {
      download(text, 'launch-state.json', 'application/json');
      message(
        'Скачивание JSON запрошено. Проверьте папку загрузок; браузер не подтверждает запись файла. Предупреждение при закрытии останется.',
      );
    }
  } catch (e) {
    message(
      e.name === 'AbortError'
        ? 'Сохранение отменено. Черновик остаётся в этой вкладке.'
        : 'Не удалось сохранить файл. Черновик остаётся в этой вкладке.',
      true,
    );
  } finally {
    lock(false);
  }
});
$('report').addEventListener('click', () => {
  if (!busy && commit()) {
    download(
      launchMarkdown(plan, state),
      'launch-checklist.md',
      'text/markdown',
    );
    message(
      'Скачивание чеклиста запрошено. Он не содержит ответов и не заменяет JSON-паспорт.',
    );
  }
});
window.addEventListener('beforeunload', (e) => {
  if (dirty || draftDirty) {
    e.preventDefault();
    // Legacy browsers still require returnValue to protect unsaved owner answers.
    // oxlint-disable-next-line typescript/no-deprecated
    e.returnValue = '';
  }
});
render();

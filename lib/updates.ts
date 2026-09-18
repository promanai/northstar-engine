import { env } from 'cloudflare:workers';
import { buildInfo } from '@/lib/build-info';
import { digest } from '@/lib/security-policy';
import { RequestFailure } from '@/lib/request-security';
import {
  automaticEligible,
  compareVersions,
  emptyUpdateState,
  githubRelease,
  repositoryName,
  type UpdateState,
  type UpdateRun,
} from '@/lib/update-policy';

export async function updateState() {
  const row = await env.DB.prepare(
    "SELECT revision,state FROM engine_updates WHERE id = 'engine'",
  ).first<{ revision: number; state: string }>();
  return {
    revision: row?.revision ?? 0,
    state: row ? (JSON.parse(row.state) as UpdateState) : emptyUpdateState(),
  };
}
async function persist(state: UpdateState, revision: number) {
  const result = await env.DB.prepare(
    "INSERT INTO engine_updates (id,revision,state) VALUES ('engine',1,?) ON CONFLICT(id) DO UPDATE SET state=excluded.state,revision=revision+1 WHERE revision=? RETURNING revision",
  )
    .bind(JSON.stringify(state), revision)
    .first<{ revision: number }>();
  if (!result)
    throw new RequestFailure('Настройки изменились. Обновите страницу', 409);
  return { state, revision: result.revision };
}
export function runnerConfigured() {
  return (
    !!env.UPDATE_RUNNER_SECRET &&
    env.UPDATE_RUNNER_SECRET.length >= 32 &&
    !!repositoryName(env.UPDATE_RUNNER_REPOSITORY)
  );
}
export async function updatesView() {
  return {
    ...(await updateState()),
    installed: buildInfo,
    runnerConfigured: runnerConfigured(),
    runnerRepository: repositoryName(env.UPDATE_RUNNER_REPOSITORY),
  };
}
export async function configureUpdates(body: Record<string, unknown>) {
  const current = await updateState();
  if (body.revision !== current.revision)
    throw new RequestFailure('Обновите настройки перед сохранением', 409);
  if (current.state.active)
    throw new RequestFailure(
      'Сначала завершите или отмените текущее обновление',
      409,
    );
  const repository = repositoryName(body.repository);
  if (!repository || typeof body.automatic !== 'boolean')
    throw new RequestFailure('Укажите GitHub-репозиторий owner/repo и режим');
  const changed = repository !== current.state.repository;
  if ((changed || body.automatic) && body.trustRepository !== repository)
    throw new RequestFailure('Подтвердите доверие к этому репозиторию', 400);
  if (!changed && body.automatic && !runnerConfigured())
    throw new RequestFailure(
      'Сначала настройте GitHub Actions и секрет исполнителя',
      409,
    );
  const state = {
    ...current.state,
    repository,
    automatic: changed ? false : body.automatic,
    candidate: changed ? null : current.state.candidate,
    checkedAt: changed ? null : current.state.checkedAt,
    error: null,
  };
  return persist(state, current.revision);
}
export async function checkUpdates() {
  const current = await updateState();
  if (!current.state.repository)
    throw new RequestFailure('Сначала выберите репозиторий');
  if (current.state.active)
    throw new RequestFailure('Обновление уже находится в работе', 409);
  try {
    const candidate = await githubRelease(
      current.state.repository,
      env.GITHUB_RELEASE_TOKEN,
    );
    return await persist(
      { ...current.state, candidate, checkedAt: Date.now(), error: null },
      current.revision,
    );
  } catch (error) {
    if (error instanceof RequestFailure) throw error;
    const message =
      error instanceof Error &&
      !['TypeError', 'TimeoutError', 'AbortError'].includes(error.name)
        ? error.message
        : 'Не удалось связаться с GitHub. Повторите позже';
    await persist(
      {
        ...current.state,
        candidate: null,
        checkedAt: Date.now(),
        error: message,
      },
      current.revision,
    );
    throw new RequestFailure(message, 502);
  }
}
function queued(state: UpdateState): UpdateRun {
  if (
    !state.candidate ||
    state.candidate.repository !== state.repository ||
    Date.now() - state.candidate.checkedAt > 900_000
  )
    throw new RequestFailure('Сначала повторно проверьте релиз');
  if (compareVersions(state.candidate.version, buildInfo.version) < 0)
    throw new RequestFailure(
      'Откат на старую версию через автообновление запрещён',
      409,
    );
  if (
    state.candidate.repository === buildInfo.repository &&
    state.candidate.sha === buildInfo.sha
  )
    throw new RequestFailure('Этот commit уже установлен', 409);
  return {
    ...state.candidate,
    id: crypto.randomUUID(),
    status: 'queued',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
export async function queueUpdate(body: Record<string, unknown>) {
  const current = await updateState();
  if (!runnerConfigured())
    throw new RequestFailure('GitHub Actions ещё не настроен', 409);
  if (
    body.revision !== current.revision ||
    body.sha !== current.state.candidate?.sha
  )
    throw new RequestFailure('Релиз изменился. Обновите страницу', 409);
  if (body.trustRepository !== current.state.repository)
    throw new RequestFailure(
      'Подтвердите установку кода выбранного репозитория',
    );
  if (current.state.active)
    throw new RequestFailure('Обновление уже поставлено в очередь', 409);
  return persist(
    { ...current.state, active: queued(current.state), error: null },
    current.revision,
  );
}
export async function cancelUpdate(body: Record<string, unknown>) {
  const current = await updateState();
  if (
    body.revision !== current.revision ||
    !current.state.active ||
    current.state.active.status !== 'queued'
  )
    throw new RequestFailure('Можно отменить только ожидающее задание', 409);
  return persist(
    {
      ...current.state,
      active: null,
      history: [
        {
          ...current.state.active,
          status: 'cancelled' as const,
          updatedAt: Date.now(),
        },
        ...current.state.history,
      ].slice(0, 20),
    },
    current.revision,
  );
}
export async function runnerAuth(request: Request) {
  const supplied = request.headers.get('authorization') ?? '';
  if (
    !runnerConfigured() ||
    (await digest(supplied)) !==
      (await digest(`Bearer ${env.UPDATE_RUNNER_SECRET}`))
  )
    throw new RequestFailure('Unauthorized runner', 401);
}
export async function claimUpdate(githubRunId: unknown) {
  if (typeof githubRunId !== 'string' || !/^\d{1,24}$/.test(githubRunId))
    throw new RequestFailure('Invalid workflow run ID');
  let current = await updateState();
  if (current.state.active?.status === 'running') {
    if (Date.now() - current.state.active.updatedAt < 2 * 3600_000)
      return { run: null };
    current = await persist(
      {
        ...current.state,
        active: null,
        history: [
          {
            ...current.state.active,
            status: 'failed' as const,
            reason:
              'Исполнитель не отчитался за 2 часа. Проверьте GitHub Actions и состояние Worker',
            updatedAt: Date.now(),
          },
          ...current.state.history,
        ].slice(0, 20),
      },
      current.revision,
    );
  }
  if (!current.state.active && current.state.automatic) {
    current = await checkUpdates();
    if (
      current.state.candidate &&
      automaticEligible(
        current.state.candidate,
        buildInfo,
        current.state.history,
      )
    )
      current = await persist(
        { ...current.state, active: queued(current.state) },
        current.revision,
      );
  }
  if (!current.state.active) {
    await persist(
      { ...current.state, runnerSeenAt: Date.now() },
      current.revision,
    );
    return { run: null };
  }
  const run: UpdateRun = {
    ...current.state.active,
    status: 'running',
    githubRunId,
    updatedAt: Date.now(),
  };
  await persist(
    { ...current.state, active: run, runnerSeenAt: Date.now() },
    current.revision,
  );
  return { run, installedMigrations: buildInfo.migrations };
}
export async function runnerAction(body: Record<string, unknown>) {
  if (body.action === 'claim') return claimUpdate(body.githubRunId);
  const current = await updateState();
  const run = current.state.active;
  if (
    body.action === 'complete' &&
    current.state.history.some(
      (item) =>
        item.id === body.runId &&
        item.githubRunId === body.githubRunId &&
        item.status === body.status &&
        ['succeeded', 'failed'].includes(item.status),
    )
  )
    return { ok: true };
  if (
    !run ||
    run.status !== 'running' ||
    run.id !== body.runId ||
    run.githubRunId !== body.githubRunId
  )
    throw new RequestFailure('Update run no longer active', 409);
  if (body.action === 'authorize')
    return { run, installedMigrations: buildInfo.migrations };
  if (
    body.action !== 'complete' ||
    typeof body.status !== 'string' ||
    !['succeeded', 'failed'].includes(body.status)
  )
    throw new RequestFailure('Invalid runner action');
  if (
    body.status === 'succeeded' &&
    (buildInfo.sha !== run.sha ||
      buildInfo.repository !== run.repository ||
      buildInfo.version !== run.version)
  )
    throw new RequestFailure(
      'Deployed Worker has not confirmed target build',
      409,
    );
  const finished: UpdateRun = {
    ...run,
    status: body.status as 'succeeded' | 'failed',
    updatedAt: Date.now(),
    ...(body.status === 'failed'
      ? {
          reason:
            'Сборка, миграция или проверка деплоя не прошла. Подробности — в GitHub Actions',
        }
      : {}),
  };
  await persist(
    {
      ...current.state,
      active: null,
      history: [finished, ...current.state.history].slice(0, 20),
    },
    current.revision,
  );
  return { ok: true };
}

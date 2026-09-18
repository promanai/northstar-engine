import { getSessionUser } from '@/lib/auth';
import {
  isProvider,
  isTask,
  validateConfig,
  validateProfile,
} from '@/lib/ai-policy';
import { readAiSettings, saveAiSettings, providerKey } from '@/lib/ai-settings';
import { AiFailure, listProviderModels } from '@/lib/ai-provider';
import { generateBudgetedResponse, readAiBudget } from '@/lib/ai-budget';
import {
  failureResponse,
  limitRequest,
  readJson,
  RequestFailure,
} from '@/lib/request-security';

async function requireAdmin(request: Request) {
  const user = await getSessionUser(request);
  if (!user || (user.role !== 'owner' && user.role !== 'admin'))
    throw new RequestFailure('Требуется сессия администратора', 403);
  return user;
}
function failure(error: unknown) {
  if (error instanceof AiFailure)
    return Response.json(
      { error: error.message, code: error.code },
      { status: 502, headers: { 'cache-control': 'no-store' } },
    );
  return failureResponse(error);
}
export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    return Response.json(
      { ...(await readAiSettings()), budget: await readAiBudget() },
      {
        headers: { 'cache-control': 'no-store' },
      },
    );
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: Request) {
  try {
    const body = await readJson(request, 24000);
    const user = await requireAdmin(request);
    await limitRequest(request, 'ai-admin', 20, 60, user.id);
    if (body.action === 'save') {
      let config;
      try {
        config = validateConfig(body.config);
      } catch (error) {
        throw new RequestFailure((error as Error).message);
      }
      const budget = await readAiBudget();
      await saveAiSettings(config, body.revision);
      return Response.json(
        { ...(await readAiSettings()), budget },
        {
          headers: { 'cache-control': 'no-store' },
        },
      );
    }
    if (body.action === 'models') {
      if (!isProvider(body.provider))
        throw new RequestFailure('Неизвестный провайдер');
      const models = await listProviderModels(
        body.provider,
        providerKey(body.provider),
      );
      return Response.json(
        { provider: body.provider, models },
        { headers: { 'cache-control': 'no-store' } },
      );
    }
    if (body.action === 'test' || body.action === 'generate') {
      if (body.confirmPaid !== true)
        throw new RequestFailure(
          'Подтвердите платный запрос: confirmPaid=true',
        );
      await limitRequest(request, 'ai-admin-generate', 5, 60, user.id);
      let profile;
      let prompt = 'Ответь одним коротким предложением: подключение работает.';
      if (body.action === 'test') {
        try {
          profile = validateProfile(body.profile);
        } catch (error) {
          throw new RequestFailure((error as Error).message);
        }
      } else {
        if (!isTask(body.task) || body.task !== 'text')
          throw new RequestFailure(
            'Для генерации используйте задачу text; консультант доступен через /api/chat',
          );
        profile = (await readAiSettings()).config.text;
        if (!profile.enabled)
          throw new RequestFailure('Генерация текстов отключена');
        if (
          typeof body.prompt !== 'string' ||
          !body.prompt.trim() ||
          body.prompt.length > 8000
        )
          throw new RequestFailure(
            'Запрос должен содержать от 1 до 8000 символов',
          );
        prompt = body.prompt.trim();
      }
      const result = await generateBudgetedResponse(
        profile,
        providerKey(profile.provider),
        [{ role: 'user', content: prompt }],
      );
      return Response.json(result, {
        headers: { 'cache-control': 'no-store' },
      });
    }
    throw new RequestFailure('Неизвестное действие');
  } catch (error) {
    return failure(error);
  }
}

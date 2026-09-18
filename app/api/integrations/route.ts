import { getRequestUser } from '@/lib/auth';
import {
  changeIntegrations,
  readIntegrations,
  testIntegration,
} from '@/lib/integrations-service';
import {
  failureResponse,
  limitRequest,
  readJson,
  RequestFailure,
} from '@/lib/request-security';
import { discardBody } from '@/lib/security-policy';

export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request);
    return Response.json(
      { integrations: await readIntegrations(user) },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch (error) {
    return failureResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getRequestUser(request);
    await limitRequest(request, 'integrations-write', 30, 60, user?.id);
    const body = await readJson(request, 100000);
    return Response.json(
      { integrations: await changeIntegrations(user, body, 'rest') },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch (error) {
    await discardBody(request);
    return failureResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request);
    await limitRequest(request, 'integrations-test', 10, 60, user?.id);
    const body = await readJson(request, 10000);
    if (body.action === 'test') {
      if (body.type !== 'telegram' && body.type !== 'webhook') {
        throw new RequestFailure('Укажите type: "telegram" или "webhook"');
      }
      const result = await testIntegration(user, body.type);
      return Response.json(result, {
        headers: { 'cache-control': 'no-store' },
      });
    }
    throw new RequestFailure('Неизвестное действие');
  } catch (error) {
    await discardBody(request);
    return failureResponse(error);
  }
}

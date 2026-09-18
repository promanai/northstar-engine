import { getRequestUser } from '@/lib/auth';
import { readCustomer } from '@/lib/customer-service';
import { requestPasswordReset } from '@/lib/password-reset';
import {
  failureResponse,
  limitRequest,
} from '@/lib/request-security';
type Context = { params: Promise<{ id: string }> };
export async function POST(request: Request, context: Context) {
  try {
    const user = await getRequestUser(request);
    await limitRequest(request, 'customers-write', 30, 60, user?.id);
    const customer = await readCustomer(user, (await context.params).id);
    const result = await requestPasswordReset(customer.email, request);
    return Response.json(
      {
        ok: true,
        resetToken: result.resetToken ?? null,
        message:
          'Ссылка для установки пароля создана. Передайте токен клиенту.',
      },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch (error) {
    return failureResponse(error);
  }
}

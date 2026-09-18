import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { products, orders, bookingSlots } from '@/db/schema';
import { getRequestUser } from '@/lib/auth';
import { isOwner } from '@/lib/commerce-policy';
import { productInput } from '@/lib/product-input';
import { discardBody } from '@/lib/security-policy';
import {
  failureResponse,
  readJson,
  RequestFailure,
} from '@/lib/request-security';
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  try {
    const row = await getDb()
      .select()
      .from(products)
      .where(eq(products.id, (await context.params).id))
      .get();
    const admin = isOwner(await getRequestUser(request));
    if (!row || (!row.active && !admin))
      throw new RequestFailure('Товар не найден', 404);
    const { aiInstructions: _instructions, ...safe } = row;
    return Response.json(
      { product: admin ? row : safe },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch (error) {
    return failureResponse(error);
  }
}
export async function PATCH(request: Request, context: Context) {
  try {
    const raw = await readJson(request);
    if (!isOwner(await getRequestUser(request)))
      throw new RequestFailure('Требуется роль администратора', 403);
    const id = (await context.params).id;
    const body = productInput(raw, false);
    try {
      await getDb()
        .update(products)
        .set({ ...body, updatedAt: new Date() })
        .where(eq(products.id, id));
    } catch (error) {
      if (String(error).includes('UNIQUE'))
        throw new RequestFailure('Такой адрес карточки уже используется', 409);
      throw error;
    }
    const product = await getDb()
      .select()
      .from(products)
      .where(eq(products.id, id))
      .get();
    if (!product) throw new RequestFailure('Товар не найден', 404);
    return Response.json(
      { product },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch (error) {
    return failureResponse(error);
  }
}
export async function DELETE(request: Request, context: Context) {
  try {
    await discardBody(request);
    if (!isOwner(await getRequestUser(request)))
      throw new RequestFailure('Требуется роль администратора', 403);
    const id = (await context.params).id;
    if (
      await getDb()
        .select({ id: orders.id })
        .from(orders)
        .where(eq(orders.productId, id))
        .limit(1)
        .get()
    )
      throw new RequestFailure(
        'У предложения есть заказы. Используйте «Скрыть» вместо удаления',
        409,
      );
    if (
      await getDb()
        .select({ id: bookingSlots.id })
        .from(bookingSlots)
        .where(eq(bookingSlots.productId, id))
        .limit(1)
        .get()
    )
      throw new RequestFailure(
        'Услуга используется в расписании. Используйте «Скрыть» вместо удаления',
        409,
      );
    const deleted = await getDb()
      .delete(products)
      .where(eq(products.id, id))
      .returning({ id: products.id });
    if (!deleted.length) throw new RequestFailure('Товар не найден', 404);
    return Response.json({ ok: true });
  } catch (error) {
    return failureResponse(error);
  }
}

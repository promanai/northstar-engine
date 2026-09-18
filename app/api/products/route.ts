import { desc, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { products } from '@/db/schema';
import { getRequestUser } from '@/lib/auth';
import { isOwner } from '@/lib/commerce-policy';
import { productInput } from '@/lib/product-input';
import {
  failureResponse,
  readJson,
  RequestFailure,
} from '@/lib/request-security';
function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9а-яё]+/gi, '-')
      .replace(/^-+|-+$/g, '') || crypto.randomUUID()
  );
}
function publicProduct(product: typeof products.$inferSelect) {
  const { aiInstructions: _instructions, ...safe } = product;
  return safe;
}
export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request);
    const all =
      isOwner(user) && new URL(request.url).searchParams.get('public') !== '1';
    const rows = await getDb()
      .select()
      .from(products)
      .where(all ? undefined : eq(products.active, true))
      .orderBy(desc(products.createdAt))
      .limit(200);
    return Response.json(
      { products: all ? rows : rows.map(publicProduct) },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch (error) {
    return failureResponse(error);
  }
}
export async function POST(request: Request) {
  try {
    const raw = await readJson(request);
    if (!isOwner(await getRequestUser(request)))
      throw new RequestFailure('Требуется роль администратора', 403);
    const body = productInput(raw, true);
    const now = new Date();
    const product = {
      ...body,
      id: crypto.randomUUID(),
      title: body.title!,
      shortDescription: body.shortDescription!,
      slug: body.slug || slugify(body.title!),
      createdAt: now,
      updatedAt: now,
    };
    try {
      await getDb().insert(products).values(product);
    } catch (error) {
      if (String(error).includes('UNIQUE'))
        throw new RequestFailure('Такой адрес карточки уже используется', 409);
      throw error;
    }
    return Response.json(
      {
        product: await getDb()
          .select()
          .from(products)
          .where(eq(products.id, product.id))
          .get(),
      },
      { status: 201, headers: { 'cache-control': 'no-store' } },
    );
  } catch (error) {
    return failureResponse(error);
  }
}

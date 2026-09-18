import { RequestFailure } from '@/lib/request-security';
import { textValue } from '@/lib/security-policy';
import type { products } from '@/db/schema';
export function productInput(body: Record<string, unknown>, creating: boolean) {
  const result: Partial<typeof products.$inferInsert> = {};
  for (const [key, max] of Object.entries({
    title: 180,
    slug: 180,
    shortDescription: 500,
    description: 20000,
    aiInstructions: 12000,
  })) {
    if (body[key] !== undefined) {
      if (
        !textValue(
          body[key],
          max,
          ['title', 'slug', 'shortDescription'].includes(key),
        )
      )
        throw new RequestFailure(`Некорректное поле ${key}`);
      Object.assign(result, { [key]: body[key].trim() });
    }
  }
  if (creating && (!result.title || !result.shortDescription))
    throw new RequestFailure('Укажите название и краткое описание');
  if (result.slug && !/^[a-z0-9а-яё][a-z0-9а-яё_-]*$/i.test(result.slug))
    throw new RequestFailure(
      'Slug может содержать буквы, цифры, дефис и подчёркивание',
    );
  if (body.price !== undefined) {
    if (
      typeof body.price !== 'number' ||
      !Number.isSafeInteger(body.price) ||
      body.price < 0 ||
      body.price > 1_000_000_000
    )
      throw new RequestFailure(
        'Цена должна быть целым числом сотых долей валюты, от 0 до 1 000 000 000',
      );
    result.price = body.price;
  }
  if (body.currency !== undefined) {
    if (!textValue(body.currency, 3, true) || !/^[A-Z]{3}$/.test(body.currency))
      throw new RequestFailure('Валюта: три заглавные латинские буквы');
    result.currency = body.currency;
  }
  if (body.kind !== undefined) {
    if (
      typeof body.kind !== 'string' ||
      !['product', 'service'].includes(body.kind)
    )
      throw new RequestFailure('Некорректный тип');
    result.kind = body.kind as string;
  }
  if (body.active !== undefined) {
    if (typeof body.active !== 'boolean')
      throw new RequestFailure('Некорректный статус публикации');
    result.active = body.active;
  }
  if (body.imageUrl !== undefined) {
    if (body.imageUrl !== null && !textValue(body.imageUrl, 2048))
      throw new RequestFailure('Некорректный адрес изображения');
    result.imageUrl = body.imageUrl as string | null;
  }
  for (const key of ['seo', 'metadata'] as const)
    if (body[key] !== undefined) {
      if (
        !body[key] ||
        typeof body[key] !== 'object' ||
        Array.isArray(body[key])
      )
        throw new RequestFailure(`Некорректное поле ${key}`);
      Object.assign(result, { [key]: body[key] });
    }
  if (
    body.id !== undefined ||
    body.createdAt !== undefined ||
    body.updatedAt !== undefined
  )
    throw new RequestFailure('Служебные поля нельзя изменять');
  return result;
}

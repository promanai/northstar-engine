import { documentStore } from '@/lib/document-store';
import { isAdministrator, type ContentActor } from '@/lib/access-policy';
import { RequestFailure } from '@/lib/request-security';
import { expectedRevision } from '@/lib/admin-policy';

function checked<T>(run: () => T): T {
  try {
    return run();
  } catch (error) {
    if (error instanceof RequestFailure) throw error;
    throw new RequestFailure(
      error instanceof Error ? error.message : 'Некорректный запрос',
    );
  }
}

export type KnowledgeCategory = 'faq' | 'about' | 'prep' | 'general';

export type KnowledgeItem = {
  id: string;
  title: string;
  category: KnowledgeCategory;
  content: string;
  active: boolean;
  updatedAt: string;
};

export type KnowledgeConfig = {
  items: KnowledgeItem[];
};

export const defaultKnowledge: KnowledgeConfig = {
  items: [
    {
      id: 'clinic-hours',
      title: 'Часы работы и адрес клиники',
      category: 'about',
      content:
        'Клиника OraVera открыта ежедневно с 09:00 до 21:00 по адресу: г. Москва, ул. Медицинская, д. 10. Приём ведётся по предварительной записи. Есть бесплатная гостевая парковка.',
      active: true,
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'prep-consultation',
      title: 'Подготовка к первичной консультации',
      category: 'prep',
      content:
        'Перед первичным приёмом врача-косметолога рекомендуется не наносить плотный макияж и средства с активными кислотами за 24 часа. При наличии свежих результатов анализов (ОАК, биохимия, гормоны) возьмите их с собой.',
      active: true,
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'faq-cancel',
      title: 'Перенос и отмена записи',
      category: 'faq',
      content:
        'Отменить или перенести запись на приём можно без комиссии не позднее чем за 12 часов до назначенного времени через личный кабинет на сайте либо обратившись к администратору в чате.',
      active: true,
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'faq-payment',
      title: 'Способы оплаты и рассрочка',
      category: 'faq',
      content:
        'Мы принимаем оплату банковскими картами (МИР, Visa, Mastercard), через Систему быстрых платежей (СБП), а также наличными в кассе клиники. На комплексные курсы процедур действует беспроцентная рассрочка.',
      active: true,
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'general-safety',
      title: 'Стандарты стерилизации и безопасности',
      category: 'general',
      content:
        'Все процедуры выполняются сертифицированными врачами-дерматовенерологами и косметологами. Мы используем только оригинальные одноразовые расходные материалы и препараты с обязательной государственной регистрацией.',
      active: true,
      updatedAt: new Date().toISOString(),
    },
  ],
};

function requireKnowledgeAdmin(actor: ContentActor | null, write = false) {
  if (
    !actor ||
    !isAdministrator(actor.role) ||
    (actor.tokenId &&
      !actor.scopes?.includes('*') &&
      !actor.scopes?.includes(`knowledge:${write ? 'write' : 'read'}`) &&
      !actor.scopes?.includes(`assistant:${write ? 'write' : 'read'}`))
  )
    throw new RequestFailure('Недостаточно прав', 403);
  return actor;
}

function store() {
  return documentStore<KnowledgeConfig>('knowledge-base', defaultKnowledge);
}

export async function runtimeKnowledge(): Promise<KnowledgeConfig> {
  return (await store().read()).value;
}

export async function readKnowledge(actor: ContentActor | null) {
  requireKnowledgeAdmin(actor);
  const state = await store().read();
  return { ...state.value, revision: state.revision };
}

export async function knowledgeHistory(
  actor: ContentActor | null,
  before?: number,
) {
  requireKnowledgeAdmin(actor);
  if (before !== undefined) checked(() => expectedRevision(before));
  return store().history(before);
}

export function validateKnowledgeItem(raw: unknown): KnowledgeItem {
  if (!raw || typeof raw !== 'object')
    throw new RequestFailure('Некорректная статья базы знаний');
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === 'string' && r.id.trim() ? r.id.trim().slice(0, 64) : crypto.randomUUID();
  if (typeof r.title !== 'string' || !r.title.trim() || r.title.length > 200)
    throw new RequestFailure('Укажите заголовок статьи (до 200 символов)');
  const validCategories: KnowledgeCategory[] = ['faq', 'about', 'prep', 'general'];
  const category = validCategories.includes(r.category as KnowledgeCategory)
    ? (r.category as KnowledgeCategory)
    : 'general';
  if (typeof r.content !== 'string' || !r.content.trim() || r.content.length > 10000)
    throw new RequestFailure('Укажите текст статьи (до 10 000 символов)');
  return {
    id,
    title: r.title.trim(),
    category,
    content: r.content.trim(),
    active: r.active !== false,
    updatedAt: new Date().toISOString(),
  };
}

export async function changeKnowledge(
  actor: ContentActor | null,
  body: Record<string, unknown>,
  source: 'rest' | 'mcp',
) {
  const user = requireKnowledgeAdmin(actor, true);
  const restore = Object.hasOwn(body, 'targetRevision');

  if (body.confirm !== true)
    throw new RequestFailure(
      'Изменения базы знаний влияют на ответы AI-консультанта. Требуется confirm: true',
    );

  const expected = checked(() => expectedRevision(body.revision));
  const documents = store();
  const current = await documents.read();

  const conflict = () =>
    new RequestFailure(
      'База знаний уже изменена другим процессом. Загрузите актуальную версию перед повтором.',
      409,
    );

  if (current.revision !== expected) throw conflict();

  const target = restore
    ? checked(() => expectedRevision(body.targetRevision))
    : null;

  let value: KnowledgeConfig;
  if (target !== null) {
    const old = await documents.version(target);
    if (!old) throw new RequestFailure('Версия не найдена', 404);
    value = old;
  } else {
    if (!Array.isArray(body.items))
      throw new RequestFailure('Ожидается список статей (items)');
    if (body.items.length > 100)
      throw new RequestFailure('Максимальное количество статей: 100');
    value = {
      items: body.items.map(validateKnowledgeItem),
    };
  }

  const saved = await documents.save(
    current,
    value,
    user.id,
    user.tokenId ?? null,
    source,
    target,
  );

  if (!saved) throw conflict();

  return { ...value, revision: current.revision + 1 };
}

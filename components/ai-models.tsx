'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  defaultProfile,
  modelCapabilities,
  providerNames,
  suggestedModels,
  taskNames,
  validateConfig,
  type AiConfig,
  type AiProfile,
  type AiProvider,
  type AiTask,
  type AiView,
} from '@/lib/ai-policy';

const field =
  'w-full min-w-0 min-h-11 rounded-xl border-site-line bg-site-raised text-base text-site-ink';
const effortNames: Record<string, string> = {
  auto: 'По умолчанию у модели',
  none: 'Без рассуждения',
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
  xhigh: 'Очень высокий',
  max: 'Максимальный',
};
function Choice({
  id,
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  id: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="min-w-0 space-y-2">
      <label id={`${id}-label`} htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <Select
        value={value}
        onValueChange={(value) => {
          if (value !== null) onChange(value);
        }}
        disabled={disabled}
        items={options}
      >
        <SelectTrigger
          id={id}
          aria-labelledby={`${id}-label`}
          className={field}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-w-[calc(100vw-2rem)] border-site-line bg-site-surface text-site-ink">
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
type Generated = { text: string; usage: { outputTokens: number | null } };
async function request<T = Generated>(body?: unknown): Promise<T> {
  const response = await fetch(
    '/api/ai',
    body === undefined
      ? { cache: 'no-store' }
      : {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        },
  );
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok)
    throw new Error(data.error || 'Не удалось выполнить запрос');
  return data;
}
export function AiModels() {
  const [view, setView] = useState<AiView | null>(null);
  const [config, setConfig] = useState<AiConfig | null>(null);
  const [models, setModels] = useState<Record<AiProvider, string[]>>({
    openai: [],
    xai: [],
  });
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [output, setOutput] = useState('');
  const [prompt, setPrompt] = useState('');
  const dirty =
    view && config && JSON.stringify(view.config) !== JSON.stringify(config);
  async function run(name: string, work: () => Promise<void>) {
    setBusy(name);
    setError('');
    setNotice('');
    try {
      await work();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка соединения');
    } finally {
      setBusy('');
    }
  }
  async function load() {
    await run('load', async () => {
      const data = await request<AiView>();
      setView(data);
      setConfig(data.config);
    });
  }
  useEffect(() => {
    void Promise.resolve().then(load);
  }, []);
  function change(task: AiTask, patch: Partial<AiProfile>) {
    setNotice('');
    setOutput('');
    setConfig((current) =>
      current
        ? { ...current, [task]: { ...current[task], ...patch } }
        : current,
    );
  }
  function chooseModel(task: AiTask, model: string) {
    change(task, { model, reasoning: 'auto', temperature: null });
  }
  return (
    <div className="mt-6 min-w-0 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">AI-провайдеры и модели</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-site-muted">
            Настройки применяются к новым запросам. Контекст консультанта
            редактируется в разделе «Ассистент».
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={!!busy}
          onClick={() => void load()}
          className="min-h-11 border-site-line bg-site-surface text-site-ink"
        >
          Перезагрузить настройки{dirty ? ' (сбросить правки)' : ''}
        </Button>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-500/40 p-4 text-sm text-red-500"
        >
          {error}
        </p>
      )}
      <output aria-live="polite" className="block text-sm text-site-muted">
        {busy
          ? busy === 'test' || busy === 'generate'
            ? 'Ожидаем ответ провайдера…'
            : 'Выполняется…'
          : notice || (dirty ? 'Есть несохранённые изменения' : '')}
      </output>
      {view && config ? (
        <>
          {view.budget && (
            <section
              aria-label="Общая квота AI"
              className="min-w-0 rounded-2xl border border-site-line bg-site-surface p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-semibold">Общая квота AI</h3>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!!busy}
                  className="min-h-11 border-site-line bg-site-raised text-site-ink"
                  onClick={() =>
                    void run('budget', async () => {
                      const latest = await request<AiView>();
                      setView((current) =>
                        current
                          ? { ...current, budget: latest.budget }
                          : current,
                      );
                      setNotice(
                        'Счётчики обновлены, правки настроек сохранены в форме',
                      );
                    })
                  }
                >
                  Обновить счётчики
                </Button>
              </div>
              <p className="mt-3 text-sm text-site-muted">
                {view.budget.enabled
                  ? 'Чат, генерация и проверка модели используют одну квоту'
                  : 'Новые платные запросы отключены на сервере'}
              </p>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm text-site-muted">Сегодня · UTC</dt>
                  <dd className="mt-1 text-lg font-semibold">
                    {view.budget.daily.used} / {view.budget.dailyRequests}
                  </dd>
                  <dd className="mt-1 text-sm text-site-muted">
                    Осталось {view.budget.daily.remaining}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-site-muted">Этот месяц · UTC</dt>
                  <dd className="mt-1 text-lg font-semibold">
                    {view.budget.monthly.used} / {view.budget.monthlyRequests}
                  </dd>
                  <dd className="mt-1 text-sm text-site-muted">
                    Осталось {view.budget.monthly.remaining}
                  </dd>
                </div>
              </dl>
              <p className="mt-4 text-sm leading-relaxed text-site-muted">
                Считаются попытки, включая ошибки провайдера. Это не сумма
                расходов и не лимит в валюте. Контекст — до{' '}
                {view.budget.maxInputBytes.toLocaleString('ru-RU')} байт, ответ
                — до {view.budget.maxOutputTokens.toLocaleString('ru-RU')}{' '}
                токенов. Потолки задаёт владелец в переменных Worker:
                AI_DAILY_REQUEST_LIMIT, AI_MONTHLY_REQUEST_LIMIT,
                AI_MAX_INPUT_BYTES, AI_MAX_OUTPUT_TOKENS.
                AI_PAID_REQUESTS_ENABLED=false запрещает новые платные запросы
                после применения настройки.
              </p>
            </section>
          )}
          <section
            aria-label="Подключения"
            className="grid min-w-0 gap-3 md:grid-cols-2"
          >
            {(['openai', 'xai'] as const).map((provider) => (
              <div
                key={provider}
                className="min-w-0 rounded-2xl border border-site-line bg-site-surface p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold">{providerNames[provider]}</h3>
                  <span className="text-sm text-site-muted">
                    {view.credentials[provider]
                      ? 'Ключ задан · доступ ещё не проверен'
                      : 'Ключ не задан'}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-site-muted">
                  Добавьте{' '}
                  <code>
                    {provider === 'openai' ? 'OPENAI_API_KEY' : 'XAI_API_KEY'}
                  </code>{' '}
                  в Cloudflare → Worker → Settings → Variables and Secrets. Для
                  локального запуска — в .env, затем перезапустите сервис. Ключ
                  не передаётся в браузер и не хранится в базе сайта.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-4 min-h-11 w-full whitespace-normal border-site-line bg-site-raised text-site-ink"
                  disabled={!!busy || !view.credentials[provider]}
                  onClick={() =>
                    void run('models', async () => {
                      const result = await request<{ models: string[] }>({
                        action: 'models',
                        provider,
                      });
                      setModels((previous) => ({
                        ...previous,
                        [provider]: result.models,
                      }));
                      setNotice(
                        `${providerNames[provider]}: список получен, моделей ${result.models.length}. Доступ к конкретной модели проверяется тестовым ответом.`,
                      );
                    })
                  }
                >
                  Проверить ключ и загрузить модели
                </Button>
              </div>
            ))}
          </section>
          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              void run('save', async () => {
                validateConfig(config);
                const data = (await request<AiView>({
                  action: 'save',
                  config,
                  revision: view.revision,
                })) as AiView;
                setView(data);
                setConfig(data.config);
                setNotice('Настройки сохранены');
              });
            }}
          >
            <fieldset disabled={!!busy} className="min-w-0 space-y-5">
              {(['chat', 'text'] as const).map((task) => {
                const profile = config[task];
                const caps = modelCapabilities(profile.provider, profile.model);
                const choices = [
                  ...new Set([
                    profile.model,
                    ...models[profile.provider],
                    ...suggestedModels[profile.provider],
                  ]),
                ].filter(Boolean);
                return (
                  <section
                    key={task}
                    aria-labelledby={`${task}-heading`}
                    className="min-w-0 rounded-2xl border border-site-line bg-site-surface p-4 sm:p-6"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <h3
                          id={`${task}-heading`}
                          className="text-lg font-semibold"
                        >
                          {taskNames[task]}
                        </h3>
                        <p className="mt-1 text-sm text-site-muted">
                          {task === 'chat'
                            ? 'Чат сайта, история диалога и каталог'
                            : 'Тексты страниц, описания услуг и другие текстовые задачи'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <label htmlFor={`${task}-enabled`} className="text-sm">
                          Включено
                        </label>
                        <Switch
                          id={`${task}-enabled`}
                          checked={profile.enabled}
                          onCheckedChange={(enabled) =>
                            change(task, { enabled })
                          }
                        />
                      </div>
                    </div>
                    <div className="mt-5 grid min-w-0 gap-4 sm:grid-cols-2">
                      <Choice
                        id={`${task}-provider`}
                        label="Провайдер"
                        value={profile.provider}
                        options={Object.entries(providerNames).map(
                          ([value, label]) => ({ value, label }),
                        )}
                        onChange={(value) => {
                          const next = defaultProfile(value as AiProvider);
                          change(task, {
                            provider: next.provider,
                            model: next.model,
                            reasoning: 'auto',
                            temperature: null,
                          });
                        }}
                      />
                      <Choice
                        id={`${task}-model-choice`}
                        label="Модель из списка"
                        value={profile.model}
                        options={choices.map((value) => ({
                          value,
                          label: value,
                        }))}
                        onChange={(value) => chooseModel(task, value)}
                      />
                      <div className="min-w-0 space-y-2">
                        <label
                          htmlFor={`${task}-model`}
                          className="text-sm font-medium"
                        >
                          ID модели вручную
                        </label>
                        <Input
                          id={`${task}-model`}
                          value={profile.model}
                          maxLength={128}
                          required
                          className={field}
                          onChange={(event) =>
                            chooseModel(task, event.target.value)
                          }
                          spellCheck={false}
                          autoComplete="off"
                        />
                      </div>
                      <Choice
                        id={`${task}-effort`}
                        label="Уровень рассуждения"
                        value={profile.reasoning}
                        options={caps.efforts.map((value) => ({
                          value,
                          label: effortNames[value] || value,
                        }))}
                        onChange={(reasoning) => change(task, { reasoning })}
                        disabled={caps.efforts.length === 1}
                      />
                      <div className="space-y-2">
                        <label
                          htmlFor={`${task}-tokens`}
                          className="text-sm font-medium"
                        >
                          Лимит выходных токенов
                        </label>
                        <Input
                          id={`${task}-tokens`}
                          type="number"
                          min={128}
                          max={32768}
                          step={1}
                          required
                          value={profile.maxOutputTokens}
                          className={field}
                          onChange={(event) =>
                            change(task, {
                              maxOutputTokens: event.target.valueAsNumber,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <label
                          htmlFor={`${task}-timeout`}
                          className="text-sm font-medium"
                        >
                          Ожидание ответа, секунд
                        </label>
                        <Input
                          id={`${task}-timeout`}
                          type="number"
                          min={10}
                          max={120}
                          step={1}
                          required
                          value={profile.timeoutSeconds}
                          className={field}
                          onChange={(event) =>
                            change(task, {
                              timeoutSeconds: event.target.valueAsNumber,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <label
                          htmlFor={`${task}-temperature`}
                          className="text-sm font-medium"
                        >
                          Температура · пусто = по умолчанию
                        </label>
                        <Input
                          id={`${task}-temperature`}
                          type="number"
                          min={0}
                          max={2}
                          step={0.1}
                          disabled={!caps.temperature}
                          value={profile.temperature ?? ''}
                          placeholder={
                            caps.temperature
                              ? 'По умолчанию'
                              : 'Недоступна для этой модели'
                          }
                          className={field}
                          onChange={(event) =>
                            change(task, {
                              temperature:
                                event.target.value === ''
                                  ? null
                                  : event.target.valueAsNumber,
                            })
                          }
                        />
                      </div>
                    </div>
                    <p className="mt-4 text-sm leading-relaxed text-site-muted">
                      Лимит включает рассуждение и видимый ответ. Высокие уровни
                      могут увеличить стоимость и время ожидания. Для незнакомой
                      модели доступны параметры по умолчанию; список API может
                      содержать модели не для текста.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-4 min-h-11 whitespace-normal border-site-line bg-site-raised text-site-ink"
                      disabled={!view.credentials[profile.provider]}
                      onClick={() =>
                        void run('test', async () => {
                          setOutput('');
                          const result = await request({
                            action: 'test',
                            profile,
                            confirmPaid: true,
                          });
                          setOutput(result.text);
                          setNotice(
                            `${providerNames[profile.provider]} / ${profile.model}: тест выполнен; выходных токенов ${result.usage.outputTokens ?? 'нет данных'}. Проверены текущие поля, без сохранения.`,
                          );
                        })
                      }
                    >
                      Проверить ответ · платный запрос
                    </Button>
                  </section>
                );
              })}
              <Button
                type="submit"
                className="min-h-11 w-full bg-site-accent text-site-accent-ink sm:w-auto"
              >
                Сохранить настройки
              </Button>
            </fieldset>
          </form>
          <section className="rounded-2xl border border-site-line bg-site-surface p-4 sm:p-6">
            <h3 className="text-lg font-semibold">Генерация текста</h3>
            <p className="mt-2 text-sm text-site-muted">
              Использует сохранённые настройки задачи «Генерация текстов».
              Результат не публикуется автоматически.
            </p>
            <label
              htmlFor="ai-text-prompt"
              className="mt-4 block text-sm font-medium"
            >
              Задание
            </label>
            <Textarea
              id="ai-text-prompt"
              maxLength={8000}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              className={`${field} mt-2 min-h-28`}
              placeholder="Напишите описание услуги по этим фактам…"
            />
            <Button
              type="button"
              className="mt-4 min-h-11 whitespace-normal bg-site-accent text-site-accent-ink"
              disabled={
                !!busy || !!dirty || !view.config.text.enabled || !prompt.trim()
              }
              onClick={() =>
                void run('generate', async () => {
                  setOutput('');
                  const result = await request({
                    action: 'generate',
                    task: 'text',
                    prompt,
                    confirmPaid: true,
                  });
                  setOutput(result.text);
                  setNotice(
                    `Текст получен; выходных токенов ${result.usage.outputTokens ?? 'нет данных'}`,
                  );
                })
              }
            >
              Сгенерировать · платный запрос
            </Button>
          </section>
          {output && (
            <section
              aria-label="Ответ модели"
              className="rounded-2xl border border-site-line bg-site-raised p-5"
            >
              <h3 className="font-semibold">Ответ модели</h3>
              <p className="mt-3 whitespace-pre-wrap break-words text-base leading-relaxed">
                {output}
              </p>
            </section>
          )}
          <p className="text-sm text-site-muted">
            В этом разделе работают текстовые запросы. Распознавание загруженных
            файлов, транскрибация и realtime-звонки требуют отдельных
            обработчиков и пока не подключены.
          </p>
        </>
      ) : !busy && !error ? (
        <p className="text-site-muted">Загрузка настроек…</p>
      ) : null}
    </div>
  );
}

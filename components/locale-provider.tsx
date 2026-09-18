'use client';
import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
  type ReactElement,
} from 'react';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { translate } from '@/lib/translations';
import { DirectionProvider } from '@base-ui/react/direction-provider';
import {
  isLocale,
  localeNames,
  locales,
  intlLocales,
  type Locale,
} from '@/lib/locales';

const Context = createContext({
  locale: 'en' as Locale,
  setLocale: (_: Locale) => {},
});
export function LocaleProvider({
  initial,
  children,
}: {
  initial: Locale;
  children: ReactNode;
}) {
  const [locale, setLocale] = useState(initial);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'he' ? 'rtl' : 'ltr';
    document.title = translate(document.title, locale);
  }, [locale]);
  const value = useMemo(
    () => ({
      locale,
      setLocale: (next: Locale) => {
        document.cookie = `site-language=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
        setLocale(next);
      },
    }),
    [locale],
  );
  return (
    <Context.Provider value={value}>
      <DirectionProvider direction={locale === 'he' ? 'rtl' : 'ltr'}>
        <div className="site-language-bar site-theme-scope flex min-h-12 flex-wrap items-center justify-end gap-3 border-b border-site-line bg-site-page px-4 py-2 text-site-ink sm:px-8">
          <span id="site-language-label" className="text-sm">
            {translate('Language', locale)}
          </span>
          <Select
            value={locale}
            onValueChange={(next) => {
              if (isLocale(next)) value.setLocale(next);
            }}
            items={locales.map((code) => ({
              value: code,
              label: localeNames[code],
            }))}
          >
            <SelectTrigger
              aria-labelledby="site-language-label"
              className="min-h-11 w-40 border-site-line text-base"
              dir="ltr"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent
              className="border-site-line bg-site-surface text-site-ink"
              dir="ltr"
            >
              {locales.map((code) => (
                <SelectItem key={code} value={code}>
                  <span lang={code} dir={code === 'he' ? 'rtl' : 'ltr'}>
                    {localeNames[code]}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {children}
      </DirectionProvider>
    </Context.Provider>
  );
}
export function useLocale() {
  const context = useContext(Context);
  return {
    ...context,
    intl: intlLocales[context.locale],
    t: (text: string) => translate(text, context.locale),
  };
}
export function LocaleMoney({
  amount,
  currency,
}: {
  amount: number;
  currency: string;
}) {
  const { intl } = useLocale();
  return (
    <bdi>
      {new Intl.NumberFormat(intl, { style: 'currency', currency }).format(
        amount / 100,
      )}
    </bdi>
  );
}

// Declarative React text boundary: no DOM rewriting, network translation or
// mutation of form values, API payloads and business records. Add translate="no"
// around user-owned text. Translate only registered interface/content phrases.
export function Localize({ children }: { children: ReactNode }) {
  const { locale } = useContext(Context);
  function walk(node: ReactNode): ReactNode {
    if (typeof node === 'string') return translate(node, locale);
    if (!isValidElement(node)) return node;
    const element = node as ReactElement<Record<string, unknown>>;
    const props = element.props;
    if (props.translate === 'no' || props['data-user-content']) return node;
    const next: Record<string, unknown> = {};
    for (const key of [
      'aria-label',
      'aria-description',
      'placeholder',
      'title',
      'alt',
    ])
      if (typeof props[key] === 'string')
        next[key] = translate(props[key], locale);
    if (Array.isArray(props.items))
      next.items = props.items.map((item) =>
        item && typeof item === 'object' && typeof item.label === 'string'
          ? { ...item, label: translate(item.label, locale) }
          : item,
      );
    if (props.children !== undefined)
      next.children = Children.map(props.children as ReactNode, walk);
    if (
      ['email', 'password', 'date', 'url', 'tel'].includes(
        String(props.type),
      ) ||
      element.type === 'code'
    )
      next.dir = 'ltr';
    return cloneElement(element, next);
  }
  return <>{Children.map(children, walk)}</>;
}

'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import {
  defaultNavigation,
  resolveNavigation,
  type PublicNavigation,
} from '@/lib/navigation-policy';
import { useLite } from '@/components/engine-provider';
const Context = createContext<PublicNavigation>(
  resolveNavigation(defaultNavigation, []),
);
export const useNavigation = () => useContext(Context);
export function NavigationProvider({
  initial,
  children,
}: {
  initial: PublicNavigation;
  children: React.ReactNode;
}) {
  const lite = useLite();
  const [navigation, setNavigation] = useState(initial);
  useEffect(() => {
    if (lite) return;
    let controller: AbortController | undefined;
    const refresh = () => {
      controller?.abort();
      controller = new AbortController();
      const signal = controller.signal;
      void fetch('/api/navigation', { cache: 'no-store', signal })
        .then(async (response) => {
          if (!response.ok) return;
          const value = (await response.json()) as PublicNavigation;
          if (!signal.aborted) setNavigation(value);
        })
        .catch(() => {
          /* Keep last known navigation on transient failure. */
        });
    };
    window.addEventListener('site-navigation-change', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      controller?.abort();
      window.removeEventListener('site-navigation-change', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [lite]);
  return <Context.Provider value={navigation}>{children}</Context.Provider>;
}

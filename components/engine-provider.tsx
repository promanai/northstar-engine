'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import {
  defaultSiteConfig,
  validateSiteConfig,
  type SiteConfig,
} from '@/lib/site-config-policy';
const EngineContext = createContext(false);
const SiteConfigContext = createContext<SiteConfig>(defaultSiteConfig);
export const useLite = () => useContext(EngineContext);
export const useSiteConfig = () => useContext(SiteConfigContext);
export const useSiteName = () => useSiteConfig().name;
export function SiteName() {
  return <>{useSiteName()}</>;
}
export function EngineProvider({
  lite,
  initial,
  children,
}: {
  lite: boolean;
  initial: SiteConfig;
  children: React.ReactNode;
}) {
  const [config, setConfig] = useState(initial);
  useEffect(() => {
    if (lite) return;
    let controller: AbortController | undefined;
    const refresh = () => {
      controller?.abort();
      controller = new AbortController();
      const signal = controller.signal;
      void fetch('/api/site-config', { cache: 'no-store', signal })
        .then(async (response) => {
          if (!response.ok) return;
          const value = validateSiteConfig(await response.json());
          if (!signal.aborted) setConfig(value);
        })
        .catch(() => {
          /* Preserve last known public state on transient failures. */
        });
    };
    window.addEventListener('site-config-change', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      controller?.abort();
      window.removeEventListener('site-config-change', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [lite]);
  return (
    <EngineContext.Provider value={lite}>
      <SiteConfigContext.Provider value={config}>
        {children}
      </SiteConfigContext.Provider>
    </EngineContext.Provider>
  );
}

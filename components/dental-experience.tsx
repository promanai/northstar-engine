/* oxlint-disable next/no-css-tags */
'use client';

import { useEffect } from 'react';
import { ORAVERA_SHELL } from '@/components/oravera-shell';

interface DentalExperienceProps {
  chatEnabled?: boolean;
  provider?: 'OpenAI' | 'xAI';
  accountEnabled?: boolean;
}

export function DentalExperience({
  chatEnabled = false,
  provider = 'OpenAI',
  accountEnabled = false,
}: DentalExperienceProps) {
  useEffect(() => {
    // 1. Inject OraVera CSS dynamically if not yet loaded
    let link = document.getElementById('oravera-css') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.id = 'oravera-css';
      link.rel = 'stylesheet';
      link.href = '/assets/css/oravera.css';
      document.head.appendChild(link);
    }

    // 2. Configure window.ORAVERA_CONFIG
    (window as unknown as { ORAVERA_CONFIG: unknown }).ORAVERA_CONFIG = {
      apiBase: '/api',
      mediaManifest: '/assets/data/media-manifest.json',
      chatEnabled,
      provider,
      accountEnabled,
    };

    // 3. Inject client runtime script
    const script = document.createElement('script');
    script.id = 'oravera-runtime-script';
    script.src = '/assets/js/oravera-runtime.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      script.remove();
    };
  }, [chatEnabled, provider, accountEnabled]);

  return (
    <>
      <link rel="stylesheet" href="/assets/css/oravera.css" />
      <script
        dangerouslySetInnerHTML={{
          __html: `window.ORAVERA_CONFIG = window.ORAVERA_CONFIG || { apiBase: '/api', mediaManifest: '/assets/data/media-manifest.json' };`,
        }}
      />
      <div
        id="oravera-root"
        dangerouslySetInnerHTML={{ __html: ORAVERA_SHELL }}
      />
      <script src="/assets/js/oravera-runtime.js" defer />
    </>
  );
}

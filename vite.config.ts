import { sites } from '@openai/sites-vite-plugin';
import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
import { defineConfig } from 'vite';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { createBuildStamp } from './scripts/build-stamp.mjs';
import hostingConfig from './.openai/hosting.json';
import siteContent from './site.config.json';
import { validateLiteConfig } from './scripts/lite-config.mjs';

validateLiteConfig(siteContent);

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  '00000000-0000-4000-8000-000000000000';

const { d1, r2 } = hostingConfig;
const standard = process.env.ENGINE_MODE === 'standard';
const buildVersion = process.env.ENGINE_BUILD_VERSION || '0.4.0';
const buildRepository = process.env.ENGINE_BUILD_REPOSITORY || '';
const buildSha = process.env.ENGINE_BUILD_SHA || '';
const buildStamp = createBuildStamp(process.cwd(), {
  version: buildVersion,
  repository: buildRepository,
  sha: buildSha,
  mode: standard ? 'standard' : 'lite',
});

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === 'seatbelt';

const localBindingConfig = {
  main: './worker.ts',
  triggers: { crons: standard ? ['17 * * * *', '*/5 * * * *'] : [] },
  compatibility_flags: ['nodejs_compat'],
  ratelimits: standard
    ? []
    : [
        {
          name: 'LITE_RATE_LIMITER',
          namespace_id: '1001',
          simple: { limit: 20, period: 60 as const },
        },
        {
          name: 'LITE_VOICE_LIMITER',
          namespace_id: '1002',
          simple: { limit: 3, period: 60 as const },
        },
        {
          name: 'LITE_LEAD_LIMITER',
          namespace_id: '1003',
          simple: { limit: 3, period: 60 as const },
        },
      ],
  d1_databases:
    standard && d1
      ? [
          {
            binding: d1,
            database_name: 'site-creator-d1',
            database_id: SITE_CREATOR_PLACEHOLDER_DATABASE_ID,
          },
        ]
      : [],
  r2_buckets:
    standard && r2
      ? [
          {
            binding: r2,
            bucket_name: 'site-creator-r2',
          },
        ]
      : [],
};

export default defineConfig(async () => {
  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= 'false';
  process.env.WRANGLER_LOG_PATH ??= '.wrangler/logs';
  process.env.MINIFLARE_REGISTRY_PATH ??= '.wrangler/registry';

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import('@cloudflare/vite-plugin');

  return {
    define: {
      __ENGINE_VERSION__: JSON.stringify(buildVersion),
      __ENGINE_REPOSITORY__: JSON.stringify(buildRepository),
      __ENGINE_SHA__: JSON.stringify(buildSha),
      __ENGINE_BUILD_ID__: JSON.stringify(buildStamp.id),
      __ENGINE_MIGRATIONS__: JSON.stringify(
        Object.fromEntries(
          readdirSync('drizzle')
            .filter((name) => name.endsWith('.sql'))
            .sort()
            .map((name) => [
              name,
              createHash('sha256')
                .update(
                  readFileSync(`drizzle/${name}`, 'utf8').replaceAll(
                    '\r\n',
                    '\n',
                  ),
                )
                .digest('hex'),
            ]),
        ),
      ),
    },
    css: { postcss: { plugins: [tailwindcss()] } },
    server: isCodexSeatbeltSandbox
      ? { watch: { useFsEvents: false, usePolling: true } }
      : undefined,
    plugins: [
      {
        name: 'northstar-build-stamp',
        apply: 'build',
        closeBundle() {
          // Outside dist/client: never publish the source tree or a private repo name.
          mkdirSync('dist', { recursive: true });
          writeFileSync(
            'dist/engine-build.json',
            JSON.stringify(buildStamp, null, 2) + '\n',
          );
        },
      },
      vinext(),
      sites(),
      cloudflare({
        viteEnvironment: { name: 'rsc', childEnvironments: ['ssr'] },
        config: localBindingConfig,
      }),
    ],
  };
});

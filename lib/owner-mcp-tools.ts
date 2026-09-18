// Northstar Owner MCP Tool Definitions and Handlers (Phase 1: Read-Only MVP)
import { ownerHasScope, type OwnerPrincipal } from './owner-mcp-policy.ts';
import defaultConfig from '../site.config.json' with { type: 'json' };
import { locales, localeNames } from './locales.ts';

export interface OwnerToolDefinition {
  name: string;
  description: string;
  requiredScope: string;
  inputSchema: {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
    additionalProperties?: boolean;
  };
}

export const OWNER_MCP_TOOLS: OwnerToolDefinition[] = [
  {
    name: 'northstar.capabilities',
    description:
      'Inspect Northstar Engine version, runtime mode (Lite or Standard), storage mode, protocol version, and authorized capabilities for the connected agent.',
    requiredScope: 'site:read',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'site.get_status',
    description:
      'Get deployment health, active commit SHA, git repository, runtime mode, and operational status of the live Northstar site.',
    requiredScope: 'site:read',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'site.get_config',
    description:
      'Read public site configuration including site name, description, active theme, background, locale, and content structure summary.',
    requiredScope: 'site:read',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'site.list_pages',
    description:
      'List all published and informational pages on the site with their route slugs, titles, and descriptions.',
    requiredScope: 'content:read',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'site.get_page',
    description:
      'Get the full content, text, markdown, and metadata of a specific page by its slug (e.g. "/" or "/about").',
    requiredScope: 'content:read',
    inputSchema: {
      type: 'object',
      required: ['slug'],
      properties: {
        slug: {
          type: 'string',
          description: 'The route path of the page, e.g. "/" or "/about"',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'content.get_locales',
    description:
      'Inspect supported languages, default content locale, and localization options for the site.',
    requiredScope: 'content:read',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
];

export function getVisibleOwnerTools(principal: OwnerPrincipal): OwnerToolDefinition[] {
  return OWNER_MCP_TOOLS.filter((tool) =>
    ownerHasScope(principal.scopes, tool.requiredScope),
  );
}

export interface OwnerToolResult {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

export interface SiteContext {
  mode?: 'lite' | 'standard';
  commitSha?: string | null;
  repository?: string;
  config?: typeof defaultConfig;
}

export function executeOwnerTool(
  toolName: string,
  args: Record<string, unknown> | undefined,
  principal: OwnerPrincipal,
  context?: SiteContext,
): OwnerToolResult {
  const tool = OWNER_MCP_TOOLS.find((t) => t.name === toolName);
  if (!tool) {
    return {
      isError: true,
      content: [{ type: 'text', text: `Unknown tool: ${toolName}` }],
    };
  }

  if (!ownerHasScope(principal.scopes, tool.requiredScope)) {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `Permission denied: Tool "${toolName}" requires scope "${tool.requiredScope}". Principal has: [${principal.scopes.join(', ')}]`,
        },
      ],
    };
  }

  const activeConfig = context?.config ?? defaultConfig;
  const mode = context?.mode ?? 'lite';
  const commitSha = context?.commitSha ?? null;
  const repository =
    context?.repository ?? 'https://github.com/promanai/northstar-engine';

  switch (toolName) {
    case 'northstar.capabilities': {
      const visibleTools = getVisibleOwnerTools(principal).map((t) => t.name);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                engine: 'northstar-engine',
                version: '0.4.0',
                mode,
                storage: mode === 'lite' ? 'none' : 'd1',
                gitBacked: true,
                protocolVersion: '2026-07-28',
                siteId: principal.siteId,
                agent: {
                  name: principal.agentName,
                  scopes: principal.scopes,
                },
                availableTools: visibleTools,
                phases: {
                  phase1: 'Read-Only Inspection MVP (active)',
                  phase2: 'Git-Backed Change Sets & Previews (ready)',
                  phase3: 'Publish & Rollback Approval (planned)',
                  phase4: 'Standard D1 Operations (planned)',
                },
              },
              null,
              2,
            ),
          },
        ],
      };
    }

    case 'site.get_status': {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                status: 'healthy',
                mode,
                commitSha,
                repository,
                siteName: activeConfig.name,
                theme: activeConfig.theme,
                locale: 'locale' in activeConfig ? activeConfig.locale : 'ru',
                timestamp: new Date().toISOString(),
              },
              null,
              2,
            ),
          },
        ],
      };
    }

    case 'site.get_config': {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                name: activeConfig.name,
                description: activeConfig.description,
                theme: activeConfig.theme,
                backgroundImage: activeConfig.backgroundImage,
                productsCount: activeConfig.products?.length ?? 0,
                pagesCount: (activeConfig.pages?.length ?? 0) + 1, // + home
              },
              null,
              2,
            ),
          },
        ],
      };
    }

    case 'site.list_pages': {
      const pageList = [
        {
          slug: '/',
          title: activeConfig.name,
          description: activeConfig.description,
          type: 'home',
        },
        ...((activeConfig.pages as Array<{ slug: string; title: string; description: string; text?: string }>) || []).map(
          (p) => ({
            slug: p.slug,
            title: p.title,
            description: p.description,
            type: 'page',
          }),
        ),
      ];
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ pages: pageList }, null, 2),
          },
        ],
      };
    }

    case 'site.get_page': {
      const slug = typeof args?.slug === 'string' ? args.slug.trim() : '';
      if (!slug) {
        return {
          isError: true,
          content: [{ type: 'text', text: 'Missing required argument: slug' }],
        };
      }

      if (slug === '/') {
        const text = `# ${activeConfig.name}\n\n${activeConfig.description}\n\nAI-native website engine for Cloudflare Workers.`;
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  slug: '/',
                  title: activeConfig.name,
                  description: activeConfig.description,
                  markdown: text,
                  wordCount: text.split(/\s+/).filter(Boolean).length,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      const found = (activeConfig.pages as Array<{ slug: string; title: string; description: string; text?: string }> || []).find(
        (p) => p.slug === slug || (p.slug.startsWith('/') ? p.slug : `/${p.slug}`) === slug,
      );

      if (!found) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Page not found for slug: ${slug}` }],
        };
      }

      const pageMarkdown = `# ${found.title}\n\n${found.description}\n\n${found.text || ''}`;
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                slug: found.slug,
                title: found.title,
                description: found.description,
                markdown: pageMarkdown,
                wordCount: pageMarkdown.split(/\s+/).filter(Boolean).length,
              },
              null,
              2,
            ),
          },
        ],
      };
    }

    case 'content.get_locales': {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                defaultLocale: 'ru',
                supportedLocales: locales,
                localeNames,
              },
              null,
              2,
            ),
          },
        ],
      };
    }

    default:
      return {
        isError: true,
        content: [{ type: 'text', text: `Unhandled tool: ${toolName}` }],
      };
  }
}

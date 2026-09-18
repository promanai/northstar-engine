import { env } from 'cloudflare:workers';
import { resolveOwnerPrincipal } from '@/lib/owner-mcp-policy';
import { executeOwnerTool, getVisibleOwnerTools } from '@/lib/owner-mcp-tools';
import { isLite } from '@/lib/engine-mode';
import defaultConfig from '@/site.config.json';
import oraveraConfig from '@/presets/oravera.json';

interface JsonRpcRequest {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

function errorResponse(
  id: string | number | null,
  code: number,
  message: string,
  status = 200,
) {
  return jsonResponse(
    {
      jsonrpc: '2.0',
      id: id ?? null,
      error: { code, message },
    },
    status,
  );
}

export async function handleOwnerMcpGet() {
  return jsonResponse({
    name: 'northstar-owner-mcp',
    version: '0.4.0',
    description:
      'Northstar Owner MCP - Secure Management Plane for AI Agents (Codex / Antigravity)',
    transport: 'Streamable HTTP (POST)',
    protocol: 'Model Context Protocol (JSON-RPC 2.0)',
    status: 'ready',
    auth: 'Authorization: Bearer <nsk_owner_token>',
  });
}

export async function handleOwnerMcpPost(request: Request) {
  // 1. Verify Authorization Header
  const authHeader = request.headers.get('authorization');
  const secret = (env as unknown as Record<string, string>)?.OWNER_MCP_SECRET;
  const adminToken = (env as unknown as Record<string, string>)?.INITIAL_ADMIN_TOKEN;
  const legacyAdminToken = (env as unknown as Record<string, string>)?.ADMIN_TOKEN;

  const principal = await resolveOwnerPrincipal({
    authHeader,
    secret,
    adminSecrets: [adminToken, legacyAdminToken].filter(Boolean) as string[],
  });

  if (!principal) {
    return errorResponse(
      null,
      -32000,
      'Authentication failed. Please provide a valid Owner Agent token via "Authorization: Bearer nsk_owner_..." header.',
      401,
    );
  }

  // 2. Parse JSON-RPC Payload
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(null, -32700, 'Parse error: malformed JSON', 400);
  }

  if (!body || typeof body !== 'object') {
    return errorResponse(
      null,
      -32600,
      'Invalid Request: expected JSON object or array',
      400,
    );
  }

  const isBatch = Array.isArray(body);
  const requests: JsonRpcRequest[] = isBatch
    ? (body as JsonRpcRequest[])
    : [body as JsonRpcRequest];

  const responses = [];

  const activeConfig =
    (env.SITE_PRESET ?? env.LITE_SITE_PRESET) === 'oravera'
      ? oraveraConfig
      : defaultConfig;

  const siteContext = {
    mode: isLite() ? ('lite' as const) : ('standard' as const),
    commitSha:
      (env as unknown as Record<string, string>)?.CF_PAGES_COMMIT_SHA || null,
    repository: 'https://github.com/promanai/northstar-engine',
    config: activeConfig as typeof defaultConfig,
  };

  for (const req of requests) {
    const id = req.id ?? null;
    const method = req.method;

    if (!method || typeof method !== 'string') {
      responses.push({
        jsonrpc: '2.0',
        id,
        error: { code: -32600, message: 'Invalid Request: method is required' },
      });
      continue;
    }

    if (method === 'initialize') {
      responses.push({
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2026-07-28',
          capabilities: {
            tools: {
              listChanged: false,
            },
          },
          serverInfo: {
            name: 'northstar-owner-mcp',
            version: '0.4.0',
          },
          instructions:
            'You are connected to the Northstar Engine Owner Management Plane. Use permitted tools to inspect site status, read configuration, and examine pages.',
        },
      });
      continue;
    }

    if (method === 'notifications/initialized') {
      responses.push({ jsonrpc: '2.0', id, result: {} });
      continue;
    }

    if (method === 'ping') {
      responses.push({ jsonrpc: '2.0', id, result: {} });
      continue;
    }

    if (method === 'tools/list') {
      const tools = getVisibleOwnerTools(principal);
      responses.push({
        jsonrpc: '2.0',
        id,
        result: { tools },
      });
      continue;
    }

    if (method === 'tools/call') {
      const name = typeof req.params?.name === 'string' ? req.params.name : '';
      const args = (req.params?.arguments as Record<string, unknown>) ?? {};

      const toolResult = executeOwnerTool(name, args, principal, siteContext);
      responses.push({
        jsonrpc: '2.0',
        id,
        result: toolResult,
      });
      continue;
    }

    responses.push({
      jsonrpc: '2.0',
      id,
      error: { code: -32601, message: `Method not found: ${method}` },
    });
  }

  if (isBatch) {
    return jsonResponse(responses);
  } else {
    return jsonResponse(responses[0]);
  }
}

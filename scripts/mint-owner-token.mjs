#!/usr/bin/env node
// Northstar Owner MCP Token Minting Utility
// Usage: node scripts/mint-owner-token.mjs [--name <agentName>] [--secret <secret>] [--scopes <scopes>] [--days <days>] [--url <siteUrl>]

import { createOwnerCapabilityToken } from '../lib/owner-mcp-policy.ts';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    name: 'AI Agent (Codex/Antigravity)',
    secret: process.env.OWNER_MCP_SECRET || process.env.INITIAL_ADMIN_TOKEN || '',
    scopes: ['*'],
    days: 30,
    siteId: 'aisites',
    url: process.env.SITE_URL || 'https://aisites.aisites.workers.dev',
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--name' && args[i + 1]) options.name = args[++i];
    else if (arg === '--secret' && args[i + 1]) options.secret = args[++i];
    else if (arg === '--scopes' && args[i + 1])
      options.scopes = args[++i].split(',').map((s) => s.trim());
    else if (arg === '--days' && args[i + 1]) options.days = Number(args[++i]);
    else if (arg === '--site' && args[i + 1]) options.siteId = args[++i];
    else if (arg === '--url' && args[i + 1]) options.url = args[++i].replace(/\/+$/, '');
  }

  return options;
}

async function main() {
  const options = parseArgs();

  if (!options.secret) {
    console.error('Error: Secret required. Provide --secret <secret> or set OWNER_MCP_SECRET / INITIAL_ADMIN_TOKEN environment variable.');
    process.exit(1);
  }

  const { token, payload } = await createOwnerCapabilityToken({
    secret: options.secret,
    siteId: options.siteId,
    ownerId: 'owner',
    agentName: options.name,
    scopes: options.scopes,
    expiresInDays: options.days,
  });

  const mcpEndpoint = `${options.url}/api/mcp/owner`;

  console.log('\n======================================================');
  console.log('       NORTHSTAR OWNER MCP CAPABILITY TOKEN           ');
  console.log('======================================================\n');
  console.log(`Agent Name:   ${payload.agentName}`);
  console.log(`Site ID:      ${payload.siteId}`);
  console.log(`Scopes:       ${payload.scopes.join(', ')}`);
  console.log(`Expires:      ${new Date(payload.exp * 1000).toISOString()} (${options.days} days)`);
  console.log(`MCP Endpoint: ${mcpEndpoint}\n`);
  console.log('TOKEN (Keep secret!):');
  console.log('------------------------------------------------------');
  console.log(token);
  console.log('------------------------------------------------------\n');

  console.log('1. CODEX CONFIGURATION (~/.codex/config.json):');
  console.log(
    JSON.stringify(
      {
        mcpServers: {
          northstar: {
            url: mcpEndpoint,
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        },
      },
      null,
      2,
    ),
  );

  console.log('\n2. GOOGLE ANTIGRAVITY / CLAUDE DESKTOP CONFIG:');
  console.log(
    JSON.stringify(
      {
        mcpServers: {
          'northstar-owner': {
            type: 'http',
            url: mcpEndpoint,
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        },
      },
      null,
      2,
    ),
  );

  console.log('\n3. VERIFICATION CURL COMMAND:');
  console.log(
    `curl -X POST ${mcpEndpoint} \\\n` +
      `  -H "Authorization: Bearer ${token}" \\\n` +
      `  -H "Content-Type: application/json" \\\n` +
      `  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'\n`,
  );
}

if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

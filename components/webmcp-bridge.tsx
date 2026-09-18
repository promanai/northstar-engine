'use client';

import { useEffect } from 'react';
import { useLite } from '@/components/engine-provider';

type ModelContext = {
  registerTool: (
    tool: {
      name: string;
      title?: string;
      description: string;
      inputSchema: Record<string, unknown>;
      annotations?: { readOnlyHint?: boolean };
      execute: (input: unknown) => unknown;
    },
    options?: { signal?: AbortSignal },
  ) => void | Promise<void>;
};

export function WebMcpBridge() {
  const lite = useLite();
  useEffect(() => {
    const context = (document as Document & { modelContext?: ModelContext })
      .modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const register = async () => {
      // Lite tools are read-only; do not register an unavailable purchase action.
      await context.registerTool(
        {
          name: 'list_products',
          title: 'List public catalog',
          description:
            'Read active public products and services from this site.',
          inputSchema: { type: 'object', additionalProperties: false },
          annotations: { readOnlyHint: true },
          execute: async () => {
            const response = await fetch('/api/products');
            return (await response.json()) as unknown;
          },
        },
        { signal: lifecycle.signal },
      );
      await context.registerTool(
        {
          name: 'get_catalog_markdown',
          title: 'Read catalog as Markdown',
          description:
            'Read the public catalog in Markdown for use as an AI context.',
          inputSchema: { type: 'object', additionalProperties: false },
          annotations: { readOnlyHint: true },
          execute: async () => {
            const response = await fetch('/llms-full.txt');
            return response.text();
          },
        },
        { signal: lifecycle.signal },
      );
      if (lite) return;
      await context.registerTool(
        {
          name: 'create_order',
          title: 'Create order',
          description:
            'Create a pending order; does not charge money. Reuse idempotencyKey on retries. Uses the signed-in customer session.',
          inputSchema: {
            type: 'object',
            required: ['productId', 'idempotencyKey'],
            properties: {
              idempotencyKey: { type: 'string', minLength: 16, maxLength: 128 },
              productId: { type: 'string' },
              quantity: { type: 'integer', minimum: 1, maximum: 99 },
              customerNote: { type: 'string' },
            },
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false },
          execute: async (input) => {
            const response = await fetch('/api/orders', {
              method: 'POST',
              headers: {
                'content-type': 'application/json',
                'idempotency-key': String(
                  (input as { idempotencyKey?: string }).idempotencyKey ?? '',
                ),
              },
              body: JSON.stringify(input),
            });
            const data = (await response.json()) as { error?: string };
            if (!response.ok) throw new Error(data.error ?? 'Order failed');
            return data;
          },
        },
        { signal: lifecycle.signal },
      );
    };
    void register().catch(() => undefined);
    return () => lifecycle.abort();
  }, [lite]);
  return null;
}

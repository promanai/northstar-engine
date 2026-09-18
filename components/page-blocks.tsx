/* oxlint-disable next/no-html-link-for-pages */
function blockText(block: unknown) {
  if (typeof block === 'string') return block;
  if (!block || typeof block !== 'object' || Array.isArray(block)) return '';
  const value = block as Record<string, unknown>;
  return typeof value.text === 'string'
    ? value.text
    : typeof value.content === 'string'
      ? value.content
      : '';
}

export function PageBlocks({ blocks }: { blocks: unknown[] }) {
  return (
    <div className="mt-8 space-y-6">
      {blocks.map((block, index) => {
        const value =
          block && typeof block === 'object' && !Array.isArray(block)
            ? (block as Record<string, unknown>)
            : null;
        const type = typeof value?.type === 'string' ? value.type : 'paragraph';
        const text = blockText(block);
        if (!text) return null;
        if (type === 'heading')
          return (
            <h2 key={index} className="text-2xl font-semibold tracking-tight">
              {text}
            </h2>
          );
        if (type === 'list')
          return (
            <ul
              key={index}
              className="list-disc space-y-2 pl-6 text-base leading-7"
            >
              <li>{text}</li>
            </ul>
          );
        if (
          type === 'cta' &&
          typeof value?.href === 'string' &&
          /^\/(?!\/)/.test(value.href)
        )
          return (
            <a
              key={index}
              href={value.href}
              className="inline-flex min-h-11 items-center rounded-xl bg-site-accent px-5 font-medium text-site-on-accent hover:bg-site-accent-hover"
            >
              {text}
            </a>
          );
        return (
          <p
            key={index}
            className="whitespace-pre-wrap text-base leading-8 text-site-muted"
          >
            {text}
          </p>
        );
      })}
    </div>
  );
}

// Build-time validation: configuration is content, never credentials or code.
export function validateLiteConfig(site) {
  const text = (v, max) => typeof v === 'string' && v.length <= max;
  const keys = (value, allowed) =>
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).every((k) => allowed.includes(k));
  if (
    !keys(site, [
      'name',
      'description',
      'theme',
      'backgroundImage',
      'products',
      'pages',
    ]) ||
    !text(site.name, 100) ||
    !site.name.trim() ||
    !text(site.description, 500) ||
    !['northstar', 'editorial', 'ocean'].includes(site.theme)
  )
    throw new Error(
      'Invalid site.config.json: name/description/theme or unknown fields',
    );
  if (
    !text(site.backgroundImage, 2000) ||
    (site.backgroundImage &&
      !/^\/(?!\/)|^https:\/\//.test(site.backgroundImage))
  )
    throw new Error('Background must be a local path or HTTPS URL');
  if (
    !Array.isArray(site.products) ||
    site.products.length > 200 ||
    !Array.isArray(site.pages) ||
    site.pages.length > 200
  )
    throw new Error('Lite supports up to 200 products and pages');
  const slugs = new Set(),
    ids = new Set();
  for (const p of site.products) {
    if (
      !keys(p, [
        'id',
        'slug',
        'title',
        'kind',
        'shortDescription',
        'description',
        'price',
        'currency',
        'active',
      ]) ||
      !text(p.id, 100) ||
      !p.id ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.slug) ||
      !text(p.slug, 100) ||
      !text(p.title, 200) ||
      !p.title.trim() ||
      !['product', 'service'].includes(p.kind) ||
      !text(p.shortDescription, 1000) ||
      !text(p.description, 10000) ||
      !Number.isSafeInteger(p.price) ||
      p.price < 0 ||
      !/^[A-Z]{3}$/.test(p.currency) ||
      (p.active !== undefined && typeof p.active !== 'boolean')
    )
      throw new Error('Invalid Lite product');
    if (ids.has(p.id) || slugs.has(p.slug))
      throw new Error('Duplicate Lite product id/slug');
    ids.add(p.id);
    slugs.add(p.slug);
  }
  slugs.clear();
  for (const p of site.pages) {
    if (
      !keys(p, ['slug', 'title', 'description', 'text']) ||
      !text(p.slug, 200) ||
      !/^\/[a-z0-9-]+(?:\/[a-z0-9-]+)*$/.test(p.slug) ||
      /^\/(api|admin|account|login|catalog|_next)(?:\/|$)/.test(p.slug) ||
      !text(p.title, 200) ||
      !p.title.trim() ||
      !text(p.description, 1000) ||
      !text(p.text, 20000)
    )
      throw new Error('Invalid Lite page or reserved slug');
    if (slugs.has(p.slug)) throw new Error('Duplicate Lite page slug');
    slugs.add(p.slug);
  }
  return site;
}

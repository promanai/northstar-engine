const requiredPaths = {
  '/auth/register': ['post'],
  '/auth/login': ['post'],
  '/auth/logout': ['post'],
  '/auth/me': ['get', 'patch'],
  '/chat': ['post'],
  '/conversations': ['get'],
  '/pages': ['get', 'post'],
  '/pages/{id}': ['get', 'patch', 'delete'],
  '/content': ['get'],
  '/products': ['get', 'post'],
  '/products/{id}': ['get', 'patch', 'delete'],
  '/orders': ['get', 'post'],
  '/orders/{id}': ['get', 'patch'],
  '/orders/{id}/checkout': ['post'],
  '/bookings': ['get', 'post'],
  '/bookings/{id}': ['get', 'patch'],
  '/bookings/{id}/checkout': ['post'],
  '/bookings/{id}/refund': ['post'],
  '/booking-slots': ['get', 'post'],
  '/ai': ['get', 'post'],
  '/files': ['get', 'post'],
  '/files/{id}': ['get', 'delete'],
  '/files/{id}/download': ['get'],
  '/settings': ['get', 'put'],
  '/assistant': ['get', 'put'],
  '/customers': ['get', 'post'],
  '/customers/{id}': ['get', 'patch', 'delete'],
  '/customers/{id}/history': ['get'],
  '/tokens': ['get', 'post', 'delete'],
  '/mcp': ['post'],
  '/health': ['get'],
};

function hasForbiddenField(value, fields) {
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value))
    return value.some((item) => hasForbiddenField(item, fields));
  return Object.entries(value).some(
    ([key, child]) => fields.has(key) || hasForbiddenField(child, fields),
  );
}

export function validateOpenApi(spec) {
  const errors = [];
  const lite = spec?.['x-engine-mode'] === 'lite';
  if (spec?.openapi !== '3.0.3') errors.push('openapi must be 3.0.3');
  if (!spec?.info?.title || !spec?.info?.version)
    errors.push('info.title and info.version are required');
  if (!lite && !spec?.components?.securitySchemes?.bearerAuth)
    errors.push('bearerAuth is missing');
  if (!lite && !spec?.components?.securitySchemes?.cookieAuth)
    errors.push('cookieAuth is missing');
  const expected = lite
    ? {
        '/health': ['get'],
        '/settings': ['get'],
        '/products': ['get'],
        '/products/{id}': ['get'],
        '/pages': ['get'],
        '/content': ['get'],
        '/chat': ['post'],
        '/chat/attachment': ['post'],
        '/realtime': ['get', 'post'],
        '/leads': ['get', 'post'],
        '/mcp': ['post'],
      }
    : requiredPaths;
  if (lite && Object.keys(spec.paths ?? {}).some((p) => !(p in expected)))
    errors.push('Lite exposes an unsupported module');
  for (const [route, methods] of Object.entries(expected)) {
    const pathItem = spec?.paths?.[route];
    if (!pathItem) {
      errors.push(`missing path ${route}`);
      continue;
    }
    for (const method of methods)
      if (
        !pathItem[method] ||
        typeof pathItem[method].summary !== 'string' ||
        !pathItem[method].summary.trim()
      )
        errors.push(`missing ${method.toUpperCase()} contract for ${route}`);
  }
  for (const [route, pathItem] of Object.entries(spec?.paths ?? {}))
    for (const [method, operation] of Object.entries(pathItem)) {
      if (!['get', 'post', 'put', 'patch', 'delete'].includes(method)) continue;
      if (!operation?.operationId)
        errors.push(`missing operationId for ${method.toUpperCase()} ${route}`);
      if (!operation?.responses || typeof operation.responses !== 'object')
        errors.push(`missing responses for ${method.toUpperCase()} ${route}`);
    }
  return errors;
}

export function validatePublicCatalog(payload) {
  const products = payload?.products;
  if (!Array.isArray(products))
    return ['public catalog must return products[]'];
  return hasForbiddenField(
    payload,
    new Set(['aiInstructions', 'internalNotes', 'providerSecret']),
  )
    ? ['public catalog exposes an internal field']
    : [];
}

export { requiredPaths };

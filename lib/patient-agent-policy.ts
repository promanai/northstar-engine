export const patientAgentScopes = {
  read: ['content:read', 'catalog:read', 'bookings:read'],
  book: ['content:read', 'catalog:read', 'bookings:read', 'bookings:write'],
} as const;
export function patientAgentInput(body: Record<string, unknown>) {
  if (
    Object.keys(body).some(
      (k) => !['name', 'expiresInDays', 'access', 'confirm'].includes(k),
    ) ||
    body.confirm !== true
  )
    throw new Error(
      'Explicit confirmation is required. Custom roles and scopes are not accepted.',
    );
  if (
    typeof body.name !== 'string' ||
    !body.name.trim() ||
    body.name.length > 80
  )
    throw new Error('Use a name of 1–80 characters.');
  if (
    !Number.isInteger(body.expiresInDays) ||
    Number(body.expiresInDays) < 1 ||
    Number(body.expiresInDays) > 30
  )
    throw new Error('Choose an expiry of 1–30 days.');
  if (body.access !== 'read' && body.access !== 'book')
    throw new Error('Choose read or book access.');
  return {
    name: body.name.trim(),
    days: body.expiresInDays as number,
    scopes: [...patientAgentScopes[body.access]],
  };
}

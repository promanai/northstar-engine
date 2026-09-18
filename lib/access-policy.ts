// A new or malformed role must never inherit administrative privileges.
export const isAdministrator = (role: unknown): boolean =>
  role === 'owner' || role === 'admin';

export type ContentActor = {
  id: string;
  role: string;
  tokenId?: string;
  scopes?: string[];
};

export function canManagePages(
  actor: ContentActor | null,
  action: 'read' | 'write',
) {
  return (
    !!actor &&
    isAdministrator(actor.role) &&
    (!actor.tokenId ||
      !!actor.scopes?.some((s) => s === '*' || s === `pages:${action}`))
  );
}

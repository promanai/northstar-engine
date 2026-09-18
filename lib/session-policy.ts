export type SessionView = {
  id: string;
  createdAt: number;
  expiresAt: number;
  current: boolean;
};
export type SessionList = { sessions: SessionView[]; truncated: boolean };

export function sessionRevocation(body: Record<string, unknown>) {
  if (
    Object.keys(body).some(
      (k) => !['target', 'currentPassword', 'confirm'].includes(k),
    ) ||
    body.confirm !== true ||
    typeof body.currentPassword !== 'string' ||
    body.currentPassword.length < 1 ||
    body.currentPassword.length > 256 ||
    typeof body.target !== 'string' ||
    (body.target !== 'others' &&
      !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
        body.target,
      ))
  )
    throw new Error('Нужны target, текущий пароль и явное подтверждение');
  return { target: body.target, currentPassword: body.currentPassword };
}

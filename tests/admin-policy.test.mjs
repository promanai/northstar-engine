import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assistantInput,
  customerInput,
  expectedRevision,
  recordFields,
} from '../lib/admin-policy.ts';
import { bearerRouteAllowed, toolAllowed } from '../lib/agent-policy.ts';
void test('admin input rejects unknown fields, invalid revisions and nested scalar values', () => {
  assert.throws(() => recordFields({ role: 'admin' }, ['email']));
  for (const revision of [
    undefined,
    null,
    -1,
    0.1,
    '0',
    Infinity,
    Number.MAX_SAFE_INTEGER + 1,
  ])
    assert.throws(() => expectedRevision(revision));
  assert.equal(expectedRevision(0), 0);
  for (const value of [null, [], {}, 2, true]) {
    assert.throws(() => assistantInput({ name: value }));
    assert.throws(() => customerInput({ email: value }, true));
  }
});
void test('assistant validates lengths, locale, status and permits clearing instructions', () => {
  assert.deepEqual(assistantInput({ systemPrompt: '' }), { systemPrompt: '' });
  assert.deepEqual(
    assistantInput({
      name: ' Test ',
      defaultLocale: 'pt-BR',
      status: 'disabled',
    }),
    { name: 'Test', defaultLocale: 'pt-BR', status: 'disabled' },
  );
  for (const body of [
    {},
    { name: '' },
    { name: 'a'.repeat(121) },
    { systemPrompt: 'a'.repeat(16001) },
    { systemPrompt: 'bad\0' },
    { status: 'oops' },
    { defaultLocale: 'javascript:bad' },
  ])
    assert.throws(() => assistantInput(body));
});
void test('customer contact normalization, clear fields and initial password validation', () => {
  assert.deepEqual(
    customerInput(
      { email: ' NAME@EXAMPLE.TEST ', firstName: ' Ann ', phone: '' },
      true,
    ),
    { email: 'name@example.test', firstName: 'Ann', phone: null },
  );
  assert.throws(() => customerInput({ email: 'a@b' }, true));
  for (const body of [
    { firstName: 'a'.repeat(121) },
    { phone: '<script>' },
    { phone: null },
    { password: 'short' },
    { password: 'a'.repeat(257) },
  ])
    assert.throws(() => customerInput(body));
  assert.equal(
    customerInput({ email: 'a@example.test', password: ' 12345678 ' }, true)
      .password,
    ' 12345678 ',
  );
});
void test('admin history and restore scopes never grant customer or write-only read access', () => {
  assert.ok(
    toolAllowed(
      'admin',
      ['assistant:read', 'assistant:write'],
      'restore_assistant',
    ),
  );
  assert.ok(!toolAllowed('admin', ['assistant:write'], 'restore_assistant'));
  assert.ok(!toolAllowed('customer', ['*'], 'customer_history'));
  assert.ok(
    bearerRouteAllowed('/api/customers/id/history', 'GET', ['customers:read']),
  );
  assert.ok(
    !bearerRouteAllowed('/api/customers/id/history', 'POST', [
      'customers:write',
    ]),
  );
});

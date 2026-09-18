import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateStoredFile,
  uploadKey,
  fileQuota,
  fileDisposition,
  fileLimit,
} from '../lib/file-policy.ts';
import {
  bearerRouteAllowed,
  toolAllowed,
  validScopes,
} from '../lib/agent-policy.ts';
const bytes = (value) => new TextEncoder().encode(value);
void test('files accept supported signatures and strict UTF-8 text', () => {
  for (const [name, mime, data] of [
    ['a.png', 'image/png', new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])],
    ['a.jpg', 'image/jpeg', new Uint8Array([255, 216, 255])],
    ['a.webp', 'image/webp', bytes('RIFF0000WEBP')],
    ['a.pdf', 'application/pdf', bytes('%PDF-1.7')],
    ['файл.md', 'text/markdown', bytes('Привет')],
    ['a.txt', '', bytes('hello')],
  ])
    assert.equal(validateStoredFile(name, mime, data).filename, name);
});
void test('files reject unsupported, spoofed, empty, oversized and invalid UTF-8 content', () => {
  for (const [name, mime, data] of [
    ['a.svg', 'image/svg+xml', bytes('<svg/>')],
    ['a.html', 'text/html', bytes('html')],
    ['a.constructor', '', bytes('x')],
    ['a.png', 'image/png', bytes('not PNG')],
    ['a.txt', 'image/png', bytes('text')],
    ['a.txt', 'text/plain', new Uint8Array([255])],
    ['a.txt', 'text/plain', new Uint8Array([0])],
    ['a.txt', 'text/plain', new Uint8Array()],
    ['a.txt', 'text/plain', new Uint8Array(64001).fill(65)],
    ['a.pdf', 'application/pdf', new Uint8Array(fileLimit + 1)],
  ])
    assert.throws(() => validateStoredFile(name, mime, data));
});
void test('files reject path/header injection and encode download filenames', () => {
  for (const name of [
    '../a.txt',
    'a\\a.txt',
    'a\r\n.txt',
    'a\0.txt',
    'a'.repeat(161) + '.txt',
  ])
    assert.throws(() => validateStoredFile(name, 'text/plain', bytes('x')));
  const header = fileDisposition('привет\r\n.txt');
  assert.ok(header.startsWith('attachment;'));
  assert.ok(!header.includes('\r'));
  assert.ok(header.includes('%D0'));
  assert.doesNotThrow(() => fileDisposition('\ud800.txt'));
});
void test('file idempotency keys and quota configuration fail closed', () => {
  assert.equal(uploadKey('key-test-12345678'), 'key-test-12345678');
  for (const key of ['', null, 'short', 'bad/key1234567890'])
    assert.throws(() => uploadKey(key));
  assert.equal(fileQuota({}).userCount, 50);
  for (const value of ['0', '-1', 'NaN', '1.5', 'Infinity', '999999999999'])
    assert.throws(() => fileQuota({ FILES_USER_MAX_BYTES: value }));
});
void test('file scopes allow customer-owned management without broad permissions', () => {
  assert.deepEqual(validScopes(['files:read', 'files:write'], 'customer'), [
    'files:read',
    'files:write',
  ]);
  assert.ok(
    bearerRouteAllowed('/api/files/id/download', 'GET', ['files:read']),
  );
  assert.ok(
    !bearerRouteAllowed('/api/files/id/download', 'POST', ['files:write']),
  );
  assert.ok(!bearerRouteAllowed('/api/files/id', 'DELETE', ['files:read']));
  assert.ok(toolAllowed('customer', ['files:write'], 'delete_file'));
  assert.ok(!toolAllowed('customer', ['files:read'], 'delete_file'));
  assert.ok(!toolAllowed('customer', ['files:write'], 'delete_customer'));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  chatFileInput,
  canAnalyzeFile,
  bytesBase64,
  historyContent,
  chatFileView,
} from '../lib/chat-file-policy.ts';
void test('chat file consent is strict, provider-bound and rejects raw file payloads', () => {
  const body = {
    message: 'read',
    fileId: 'file-id',
    confirmFile: true,
    fileProvider: 'openai',
  };
  assert.deepEqual(chatFileInput(body), { id: 'file-id', provider: 'openai' });
  for (const patch of [
    { confirmFile: false },
    { confirmFile: 'true' },
    { fileProvider: ['openai'] },
    { fileProvider: 'other' },
    { fileId: '../../file' },
    { attachment: {} },
  ])
    assert.throws(() => chatFileInput({ ...body, ...patch }));
  assert.equal(chatFileInput({ message: 'hi' }), null);
  assert.throws(() => chatFileInput({ message: 'hi', confirmFile: true }));
});
void test('file analysis never inherits administrative access or bearer scopes', () => {
  for (const role of ['admin', 'owner', 'customer']) {
    assert.equal(canAnalyzeFile({ id: 'a', role }, 'a'), true);
    assert.equal(canAnalyzeFile({ id: 'a', role }, 'b'), false);
    assert.equal(
      canAnalyzeFile({ id: 'a', role, tokenId: 't', scopes: ['*'] }, 'a'),
      false,
    );
  }
  assert.equal(canAnalyzeFile(null, null), false);
  assert.equal(canAnalyzeFile({ id: 'a', role: 'unknown' }, 'a'), false);
});
void test('file bytes convert in bounded chunks, history never auto-replays contents', () => {
  const data = Uint8Array.from({ length: 200000 }, (_, i) => i % 256);
  assert.equal(bytesBase64(data), Buffer.from(data).toString('base64'));
  assert.equal(historyContent('question', null), 'question');
  assert.match(historyContent('question', 'private-id'), /не передано/);
  assert.equal(
    historyContent('question', 'private-id').includes('private-id'),
    false,
  );
});
void test('history attachment projection respects file scopes and tombstones', () => {
  const row = {
    id: 'file',
    userId: 'a',
    filename: 'private.txt',
    contentType: 'text/plain',
    size: 2,
    status: 'uploaded',
  };
  assert.equal(chatFileView({ id: 'b', role: 'customer' }, row), null);
  assert.equal(
    chatFileView(
      {
        id: 'a',
        role: 'customer',
        tokenId: 't',
        scopes: ['conversations:read'],
      },
      row,
    ),
    null,
  );
  assert.equal(
    chatFileView({ id: 'a', role: 'customer' }, row).downloadUrl,
    '/api/files/file/download',
  );
  const deleted = chatFileView(
    { id: 'a', role: 'customer' },
    { ...row, status: 'deleted' },
  );
  assert.equal(deleted.downloadUrl, null);
  assert.equal(JSON.stringify(deleted).includes('private.txt'), false);
});

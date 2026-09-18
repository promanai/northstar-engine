import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateAttachment,
  attachmentContent,
  attachmentLimit,
} from '../lib/attachment-policy.ts';
import { createRealtimeCall } from '../lib/realtime-provider.ts';
import { responsePayload } from '../lib/ai-provider.ts';
import { defaultProfile } from '../lib/ai-policy.ts';
const file = (name, mime, data) => ({
  name,
  mime,
  data: Buffer.from(data).toString('base64'),
});
void test('attachments reject URLs, scripts, forged signatures, invalid UTF-8 and oversized data', () => {
  for (const a of [
    file('a.png', 'image/png', 'not png'),
    file('a.svg', 'image/svg+xml', '<svg/>'),
    file('../a.txt', 'text/plain', 'text'),
    file('a.txt', 'text/plain', Buffer.from([255])),
    file('a.txt', 'text/plain', 'x'.repeat(64001)),
    file('a.pdf', 'application/pdf', 'x'.repeat(attachmentLimit + 1)),
    { name: 'a.png', mime: 'image/png', data: 'https://evil.test/file' },
  ])
    assert.throws(() => validateAttachment(a));
});
void test('text is an untrusted user input, PDF and images use inline Responses parts without file storage', () => {
  const text = validateAttachment(file('notes.md', 'text/plain', 'Пример'));
  assert.match(attachmentContent('Прочти', text, 'xai')[1].text, /Пример/);
  const pdf = validateAttachment(
    file('a.pdf', 'application/pdf', '%PDF-1.7\n'),
  );
  const parts = attachmentContent('Вопрос', pdf, 'openai');
  assert.equal(parts[1].type, 'input_file');
  assert.match(parts[1].file_data, /^data:application\/pdf;base64,/);
  assert.throws(() => attachmentContent('Вопрос', pdf, 'xai'));
  const png = validateAttachment(
    file('a.png', 'image/png', Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
  );
  assert.equal(
    attachmentContent('Вопрос', png, 'openai')[1].type,
    'input_image',
  );
  const payload = responsePayload(defaultProfile(), [
    { role: 'user', content: parts },
  ]);
  assert.equal(payload.store, false);
  assert.equal(payload.input[0].content[1].filename, 'a.pdf');
});
void test('WebRTC uses fixed origin, server key and public session configuration', async () => {
  let called = false;
  const answer = await createRealtimeCall(
    'test-secret',
    'gpt-realtime-mini',
    'marin',
    'Public catalog',
    'v=0\r\nm=audio',
    async (url, options) => {
      called = true;
      assert.equal(url, 'https://api.openai.com/v1/realtime/calls');
      assert.equal(options.headers.authorization, 'Bearer test-secret');
      assert.equal(options.redirect, 'manual');
      assert.equal(options.body.get('sdp'), 'v=0\r\nm=audio');
      const session = JSON.parse(options.body.get('session'));
      assert.equal(session.type, 'realtime');
      assert.equal(session.max_output_tokens, 512);
      assert.equal(session.instructions, 'Public catalog');
      return new Response('v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111');
    },
  );
  assert.ok(called);
  assert.match(answer, /m=audio/);
  assert.doesNotMatch(answer, /test-secret/);
});
void test('WebRTC upstream errors do not leak provider response bodies', async () => {
  await assert.rejects(
    createRealtimeCall(
      'key',
      'model',
      'voice',
      'public',
      'sdp',
      async () => new Response('private upstream body', { status: 401 }),
    ),
    (error) => !error.message.includes('private upstream body'),
  );
  await assert.rejects(
    createRealtimeCall(
      'key',
      'model',
      'voice',
      'public',
      'sdp',
      async () => new Response('x'.repeat(65000)),
    ),
  );
});

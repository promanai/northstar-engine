import test from 'node:test';
import assert from 'node:assert/strict';
import { discardBody } from '../lib/security-policy.ts';

const streamed = (source) =>
  new Request('https://synthetic.example', {
    method: 'POST',
    body: new ReadableStream(source),
    duplex: 'half',
  });

test('rejected small bodies are drained to EOF without cancellation or retained reader', async () => {
  let pulls = 0,
    cancelled = false;
  const request = streamed({
    pull(controller) {
      pulls++;
      if (pulls < 4) controller.enqueue(new Uint8Array(2));
      else controller.close();
    },
    cancel() {
      cancelled = true;
    },
  });
  await discardBody(request, 10, 100);
  assert.equal(pulls, 4);
  assert.equal(cancelled, false);
  assert.equal(request.bodyUsed, true);
  assert.equal(request.body.locked, false);
  await discardBody(request);
  await discardBody(new Request('https://synthetic.example'));
});

test('rejected body byte limit cancels without waiting for an uncooperative producer', async () => {
  let cancelled = false;
  const request = streamed({
    pull(c) {
      c.enqueue(new Uint8Array(20));
    },
    cancel() {
      cancelled = true;
      return new Promise(() => {});
    },
  });
  await discardBody(request, 10, 100);
  assert.equal(cancelled, true);
  assert.equal(request.body.locked, false);
});

test('stalled and broken rejected uploads preserve intended rejection and release the reader', async () => {
  let cancelled = false;
  const stalled = streamed({
    pull() {
      return new Promise(() => {});
    },
    cancel() {
      cancelled = true;
    },
  });
  await discardBody(stalled, 10, 20);
  assert.equal(cancelled, true);
  assert.equal(stalled.body.locked, false);
  const broken = streamed({
    start(c) {
      c.error(new Error('synthetic transport failure'));
    },
  });
  await discardBody(broken, 10, 20);
  assert.equal(broken.body.locked, false);
});

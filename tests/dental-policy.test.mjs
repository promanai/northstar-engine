import test from 'node:test';
import assert from 'node:assert/strict';
import {
  dentalChatAvailable,
  dentalRequestAllowed,
  dentalSystemPolicy,
} from '../lib/dental-policy.ts';

test('dental health-data activation and per-request consent are strict opt-ins', () => {
  for (const flag of [undefined, '', 'false', 'TRUE'])
    assert.equal(
      dentalRequestAllowed({ LITE_HEALTH_DATA_ENABLED: flag }, true),
      false,
    );
  for (const consent of [undefined, null, false, 'true', 1])
    assert.equal(
      dentalRequestAllowed({ LITE_HEALTH_DATA_ENABLED: 'true' }, consent),
      false,
    );
  assert.equal(
    dentalRequestAllowed({ LITE_HEALTH_DATA_ENABLED: 'true' }, true),
    true,
  );
});
test('dental UI requires health review, enabled AI, limiter and selected provider key', () => {
  const env = {
    LITE_HEALTH_DATA_ENABLED: 'true',
    LITE_AI_ENABLED: 'true',
    LITE_RATE_LIMITER: {},
    OPENAI_API_KEY: 'synthetic-not-a-key',
  };
  assert.equal(dentalChatAvailable(env), true);
  for (const key of Object.keys(env))
    assert.equal(dentalChatAvailable({ ...env, [key]: undefined }), false, key);
  assert.equal(dentalChatAvailable({ ...env, LITE_AI_PROVIDER: 'xai' }), false);
  assert.equal(
    dentalChatAvailable({
      ...env,
      LITE_AI_PROVIDER: 'xai',
      XAI_API_KEY: 'synthetic',
    }),
    true,
  );
  assert.equal(
    dentalChatAvailable({ ...env, LITE_AI_PROVIDER: 'unknown' }),
    false,
  );
  assert.equal(dentalChatAvailable({ ...env, OPENAI_API_KEY: ' ' }), false);
});
test('fixed clinic prompt includes non-diagnostic, emergency and booking boundaries', () => {
  // A regression check on instructions, NOT a clinical evaluation of model outputs.
  for (const boundary of [
    'not a dentist',
    'Do not diagnose',
    'call 911',
    'Never invent',
    'cannot create or confirm an appointment',
    'not directly to a doctor',
    'untrusted data',
  ])
    assert.ok(dentalSystemPolicy.includes(boundary), boundary);
});

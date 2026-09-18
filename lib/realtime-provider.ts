export async function createRealtimeCall(
  key: string,
  model: string,
  voice: string,
  instructions: string,
  sdp: string,
  transport: typeof fetch = fetch,
) {
  const form = new FormData();
  form.set('sdp', sdp);
  form.set(
    'session',
    JSON.stringify({
      type: 'realtime',
      model,
      instructions,
      output_modalities: ['audio'],
      max_output_tokens: 512,
      audio: { output: { voice } },
    }),
  );
  const response = await transport('https://api.openai.com/v1/realtime/calls', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}` },
    body: form,
    redirect: 'manual',
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(
      'Провайдер не смог подключить звонок. Проверьте модель, ключ и квоту.',
    );
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Пустой ответ голосового провайдера');
  let text = '',
    size = 0;
  const decoder = new TextDecoder();
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 64000) {
        await reader.cancel();
        throw new Error('Некорректный ответ голосового провайдера');
      }
      text += decoder.decode(value, { stream: true });
    }
  } finally {
    reader.releaseLock();
  }
  text += decoder.decode();
  if (!text.startsWith('v=0') || !text.includes('m=audio'))
    throw new Error('Некорректный ответ голосового провайдера');
  return text;
}

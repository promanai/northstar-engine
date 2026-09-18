'use client';
import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Phone, PhoneOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

export function VoiceCall() {
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<'idle' | 'connecting' | 'active'>('idle');
  const [notice, setNotice] = useState('');
  const [muted, setMuted] = useState(false);
  const [caption, setCaption] = useState('');
  const resources = useRef<{
    pc?: RTCPeerConnection;
    stream?: MediaStream;
    audio?: HTMLAudioElement;
    abort?: AbortController;
    timer?: ReturnType<typeof setTimeout>;
  }>({});
  const generation = useRef(0);
  function cleanup() {
    generation.current++;
    const r = resources.current;
    resources.current = {};
    r.abort?.abort();
    clearTimeout(r.timer);
    r.stream?.getTracks().forEach((t) => t.stop());
    r.pc?.close();
    if (r.audio) {
      r.audio.pause();
      r.audio.srcObject = null;
    }
  }
  function stop() {
    cleanup();
    setState('idle');
    setMuted(false);
  }
  useEffect(() => {
    const leave = () => {
      stop();
    };
    window.addEventListener('pagehide', leave);
    return () => {
      window.removeEventListener('pagehide', leave);
      cleanup();
    };
  }, []);
  async function show(value: boolean) {
    setOpen(value);
    if (!value) {
      stop();
      return;
    }
    setReady(false);
    setNotice('Проверяем доступность звонков…');
    setCaption('');
    const id = ++generation.current;
    try {
      const response = await fetch('/api/realtime', {
        signal: AbortSignal.timeout(10000),
      });
      const data = (await response.json()) as { enabled?: boolean };
      if (id !== generation.current) return;
      if (!response.ok || !data.enabled) {
        setNotice('Аудиозвонки ещё не подключены владельцем сайта.');
        return;
      }
      setReady(true);
      setNotice('');
    } catch {
      if (id === generation.current)
        setNotice(
          'Не удалось проверить доступность звонков. Попробуйте открыть окно снова.',
        );
    }
  }
  async function start() {
    if (!ready || resources.current.abort) return;
    const id = ++generation.current;
    const abort = new AbortController();
    resources.current = { abort };
    setState('connecting');
    setNotice('');
    setCaption('');
    setMuted(false);
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection)
        throw new Error(
          'Для звонка нужен браузер с микрофоном и HTTPS (или localhost).',
        );
      // Microphone access happens only after the visitor's explicit Start action.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      if (id !== generation.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      resources.current.stream = stream;
      const pc = new RTCPeerConnection();
      resources.current.pc = pc;
      const audio = new Audio();
      audio.autoplay = true;
      resources.current.audio = audio;
      const fail = (message: string) => {
        if (id === generation.current) {
          stop();
          setNotice(message);
        }
      };
      resources.current.timer = setTimeout(
        () => fail('Не удалось установить соединение. Повторите звонок.'),
        30000,
      );
      pc.ontrack = (e) => {
        audio.srcObject = e.streams[0];
        void audio
          .play()
          .catch(() =>
            fail(
              'Браузер заблокировал звук. Разрешите воспроизведение и повторите звонок.',
            ),
          );
      };
      pc.onconnectionstatechange = () => {
        if (['failed', 'disconnected'].includes(pc.connectionState))
          fail('Соединение прервано. Можно позвонить снова.');
      };
      stream.getTracks().forEach((t) => {
        pc.addTrack(t, stream);
        t.onended = () => fail('Микрофон отключён. Звонок завершён.');
      });
      const dc = pc.createDataChannel('oai-events');
      dc.onopen = () => {
        if (id !== generation.current) return;
        clearTimeout(resources.current.timer);
        setState('active');
        resources.current.timer = setTimeout(
          () => fail('Звонок завершён: прошло 3 минуты.'),
          180000,
        );
      };
      dc.onmessage = (e) => {
        if (id !== generation.current) return;
        try {
          const event = JSON.parse(e.data);
          if (event.type === 'error')
            fail(
              'Голосовой ассистент сообщил об ошибке. Повторите звонок позже.',
            );
          if (
            event.type === 'response.output_audio_transcript.done' &&
            typeof event.transcript === 'string'
          )
            setCaption(event.transcript.slice(0, 2000));
        } catch {
          /* Ignore unsupported events; never render provider error details. */
        }
      };
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      if (id !== generation.current) return;
      const response = await fetch('/api/realtime', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sdp: offer.sdp, confirmed: true }),
        signal: abort.signal,
      });
      const data = (await response.json()) as { sdp?: string; error?: string };
      if (id !== generation.current) return;
      if (!response.ok)
        throw new Error(data.error ?? 'Не удалось подключить звонок');
      if (typeof data.sdp !== 'string')
        throw new Error('Не получено подтверждение звонка');
      await pc.setRemoteDescription({ type: 'answer', sdp: data.sdp });
    } catch (error) {
      if (id !== generation.current) return;
      stop();
      setNotice(
        error instanceof Error && error.name === 'NotAllowedError'
          ? 'Доступ к микрофону не разрешён. Разрешите его в браузере и повторите звонок.'
          : error instanceof Error && error.name === 'NotFoundError'
            ? 'Микрофон не найден.'
            : error instanceof Error
              ? error.message
              : 'Не удалось начать звонок',
      );
    }
  }
  return (
    <>
      <Button
        variant="ghost"
        onClick={() => void show(true)}
        data-analytics="voice-open"
        className="min-h-11 gap-2 px-3 text-site-muted hover:bg-site-raised hover:text-site-ink"
        aria-label="Позвонить ассистенту"
      >
        <Phone className="size-4" /> Позвонить
      </Button>
      <Dialog open={open} onOpenChange={(value) => void show(value)}>
        <DialogContent
          showCloseButton={false}
          className="border border-site-line bg-site-surface text-site-ink sm:max-w-md"
        >
          <DialogTitle className="text-xl text-site-ink">
            Звонок ассистенту
          </DialogTitle>
          <DialogDescription className="text-base leading-6 text-site-muted">
            Вы будете говорить с AI. При начале звонка звук микрофона передаётся
            OpenAI. Сайт не сохраняет запись. Один звонок — до 3 минут.
          </DialogDescription>
          <output className="text-sm text-site-muted">
            {notice ||
              (state === 'active'
                ? 'Звонок подключён — можно говорить'
                : state === 'connecting'
                  ? 'Подключаем микрофон и ассистента…'
                  : 'Микрофон включится после нажатия «Начать звонок».')}
          </output>
          {caption && (
            <p
              aria-live="polite"
              className="max-h-40 overflow-y-auto whitespace-pre-wrap text-base"
            >
              {caption}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {state === 'idle' ? (
              <Button
                disabled={!ready}
                onClick={() => void start()}
                data-analytics="voice-start"
                className="min-h-11 bg-site-accent text-site-on-accent hover:bg-site-accent-hover"
              >
                <Phone />
                Начать звонок
              </Button>
            ) : (
              <>
                {state === 'active' && (
                  <Button
                    variant="outline"
                    aria-pressed={muted}
                    className="min-h-11 border-site-line bg-site-raised text-site-ink"
                    onClick={() => {
                      const next = !muted;
                      resources.current.stream
                        ?.getAudioTracks()
                        .forEach((t) => {
                          t.enabled = !next;
                        });
                      setMuted(next);
                    }}
                  >
                    {muted ? <MicOff /> : <Mic />}
                    {muted ? 'Включить микрофон' : 'Выключить микрофон'}
                  </Button>
                )}
                <Button
                  className="min-h-11 bg-site-raised text-site-ink hover:bg-site-page"
                  data-analytics="voice-end"
                  onClick={() => {
                    stop();
                    setNotice('Звонок завершён');
                  }}
                >
                  <PhoneOff />
                  Завершить
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              className="min-h-11 text-site-muted hover:bg-site-raised hover:text-site-ink"
              onClick={() => void show(false)}
            >
              Закрыть
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

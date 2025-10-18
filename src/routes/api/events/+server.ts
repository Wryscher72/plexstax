// src/routes/api/events/+server.ts
import type { RequestHandler } from './$types';
import { getSonarrSummary, getSonarrQueueRibbons } from '$lib/server/sonarr';

export const GET: RequestHandler = ({ request }) => {
  let closed = false;
  const timers: ReturnType<typeof setInterval>[] = [];

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const enc = new TextEncoder();
      const send = (obj: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));
        } catch {
          /* controller already closed */
        }
      };

      const cleanup = () => {
        if (closed) return;
        closed = true;
        for (const t of timers) clearInterval(t);
        try {
          controller.close();
        } catch {/* ignore */}
      };

      // Close once when the client disconnects
      request.signal.addEventListener('abort', cleanup, { once: true });

      // Initial hello so the UI knows we're live
      send({ kind: 'hello' });

      // SONARR cards every 10s (if env vars present)
      timers.push(
        setInterval(async () => {
          try {
            const sonarr = await getSonarrSummary();
            send({ kind: 'cards', data: { sonarr } });
          } catch {/* keep stream alive */}
        }, 10_000)
      );

      // SONARR ribbons every 3s
      timers.push(
        setInterval(async () => {
          try {
            const ribbons = await getSonarrQueueRibbons();
            for (const r of ribbons.slice(0, 10)) send({ kind: 'ribbon', data: r });
          } catch {}
        }, 3_000)
      );

      // Heartbeat (helps with proxies)
      timers.push(
        setInterval(() => {
          if (closed) return;
          try {
            controller.enqueue(enc.encode(`:hb ${Date.now()}\n\n`));
          } catch {}
        }, 15_000)
      );
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive'
    }
  });
};

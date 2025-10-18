// src/routes/api/events/+server.ts
import type { RequestHandler } from './$types';

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
          // controller already closed — ignore
        }
      };

      const cleanup = () => {
        if (closed) return;
        closed = true;
        for (const t of timers) clearInterval(t);
        try {
          controller.close();
        } catch {
          /* ignore double-close */
        }
      };

      // Close once when client disconnects (avoid double calls)
      request.signal.addEventListener('abort', cleanup, { once: true });

      // Initial hello
      send({ kind: 'hello' });

      // --- DEMO DATA TICKER (mock) ---
      timers.push(
        setInterval(() => {
          const now = Math.floor(Date.now() / 1000);

          // Mock "cards"
          send({
            kind: 'cards',
            data: {
              sonarr: { queued: Math.floor(Math.random() * 7), wanted: 42, series: 88, toMove: 1, moved: 0 },
              radarr: { queued: Math.floor(Math.random() * 3), wanted: 12, movies: 1200, toMove: 0, moved: 0 },
              sabnzbd: { dlRate: Math.floor(Math.random() * 25_000_000), queue: Math.floor(Math.random() * 5) },
              nzbget: { dlRate: Math.floor(Math.random() * 18_000_000), queue: Math.floor(Math.random() * 4) },
              qbittorrent: { dlRate: Math.floor(Math.random() * 6_000_000), ulRate: Math.floor(Math.random() * 2_000_000), queue: 2 },
              deluge: { dlRate: Math.floor(Math.random() * 4_000_000), ulRate: Math.floor(Math.random() * 1_000_000), queue: 1 },
              overseerr: { pending: 5, available: 17 },
              plex: [
                { user: 'alice', title: 'Demo Movie', pos: 1800, dur: 5400 },
                { user: 'bob', title: 'Demo Episode', pos: 900, dur: 2400 }
              ]
            }
          });

          // Mock "ribbon"
          const sources = ['SABnzbd', 'NZBGet', 'qBittorrent', 'Deluge', 'Sonarr', 'Radarr'] as const;
          const source = sources[Math.floor(Math.random() * sources.length)];
          const pct = Math.min(100, Math.floor(Math.random() * 101));
          const stage = pct < 80 ? 'downloading' : pct < 95 ? 'moving' : 'complete';

          send({
            kind: 'ribbon',
            data: {
              itemKey: `demo-${now}-${Math.random().toString(36).slice(2, 6)}`,
              source,
              stage,
              title: `Demo ${source}`,
              percent: pct,
              ts: now
            }
          });
        }, 1500)
      );

      // Heartbeat to keep proxies happy
      timers.push(
        setInterval(() => {
          if (closed) return;
          try {
            controller.enqueue(new TextEncoder().encode(`:hb ${Date.now()}\n\n`));
          } catch {
            /* ignore */
          }
        }, 15000)
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

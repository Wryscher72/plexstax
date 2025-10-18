// src/routes/api/events/+server.ts
import type { RequestHandler } from './$types';
import { getSonarrSummary, getSonarrQueueRibbons } from '$lib/server/sonarr';

export const GET: RequestHandler = ({ request }) => {
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (obj: unknown) => controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));

      send({ kind: 'hello' });

      const cardsTimer = setInterval(async () => {
        try {
          const sonarr = await getSonarrSummary();
          send({ kind: 'cards', data: { sonarr } });
        } catch {}
      }, 10_000);

      const ribbonTimer = setInterval(async () => {
        try {
          const ribbons = await getSonarrQueueRibbons();
          for (const r of ribbons.slice(0, 10)) send({ kind: 'ribbon', data: r });
        } catch {}
      }, 3_000);

      const close = () => {
        clearInterval(cardsTimer);
        clearInterval(ribbonTimer);
        controller.close();
      };
      request.signal.addEventListener('abort', close);
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

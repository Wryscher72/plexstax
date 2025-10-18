// src/routes/api/events/+server.ts
import type { RequestHandler } from '@sveltejs/kit';
import { gatherCards } from '$lib/server/services';

export const GET: RequestHandler = async () => {
  const stream = new ReadableStream({
    async start(controller) {
      const enc = (obj: any) => controller.enqueue(`data: ${JSON.stringify(obj)}\n\n`);
      const ping = () => controller.enqueue(`:hb ${Date.now()}\n\n`);

      // hello
      enc({ kind: 'hello' });

      // first payload fast
      try {
        const data = await gatherCards();
        enc({ kind: 'cards', data });
      } catch {
        // ignore—UI will update on next tick
      }

      // steady updates
      const t = setInterval(async () => {
        try {
          const data = await gatherCards();
          enc({ kind: 'cards', data });
        } catch {
          // swallow; next tick will try again
        }
        ping();
      }, 5000);

      // cleanup on client disconnect
      // @ts-ignore - globalThis is fine in node
      const signal = (globalThis as any).request?.signal as AbortSignal | undefined;
      signal?.addEventListener('abort', () => {
        clearInterval(t);
        try { controller.close(); } catch {}
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
};

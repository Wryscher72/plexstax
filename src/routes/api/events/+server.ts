import type { RequestHandler } from '@sveltejs/kit';
import { gatherCards } from '$lib/server/services';

export const GET: RequestHandler = ({ request }) => {
  const te = new TextEncoder();
  let timer: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (obj: any) => controller.enqueue(te.encode(`data: ${JSON.stringify(obj)}\n\n`));
      const ping = () => controller.enqueue(te.encode(`:hb ${Date.now()}\n\n`));

      // greet immediately
      send({ kind: 'hello' });

      // one polling tick; DO NOT await this in start()
      const tick = async () => {
        try {
          const data = await gatherCards();
          send({ kind: 'cards', data });
        } catch (e) {
          // keep the stream alive even if one tick fails
          send({ kind: 'error', message: e instanceof Error ? e.message : String(e) });
        }
        ping();
      };

      // fire-and-forget first tick, then interval
      setTimeout(() => { void tick(); }, 0);
      timer = setInterval(() => { void tick(); }, 5000);

      // cleanup on disconnect
      request.signal.addEventListener('abort', () => {
        if (timer) { clearInterval(timer); timer = null; }
        try { controller.close(); } catch {}
      });
    },
    cancel() {
      if (timer) { clearInterval(timer); timer = null; }
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

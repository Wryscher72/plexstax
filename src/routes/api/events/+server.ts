import type { RequestHandler } from '@sveltejs/kit';
import { gatherCards } from '$lib/server/services';

export const GET: RequestHandler = ({ request }) => {
  let timer: ReturnType<typeof setInterval> | null = null;
  const te = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: any) => controller.enqueue(te.encode(`data: ${JSON.stringify(obj)}\n\n`));
      const ping = () => controller.enqueue(te.encode(`:hb ${Date.now()}\n\n`));

      // initial hello
      send({ kind: 'hello' });

      // first payload (don’t fail the stream if upstreams are down)
      try {
        send({ kind: 'cards', data: await gatherCards() });
      } catch {
        // ignore; next tick will try again
      }

      // steady updates
      timer = setInterval(async () => {
        try {
          send({ kind: 'cards', data: await gatherCards() });
        } catch {
          // swallow; keep the stream alive
        }
        ping();
      }, 5000);

      // cleanup on client disconnect; do NOT close() here (Response will handle it)
      request.signal.addEventListener('abort', () => {
        if (timer) { clearInterval(timer); timer = null; }
      });
    },

    // also handle consumer cancel (e.g., client navigates away)
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

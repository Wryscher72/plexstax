import type { RequestHandler } from '@sveltejs/kit';
import { gatherCards } from '$lib/server/services';

export const GET: RequestHandler = ({ request }) => {
  const te = new TextEncoder();
  let timer: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: any) => controller.enqueue(te.encode(`data: ${JSON.stringify(obj)}\n\n`));
      const ping = () => controller.enqueue(te.encode(`:hb ${Date.now()}\n\n`));

      // hello + first payload
      send({ kind: 'hello' });
      try { send({ kind: 'cards', data: await gatherCards() }); } catch {}

      // periodic updates
      timer = setInterval(async () => {
        try { send({ kind: 'cards', data: await gatherCards() }); } catch {}
        ping();
      }, 5000);

      // cleanup on disconnect
      request.signal.addEventListener('abort', () => {
        if (timer) { clearInterval(timer); timer = null; }
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

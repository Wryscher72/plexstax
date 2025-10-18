import type { RequestHandler } from '@sveltejs/kit';
import { gatherCards } from '$lib/server/services';

export const GET: RequestHandler = async () => {
  let timer: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: any) => controller.enqueue(`data: ${JSON.stringify(obj)}\n\n`);
      const ping = () => controller.enqueue(`:hb ${Date.now()}\n\n`);

      // Initial hello + first payload
      send({ kind: 'hello' });
      try { send({ kind: 'cards', data: await gatherCards() }); } catch {}

      // Periodic updates
      timer = setInterval(async () => {
        try { send({ kind: 'cards', data: await gatherCards() }); } catch {}
        ping();
      }, 5000);
    },
    // IMPORTANT: rely on cancel() only; do not call controller.close() elsewhere
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

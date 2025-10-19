import type { RequestHandler } from '@sveltejs/kit';
import { gatherCards } from '$lib/server/services';

const INTERVAL_DEFAULT = Number(process.env.POLL_INTERVAL_MS || 5000);

export const GET: RequestHandler = ({ request }) => {
  const te = new TextEncoder();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (obj: any) => controller.enqueue(te.encode(`data: ${JSON.stringify(obj)}\n\n`));
      const ping = () => controller.enqueue(te.encode(`:hb ${Date.now()}\n\n`));

      send({ kind: 'hello' });

      const loop = async () => {
        if (stopped) return;
        try {
          const data = await gatherCards();
          send({ kind: 'cards', data });
        } catch (e) {
          send({ kind: 'error', message: e instanceof Error ? e.message : String(e) });
        }
        ping();
        if (!stopped) timer = setTimeout(loop, INTERVAL_DEFAULT);
      };

      void loop();

      request.signal.addEventListener('abort', () => {
        stopped = true;
        if (timer) { clearTimeout(timer); timer = null; }
        try { controller.close(); } catch {}
      });
    },
    cancel() {
      stopped = true;
      if (timer) { clearTimeout(timer); timer = null; }
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

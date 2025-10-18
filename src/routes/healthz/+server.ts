import type { RequestHandler } from '@sveltejs/kit';
export const GET: RequestHandler = () => new Response('ok', { headers: { 'Content-Type': 'text/plain' } });

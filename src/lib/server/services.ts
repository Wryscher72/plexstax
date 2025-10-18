// src/lib/server/services.ts
// Minimal back-end fetchers for cards + "not configured" states.

type Ok<T> = { state: 'ok'; data: T };
type NotConfigured = { state: 'not_configured' };
type Err = { state: 'error'; message: string };
export type CardResult<T> = Ok<T> | NotConfigured | Err;

const env = {
  SONARR_URL: process.env.SONARR_URL || '',
  SONARR_API_KEY: process.env.SONARR_API_KEY || '',
  RADARR_URL: process.env.RADARR_URL || '',
  RADARR_API_KEY: process.env.RADARR_API_KEY || '',
  SABNZBD_URL: process.env.SABNZBD_URL || '',
  SABNZBD_API_KEY: process.env.SABNZBD_API_KEY || '',
  NZBGET_URL: process.env.NZBGET_URL || '',
  NZBGET_USER: process.env.NZBGET_USER || '',
  NZBGET_PASS: process.env.NZBGET_PASS || '',
  OVERSEERR_URL: process.env.OVERSEERR_URL || '',
  OVERSEERR_API_KEY: process.env.OVERSEERR_API_KEY || '',
  TAUTULLI_URL: process.env.TAUTULLI_URL || '',
  TAUTULLI_API_KEY: process.env.TAUTULLI_API_KEY || '',
};

function normalizeUrl(u: string): string {
  if (!u) return '';
  if (u.startsWith('http://') || u.startsWith('https://')) return u;
  return `http://${u}`;
}

async function fetchJson<T>(
  url: string,
  init: RequestInit = {},
  timeoutMs = 8000
): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(t);
  }
}

/* -------------------- Sonarr -------------------- */
type SonarrQueue = any[] | { records?: any[]; totalRecords?: number };
type SonarrSeries = any[];

export async function sonarrCard(): Promise<CardResult<{
  queued: number; wanted: number; series: number; link: string;
}>> {
  const url = normalizeUrl(env.SONARR_URL);
  const key = env.SONARR_API_KEY;
  if (!url || !key) return { state: 'not_configured' };
  const h = { 'X-Api-Key': key };

  try {
    const [queue, series, wanted] = await Promise.all([
      fetchJson<SonarrQueue>(`${url}/api/v3/queue`, { headers: h }),
      fetchJson<SonarrSeries>(`${url}/api/v3/series`, { headers: h }),
      // wanted/missing supports paging; we only need totalRecords
      fetchJson<{ totalRecords?: number }>(`${url}/api/v3/wanted/missing?page=1&pageSize=1`, { headers: h })
    ]);

    const queued =
      Array.isArray(queue) ? queue.length :
      (Array.isArray(queue.records) ? queue.records.length : (queue.totalRecords ?? 0));

    return { state: 'ok', data: {
      queued, wanted: wanted.totalRecords ?? 0, series: Array.isArray(series) ? series.length : 0, link: url
    }};
  } catch (e: any) {
    return { state: 'error', message: String(e?.message || e) };
  }
}

/* -------------------- Radarr -------------------- */
export async function radarrCard(): Promise<CardResult<{
  queued: number; movies: number; link: string;
}>> {
  const url = normalizeUrl(env.RADARR_URL);
  const key = env.RADARR_API_KEY;
  if (!url || !key) return { state: 'not_configured' };
  const h = { 'X-Api-Key': key };

  try {
    const [queue, movies] = await Promise.all([
      fetchJson<any[] | { records?: any[]; totalRecords?: number }>(`${url}/api/v3/queue`, { headers: h }),
      fetchJson<any[]>(`${url}/api/v3/movie`, { headers: h }),
    ]);
    const queued =
      Array.isArray(queue) ? queue.length :
      (Array.isArray((queue as any).records) ? (queue as any).records.length : ((queue as any).totalRecords ?? 0));

    return { state: 'ok', data: { queued, movies: Array.isArray(movies) ? movies.length : 0, link: url } };
  } catch (e: any) {
    return { state: 'error', message: String(e?.message || e) };
  }
}

/* -------------------- SABnzbd -------------------- */
export async function sabCard(): Promise<CardResult<{
  queue: number; rateDownBps: number; link: string;
}>> {
  const url = normalizeUrl(env.SABNZBD_URL);
  const key = env.SABNZBD_API_KEY;
  if (!url || !key) return { state: 'not_configured' };

  try {
    const q = await fetchJson<{ queue?: any }>(`${url}/api?mode=queue&output=json&apikey=${encodeURIComponent(key)}`);
    const queue = (q?.queue?.slots || []).length || 0;
    const kbps = parseFloat(q?.queue?.kbpersec || '0'); // KB/s
    const rateDownBps = isFinite(kbps) ? kbps * 1024 : 0;
    return { state: 'ok', data: { queue, rateDownBps, link: url } };
  } catch (e: any) {
    return { state: 'error', message: String(e?.message || e) };
  }
}

/* -------------------- NZBGet -------------------- */
export async function nzbgetCard(): Promise<CardResult<{
  queue: number; rateDownBps: number; link: string;
}>> {
  const url = normalizeUrl(env.NZBGET_URL);
  if (!url) return { state: 'not_configured' };

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (env.NZBGET_USER || env.NZBGET_PASS) {
    const token = Buffer.from(`${env.NZBGET_USER}:${env.NZBGET_PASS}`).toString('base64');
    headers.Authorization = `Basic ${token}`;
  }

  try {
    const status = await fetchJson<{ result?: { DownloadRate?: number } }>(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ method: 'status', params: [], id: 1 })
    });
    const groups = await fetchJson<{ result?: any[] }>(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ method: 'listgroups', params: [0], id: 2 })
    });

    const rateDownBps = status?.result?.DownloadRate ?? 0;
    const queue = Array.isArray(groups?.result) ? groups.result.length : 0;

    return { state: 'ok', data: { queue, rateDownBps, link: url.replace(/\/jsonrpc$/i, '') } };
  } catch (e: any) {
    return { state: 'error', message: String(e?.message || e) };
  }
}

/* -------------------- Overseerr -------------------- */
export async function overseerrCard(): Promise<CardResult<{
  pending: number; available: number; link: string;
}>> {
  const url = normalizeUrl(env.OVERSEERR_URL);
  const key = env.OVERSEERR_API_KEY;
  if (!url || !key) return { state: 'not_configured' };
  const h = { 'X-Api-Key': key };

  // We just need totals; list 1 item and read pageInfo.total
  async function count(filter: string): Promise<number> {
    try {
      const r = await fetchJson<{ pageInfo?: { total?: number } }>(
        `${url}/api/v1/request?take=1&filter=${encodeURIComponent(filter)}`, { headers: h }
      );
      return r?.pageInfo?.total ?? 0;
    } catch {
      return 0;
    }
  }

  try {
    const [pending, available] = await Promise.all([count('pending'), count('available')]);
    return { state: 'ok', data: { pending, available, link: url } };
  } catch (e: any) {
    return { state: 'error', message: String(e?.message || e) };
  }
}

/* -------------------- Tautulli (preferred for Plex now playing) -------------------- */
export async function tautulliCard(): Promise<CardResult<{
  sessions: Array<{ user: string; title: string; progress: number; duration: number; position: number }>;
  total: number; link: string;
}>> {
  const url = normalizeUrl(env.TAUTULLI_URL);
  const key = env.TAUTULLI_API_KEY;
  if (!url || !key) return { state: 'not_configured' };

  try {
    const r = await fetchJson<{ response?: { data?: { sessions?: any[]; stream_count?: number } } }>(
      `${url}/api/v2?apikey=${encodeURIComponent(key)}&cmd=get_activity`
    );
    const data = r?.response?.data || {};
    const sessions = (data.sessions || []).map((s: any) => ({
      user: s.friendly_name || s.username || 'User',
      title: s.full_title || s.title || 'Playing',
      progress: typeof s.progress_percent === 'number' ? Math.max(0, Math.min(100, s.progress_percent)) : 0,
      duration: Number(s.duration) || 0,
      position: Number(s.view_offset) || 0
    }));
    const total = Number(data.stream_count) || sessions.length;
    return { state: 'ok', data: { sessions, total, link: url } };
  } catch (e: any) {
    return { state: 'error', message: String(e?.message || e) };
  }
}

/* -------------------- Aggregate for SSE -------------------- */
export async function gatherCards() {
  const [sonarr, radarr, sab, nzbget, overseerr, tautulli] = await Promise.all([
    sonarrCard(), radarrCard(), sabCard(), nzbgetCard(), overseerrCard(), tautulliCard()
  ]);

  return { sonarr, radarr, sab, nzbget, overseerr, tautulli };
}

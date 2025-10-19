/* src/lib/server/services.ts
   Card data fetchers for PlexStax (Sonarr, Radarr, SABnzbd, NZBGet, Overseerr, Tautulli).
   - Uses a configurable timeout (HTTP_TIMEOUT_MS, default 4s per MVP plan)
   - Uses lighter endpoints / pagination to get counts quickly
   - Never throws: each card returns { state, data?, message? }
*/

type State = 'ok' | 'not_configured' | 'error';
type Card<T> = { state: State; data?: T; message?: string };

const HTTP_TIMEOUT_MS = Number(process.env.HTTP_TIMEOUT_MS || 4000); // 4s default

// ---- env helpers ----
function envOne(...names: string[]) {
  for (const n of names) {
    const v = process.env[n];
    if (typeof v === 'string' && v.trim() !== '') return v.trim();
  }
  return '';
}

const ENV = {
  SONARR_URL: envOne('SONARR_URL'),
  SONARR_KEY: envOne('SONARR_API_KEY'),
  RADARR_URL: envOne('RADARR_URL'),
  RADARR_KEY: envOne('RADARR_API_KEY'),
  SAB_URL: envOne('SABNZBD_URL'),
  SAB_KEY: envOne('SABNZBD_API_KEY'),
  NZBGET_URL: envOne('NZBGET_URL'),
  NZBGET_USER: envOne('NZBGET_USER'),
  NZBGET_PASS: envOne('NZBGET_PASS'),
  OVERSEERR_URL: envOne('OVERSEERR_URL', 'OVERSEER_URL'),
  OVERSEERR_KEY: envOne('OVERSEERR_API_KEY', 'OVERSEER_API_KEY'),
  TAUTULLI_URL: envOne('TAUTULLI_URL'),
  TAUTULLI_KEY: envOne('TAUTULLI_API_KEY')
};

// ---- utils ----
function normalizeUrl(u: string): string {
  if (!u) return '';
  // allow "host:port"
  if (/^[^:/]+\:\d+$/.test(u)) return `http://${u}`;
  // fix common http/https typos: http///, http//, https///, https//
  u = u
    .replace(/^https?:\/\/\//i, (m) => m.startsWith('https') ? 'https://' : 'http://')
    .replace(/^https?:\/\//i, (m) => m); // leave proper schemes as-is
  if (!/^https?:\/\//i.test(u)) u = `http://${u}`;
  return u.replace(/\/+$/,''); // trim trailing slash
}

async function fetchJson<T>(url: string, init: RequestInit = {}, timeoutMs = HTTP_TIMEOUT_MS): Promise<T> {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} ${res.statusText}${txt ? ` — ${txt.slice(0,120)}`:''}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(to);
  }
}

function ok<T>(data: T): Card<T> { return { state: 'ok', data }; }
function notConfigured<T = any>(msg?: string): Card<T> { return { state: 'not_configured', message: msg }; }
function toErr<T = any>(e: unknown): Card<T> {
  const m = e instanceof Error
    ? (/abort/i.test(e.message) ? 'Timed out (increase HTTP_TIMEOUT_MS or check URL/network)' : e.message)
    : String(e);
  return { state: 'error', message: m };
}

// ---------------- Sonarr ----------------
export async function sonarrCard(): Promise<Card<{ queued: number; wanted: number; series: number; link: string }>> {
  const base = normalizeUrl(ENV.SONARR_URL);
  const key = ENV.SONARR_KEY;
  if (!base || !key) return notConfigured('Set SONARR_URL and SONARR_API_KEY');

  const headers = { 'X-Api-Key': key };

  try {
    // quick liveness check
    await fetchJson(`${base}/api/v3/system/status`, { headers }, 2000);

    // use pagination to get counts quickly
    const [queue, wanted, series] = await Promise.all([
      fetchJson<any>(`${base}/api/v3/queue?page=1&pageSize=1`, { headers }),
      fetchJson<any>(`${base}/api/v3/wanted/missing?page=1&pageSize=1`, { headers }),
      fetchJson<any>(`${base}/api/v3/series?page=1&pageSize=1&includeStatistics=false`, { headers })
    ]);

    const queued = typeof queue?.totalRecords === 'number'
      ? queue.totalRecords
      : Array.isArray(queue?.records) ? queue.records.length
      : Array.isArray(queue) ? queue.length : 0;

    const wantedCount = typeof wanted?.totalRecords === 'number'
      ? wanted.totalRecords
      : Array.isArray(wanted?.records) ? wanted.records.length
      : 0;

    const seriesCount = typeof series?.totalRecords === 'number'
      ? series.totalRecords
      : Array.isArray(series) ? series.length
      : 0;

    return ok({ queued, wanted: wantedCount, series: seriesCount, link: base });
  } catch (e) {
    return toErr(e);
  }
}

// ---------------- Radarr ----------------
export async function radarrCard(): Promise<Card<{ queued: number; movies: number; link: string }>> {
  const base = normalizeUrl(ENV.RADARR_URL);
  const key = ENV.RADARR_KEY;
  if (!base || !key) return notConfigured('Set RADARR_URL and RADARR_API_KEY');

  const headers = { 'X-Api-Key': key };

  try {
    await fetchJson(`${base}/api/v3/system/status`, { headers }, 2000);

    const [queue] = await Promise.all([
      fetchJson<any>(`${base}/api/v3/queue?page=1&pageSize=1`, { headers })
    ]);

    // movie count: try paged trick first (if unsupported, fall back to full list)
    let moviesCount = 0;
    try {
      const moviesPaged = await fetchJson<any>(`${base}/api/v3/movie?page=1&pageSize=1`, { headers });
      if (typeof moviesPaged?.totalRecords === 'number') moviesCount = moviesPaged.totalRecords;
    } catch { /* ignore */ }

    if (moviesCount === 0) {
      const all = await fetchJson<any[]>(`${base}/api/v3/movie`, { headers });
      moviesCount = Array.isArray(all) ? all.length : Number((all as any)?.length ?? 0);
    }

    const queued = typeof queue?.totalRecords === 'number'
      ? queue.totalRecords
      : Array.isArray(queue?.records) ? queue.records.length
      : Array.isArray(queue) ? queue.length : 0;

    return ok({ queued, movies: moviesCount, link: base });
  } catch (e) {
    return toErr(e);
  }
}

// ---------------- SABnzbd ----------------
export async function sabCard(): Promise<Card<{ queue: number; rateDownBps: number; link: string }>> {
  const base = normalizeUrl(ENV.SAB_URL);
  const key = ENV.SAB_KEY;
  if (!base || !key) return notConfigured('Set SABNZBD_URL and SABNZBD_API_KEY');

  try {
    const q = await fetchJson<any>(`${base}/api?mode=queue&output=json&apikey=${encodeURIComponent(key)}`);
    const queueCount = Number(q?.queue?.noofslots ?? (Array.isArray(q?.queue?.slots) ? q.queue.slots.length : 0));
    const rateDown = Number(q?.queue?.kbpersec ? q.queue.kbpersec * 1024 : 0);
    return ok({ queue: queueCount, rateDownBps: rateDown, link: base });
  } catch (e) {
    return toErr(e);
  }
}

// ---------------- NZBGet ----------------
export async function nzbgetCard(): Promise<Card<{ queue: number; rateDownBps: number; link: string }>> {
  let base = normalizeUrl(ENV.NZBGET_URL);
  if (!base) return notConfigured('Set NZBGET_URL');

  // JSON-RPC is at /jsonrpc; append if user gave host root
  if (!/\/jsonrpc$/.test(base)) base = `${base}/jsonrpc`;

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (ENV.NZBGET_USER || ENV.NZBGET_PASS) {
      headers['Authorization'] = 'Basic ' + Buffer.from(`${ENV.NZBGET_USER}:${ENV.NZBGET_PASS}`).toString('base64');
    }
    const data = await fetchJson<any>(base, {
      method: 'POST',
      headers,
      body: JSON.stringify({ method: 'status', params: [], id: 1 })
    });
    const s = data?.result || {};
    const queue = Number(s?.QueuedCount ?? 0);
    const rateDownBps = Number(s?.DownloadRate ?? 0);
    return ok({ queue, rateDownBps, link: base.replace(/\/jsonrpc$/,'') });
  } catch (e) {
    return toErr(e);
  }
}

// ---------------- Overseerr ----------------
export async function overseerrCard(): Promise<Card<{ pending: number; available: number; link: string }>> {
  const base = normalizeUrl(ENV.OVERSEERR_URL);
  const key  = ENV.OVERSEERR_KEY;
  if (!base || !key) return notConfigured('Set OVERSEERR_URL and OVERSEERR_API_KEY');

  const headers = { 'X-Api-Key': key };

  try {
    // /status often includes request stats; if not, fall back to filtered calls
    let pending = 0, available = 0;
    try {
      const st = await fetchJson<any>(`${base}/api/v1/status`, { headers });
      pending = Number(st?.requests?.pending ?? 0);
      available = Number(st?.requests?.available ?? 0);
    } catch {
      try {
        const p = await fetchJson<any>(`${base}/api/v1/request?take=1&skip=0&filter=pending`, { headers });
        pending = Number(p?.pageInfo?.results ?? p?.total ?? 0);
      } catch {}
      try {
        const a = await fetchJson<any>(`${base}/api/v1/request?take=1&skip=0&filter=available`, { headers });
        available = Number(a?.pageInfo?.results ?? a?.total ?? 0);
      } catch {}
    }

    return ok({ pending, available, link: base });
  } catch (e) {
    return toErr(e);
  }
}

// ---------------- Tautulli (Plex) ----------------
export async function tautulliCard(): Promise<Card<{ total: number; sessions: Array<{ user: string; progress: number }>; link: string }>> {
  const base = normalizeUrl(ENV.TAUTULLI_URL);
  const key  = ENV.TAUTULLI_KEY;
  if (!base || !key) return notConfigured('Set TAUTULLI_URL and TAUTULLI_API_KEY');

  try {
    const d = await fetchJson<any>(`${base}/api/v2?apikey=${encodeURIComponent(key)}&cmd=get_activity`);
    const sess = Array.isArray(d?.response?.data?.sessions) ? d.response.data.sessions : [];
    const mapped = sess.slice(0, 5).map((s: any) => ({
      user: String(s?.friendly_name || s?.username || 'User'),
      progress: Number(s?.progress_percent || 0)
    }));
    const total = Number(d?.response?.data?.stream_count || mapped.length || 0);
    return ok({ total, sessions: mapped, link: base });
  } catch (e) {
    return toErr(e);
  }
}

// ---------------- gatherCards ----------------
export async function gatherCards() {
  const [sonarr, radarr, sab, nzbget, overseerr, tautulli] = await Promise.all([
    sonarrCard(), radarrCard(), sabCard(), nzbgetCard(), overseerrCard(), tautulliCard()
  ]);
  return { sonarr, radarr, sab, nzbget, overseerr, tautulli };
}

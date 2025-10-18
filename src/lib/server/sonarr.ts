// src/lib/server/sonarr.ts
const SONARR_URL = process.env.SONARR_URL ?? '';
const SONARR_KEY = process.env.SONARR_API_KEY ?? '';

function ok(): boolean {
  return !!SONARR_URL && !!SONARR_KEY;
}

async function api<T>(path: string): Promise<T> {
  if (!ok()) throw new Error('SONARR_URL/SONARR_API_KEY not set');
  const res = await fetch(SONARR_URL + path, { headers: { 'X-Api-Key': SONARR_KEY } });
  if (!res.ok) throw new Error(`Sonarr ${path} -> ${res.status}`);
  return res.json() as Promise<T>;
}

/** Summary numbers for the Sonarr card */
export async function getSonarrSummary() {
  if (!ok()) return { queued: 0, wanted: 0, series: 0, toMove: 0, moved: 0 };

  // Queue (paged)
  type QueueResp = { totalRecords?: number; records?: any[] };
  const q = await api<QueueResp>('/api/v3/queue?page=1&pageSize=100&includeUnknownSeriesItems=true');
  const queued = q.records?.length ?? 0;

  // Wanted (use totalRecords to avoid heavy list)
  type WantedResp = { totalRecords?: number; records?: any[] };
  const w = await api<WantedResp>('/api/v3/wanted/missing?page=1&pageSize=1');
  const wanted = w.totalRecords ?? 0;

  // Series count (robust: try full list; fallback to paged totalRecords if server pages)
  let series = 0;
  try {
    const arr = await api<any[] | { totalRecords?: number }>('/api/v3/series?includeSeasonImages=false');
    if (Array.isArray(arr)) series = arr.length;
    else if (arr && typeof arr === 'object' && typeof (arr as any).totalRecords === 'number')
      series = (arr as any).totalRecords;
  } catch {
    series = 0;
  }

  // Approx "toMove": queue items whose status implies post-processing/import soon
  const toMove = (q.records ?? []).filter((r) => {
    const s: string = String(r.status ?? '').toLowerCase();
    const tds: string = String(r.trackedDownloadState ?? '').toLowerCase();
    return s.includes('complete') || tds.includes('importpending');
  }).length;

  // "moved": imports seen in history in last 60 mins
  let moved = 0;
  try {
    type Hist = { records?: { date?: string; eventType?: string }[] };
    const h = await api<Hist>('/api/v3/history?page=1&pageSize=100&sortKey=date&sortDirection=descending');
    const cutoff = Date.now() - 60 * 60 * 1000;
    moved = (h.records ?? []).filter((r) => {
      const d = r.date ? new Date(r.date).getTime() : 0;
      const et = String(r.eventType ?? '').toLowerCase();
      return d >= cutoff && (et.includes('download') || et.includes('import'));
    }).length;
  } catch {}

  return { queued, wanted, series, toMove, moved };
}

export type Ribbon = {
  itemKey: string;
  source: string;
  stage: 'downloading' | 'moving' | 'complete' | string;
  title?: string;
  percent?: number;
  ts: number;
};

/** Convert Sonarr queue items to ribbon entries */
export async function getSonarrQueueRibbons(): Promise<Ribbon[]> {
  if (!ok()) return [];
  type QueueResp = { records?: any[] };
  const q = await api<QueueResp>('/api/v3/queue?page=1&pageSize=100&includeUnknownSeriesItems=true');

  const ribbons: Ribbon[] = [];
  for (const r of q.records ?? []) {
    const title = r.title || r.series?.title || 'Sonarr Item';
    const size = Number(r.size ?? 0);
    const left = Number(r.sizeleft ?? 0);
    const pct =
      size > 0 ? Math.max(0, Math.min(100, Math.round(((size - left) / size) * 100))) : undefined;

    const status = String(r.status ?? '').toLowerCase();
    const tds = String(r.trackedDownloadState ?? '').toLowerCase();

    let stage: Ribbon['stage'] = 'downloading';
    if (status.includes('complete') || tds.includes('importpending')) stage = 'moving';
    if (left === 0 && size > 0 && status.includes('complete')) stage = 'complete';

    ribbons.push({
      itemKey: `sonarr-${r.id ?? Math.random().toString(36).slice(2)}`,
      source: 'Sonarr',
      stage,
      title,
      percent: pct,
      ts: Math.floor(Date.now() / 1000)
    });
  }
  return ribbons;
}

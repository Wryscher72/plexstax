<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  type State = 'ok' | 'not_configured' | 'error';
  type Card<T = any> = { state: State; data?: T; message?: string };

  let cards: {
    sonarr?: Card<{ queued: number; wanted: number; series: number; link: string }>;
    radarr?: Card<{ queued: number; movies: number; link: string }>;
    sab?: Card<{ queue: number; rateDownBps: number; link: string }>;
    nzbget?: Card<{ queue: number; rateDownBps: number; link: string }>;
    overseerr?: Card<{ pending: number; available: number; link: string }>;
    tautulli?: Card<{ total: number; sessions: Array<{ user: string; progress: number }>; link: string }>;
  } = {};

  let es: EventSource | null = null;

  function fmtRate(bps: number) {
    if (!bps || bps <= 0) return '0 B/s';
    const units = ['B/s', 'KB/s', 'MB/s', 'GB/s', 'TB/s'];
    let i = 0, n = bps;
    while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
    return `${n.toFixed(1)} ${units[i]}`;
  }

  onMount(() => {
    es = new EventSource('/api/events');
    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.kind === 'cards') cards = msg.data;
      } catch {}
    };
  });

  onDestroy(() => { es?.close(); es = null; });
</script>

<style>
  :root { --bg:#0f1115; --card:#171a21; --text:#e6eaf2; --muted:#9aa4b2; --ok:#22c55e; --err:#ef4444; }
  body { background: var(--bg); color: var(--text); }
  main { max-width: 1100px; margin: 0 auto; padding: 16px; }
  h1 { margin: 0 0 12px 0; font-size: 18px; letter-spacing: .3px; }
  .grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; }
  .card { background: var(--card); border:1px solid #222; border-radius: 12px; padding: 12px; }
  .title { font-weight: 600; margin-bottom: 6px; }
  .kv { display:flex; justify-content: space-between; margin: 2px 0; color:#cbd5e1; }
  .chip { display:inline-block; padding:2px 8px; border-radius:999px; font-size:12px; }
  .nc { background:#2a2e37; color:#9aa4b2; }
  .er { background:rgba(239,68,68,.18); color:#fecaca; }
  a { color: inherit; text-decoration: none; }
  .sep { height:1px; background:#222; margin-top:12px; }
  .small { color: var(--muted); font-size: 12px; margin-top: 6px; }
</style>

<main>
  <h1>PlexStax</h1>

  <div class="grid">
    <!-- Sonarr -->
    <a class="card" href={cards.sonarr?.data?.link || '#'} target="_blank" rel="noreferrer noopener">
      <div class="title">Sonarr</div>
      {#if cards.sonarr?.state === 'ok'}
        <div class="kv"><span>Queued</span><span>{cards.sonarr.data.queued}</span></div>
        <div class="kv"><span>Wanted</span><span>{cards.sonarr.data.wanted}</span></div>
        <div class="kv"><span>Series</span><span>{cards.sonarr.data.series}</span></div>
      {:else if cards.sonarr?.state === 'not_configured'}
        <span class="chip nc">Not configured</span>
        <div class="small">Set SONARR_URL and SONARR_API_KEY in the template.</div>
      {:else}
        <span class="chip er">Error</span>
        <div class="small">{cards.sonarr?.message || 'Failed to reach Sonarr'}</div>
      {/if}
    </a>

    <!-- Radarr -->
    <a class="card" href={cards.radarr?.data?.link || '#'} target="_blank" rel="noreferrer noopener">
      <div class="title">Radarr</div>
      {#if cards.radarr?.state === 'ok'}
        <div class="kv"><span>Queued</span><span>{cards.radarr.data.queued}</span></div>
        <div class="kv"><span>Movies</span><span>{cards.radarr.data.movies}</span></div>
      {:else if cards.radarr?.state === 'not_configured'}
        <span class="chip nc">Not configured</span>
        <div class="small">Set RADARR_URL and RADARR_API_KEY.</div>
      {:else}
        <span class="chip er">Error</span>
        <div class="small">{cards.radarr?.message || 'Failed to reach Radarr'}</div>
      {/if}
    </a>

    <!-- SABnzbd -->
    <a class="card" href={cards.sab?.data?.link || '#'} target="_blank" rel="noreferrer noopener">
      <div class="title">SABnzbd</div>
      {#if cards.sab?.state === 'ok'}
        <div class="kv"><span>Queue</span><span>{cards.sab.data.queue}</span></div>
        <div class="kv"><span>Down</span><span>{fmtRate(cards.sab.data.rateDownBps)}</span></div>
      {:else if cards.sab?.state === 'not_configured'}
        <span class="chip nc">Not configured</span>
        <div class="small">Set SABNZBD_URL and SABNZBD_API_KEY.</div>
      {:else}
        <span class="chip er">Error</span>
        <div class="small">{cards.sab?.message || 'Failed to reach SABnzbd'}</div>
      {/if}
    </a>

    <!-- NZBGet -->
    <a class="card" href={cards.nzbget?.data?.link || '#'} target="_blank" rel="noreferrer noopener">
      <div class="title">NZBGet</div>
      {#if cards.nzbget?.state === 'ok'}
        <div class="kv"><span>Queue</span><span>{cards.nzbget.data.queue}</span></div>
        <div class="kv"><span>Down</span><span>{fmtRate(cards.nzbget.data.rateDownBps)}</span></div>
      {:else if cards.nzbget?.state === 'not_configured'}
        <span class="chip nc">Not configured</span>
        <div class="small">Set NZBGET_URL (and NZBGET_USER/NZBGET_PASS if needed).</div>
      {:else}
        <span class="chip er">Error</span>
        <div class="small">{cards.nzbget?.message || 'Failed to reach NZBGet'}</div>
      {/if}
    </a>

    <!-- Overseerr -->
    <a class="card" href={cards.overseerr?.data?.link || '#'} target="_blank" rel="noreferrer noopener">
      <div class="title">Overseerr</div>
      {#if cards.overseerr?.state === 'ok'}
        <div class="kv"><span>Pending</span><span>{cards.overseerr.data.pending}</span></div>
        <div class="kv"><span>Available</span><span>{cards.overseerr.data.available}</span></div>
      {:else if cards.overseerr?.state === 'not_configured'}
        <span class="chip nc">Not configured</span>
        <div class="small">Set OVERSEERR_URL and OVERSEERR_API_KEY.</div>
      {:else}
        <span class="chip er">Error</span>
        <div class="small">{cards.overseerr?.message || 'Failed to reach Overseerr'}</div>
      {/if}
    </a>

    <!-- Plex (via Tautulli) -->
    <a class="card" href={cards.tautulli?.data?.link || '#'} target="_blank" rel="noreferrer noopener">
      <div class="title">Plex (via Tautulli)</div>
      {#if cards.tautulli?.state === 'ok'}
        <div class="kv"><span>Streams</span><span>{cards.tautulli.data.total}</span></div>
        {#each (cards.tautulli.data.sessions || []).slice(0,5) as s}
          <div class="kv"><span>{s.user}</span><span>{Math.round(s.progress)}%</span></div>
        {/each}
      {:else if cards.tautulli?.state === 'not_configured'}
        <span class="chip nc">Not configured</span>
        <div class="small">Set TAUTULLI_URL and TAUTULLI_API_KEY.</div>
      {:else}
        <span class="chip er">Error</span>
        <div class="small">{cards.tautulli?.message || 'Failed to reach Tautulli'}</div>
      {/if}
    </a>
  </div>

  <div class="sep"></div>
  <div class="small">Live updates every 5s. Cards are clickable.</div>
</main>

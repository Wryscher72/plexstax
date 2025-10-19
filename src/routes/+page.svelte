<script lang="ts">
  import { onMount } from 'svelte';

  type CardState<T=any> =
    | { state: 'ok'; data: T; link?: string }
    | { state: 'error'; message: string }
    | { state: 'not_configured'; message: string };

  type CardsPayload = {
    sonarr: CardState<{ queued:number; wanted:number; series:number }>;
    radarr: CardState<{ queued:number; movies:number }>;
    sab:    CardState<{ queue:number; rateDownBps:number; link:string }>;
    nzbget: CardState<{ queue:number; rateDownBps:number; link:string }>;
    overseerr: CardState<{ pending:number; available:number; link:string }>;
    tautulli:  CardState<{ total:number; sessions:any[]; link:string }>;
  };

  let cards: CardsPayload | null = null;

  function openLink(link?: string){
    if (!link) return;
    window.open(link, '_blank', 'noopener,noreferrer');
  }

  function fmtBps(n: number){
    if (!n || n <= 0) return '0 B/s';
    const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    let i = 0, v = n;
    while (v >= 1024 && i < units.length-1){ v /= 1024; i++; }
    return `${v.toFixed(v >= 100 ? 0 : 1)} ${units[i]}`;
  }

  onMount(() => {
    // client-only SSE
    const es = new EventSource('/api/events');
    es.onmessage = (e) => {
      try {
        const obj = JSON.parse(e.data);
        if (obj?.kind === 'cards') cards = obj.data as CardsPayload;
      } catch { /* ignore */ }
    };
    // no special close handling; Svelte will close on unmount
    return () => es.close();
  });
</script>

<h1>PlexStax</h1>

<div class="grid">
  <!-- Sonarr -->
  <div class="card" style="grid-column: span 4;">
    <h3>Sonarr</h3>
    {#if cards?.sonarr?.state === 'ok'}
      <div class="kvs">
        <div class="label">Queued</div><div class="value">{cards.sonarr.data.queued}</div>
        <div class="label">Wanted</div><div class="value">{cards.sonarr.data.wanted}</div>
        <div class="label">Series</div><div class="value">{cards.sonarr.data.series}</div>
      </div>
    {:else if cards?.sonarr?.state === 'not_configured'}
      <div class="error">{cards.sonarr.message}</div>
    {:else if cards?.sonarr?.state === 'error'}
      <div class="error">{cards.sonarr.message}</div>
    {/if}
  </div>

  <!-- Radarr -->
  <div class="card" style="grid-column: span 4;">
    <h3>Radarr</h3>
    {#if cards?.radarr?.state === 'ok'}
      <div class="kvs">
        <div class="label">Queued</div><div class="value">{cards.radarr.data.queued}</div>
        <div class="label">Movies</div><div class="value">{cards.radarr.data.movies}</div>
      </div>
    {:else if cards?.radarr?.state === 'not_configured'}
      <div class="error">{cards.radarr.message}</div>
    {:else if cards?.radarr?.state === 'error'}
      <div class="error">{cards.radarr.message}</div>
    {/if}
  </div>

  <!-- SABnzbd -->
  <div class="card click" style="grid-column: span 4;" on:click={() => openLink(cards?.sab?.state==='ok' ? cards?.sab?.data?.link : undefined)}>
    <h3>SABnzbd</h3>
    {#if cards?.sab?.state === 'ok'}
      <div class="kvs">
        <div class="label">Queue</div><div class="value">{cards.sab.data.queue}</div>
        <div class="label">Down</div><div class="value">{fmtBps(cards.sab.data.rateDownBps)}</div>
      </div>
    {:else if cards?.sab?.state === 'not_configured'}
      <div class="error">{cards.sab.message}</div>
    {:else if cards?.sab?.state === 'error'}
      <div class="error">{cards.sab.message}</div>
    {/if}
  </div>

  <!-- NZBGet -->
  <div class="card click" style="grid-column: span 4;" on:click={() => openLink(cards?.nzbget?.state==='ok' ? cards?.nzbget?.data?.link : undefined)}>
    <h3>NZBGet</h3>
    {#if cards?.nzbget?.state === 'ok'}
      <div class="kvs">
        <div class="label">Queue</div><div class="value">{cards.nzbget.data.queue}</div>
        <div class="label">Down</div><div class="value">{fmtBps(cards.nzbget.data.rateDownBps)}</div>
      </div>
    {:else if cards?.nzbget?.state === 'not_configured'}
      <div class="error">{cards.nzbget.message}</div>
    {:else if cards?.nzbget?.state === 'error'}
      <div class="error">{cards.nzbget.message}</div>
    {/if}
  </div>

  <!-- Overseerr -->
  <div class="card click" style="grid-column: span 4;" on:click={() => openLink(cards?.overseerr?.state==='ok' ? cards?.overseerr?.data?.link : undefined)}>
    <h3>Overseerr</h3>
    {#if cards?.overseerr?.state === 'ok'}
      <div class="kvs">
        <div class="label">Pending</div><div class="value">{cards.overseerr.data.pending}</div>
        <div class="label">Available</div><div class="value">{cards.overseerr.data.available}</div>
      </div>
    {:else if cards?.overseerr?.state === 'not_configured'}
      <div class="error">{cards.overseerr.message}</div>
    {:else if cards?.overseerr?.state === 'error'}
      <div class="error">{cards.overseerr.message}</div>
    {/if}
  </div>

  <!-- Tautulli -->
  <div class="card click" style="grid-column: span 4;" on:click={() => openLink(cards?.tautulli?.state==='ok' ? cards?.tautulli?.data?.link : undefined)}>
    <h3>Plex (via Tautulli)</h3>
    {#if cards?.tautulli?.state === 'ok'}
      <div class="kvs">
        <div class="label">Streams</div><div class="value">{cards.tautulli.data.total}</div>
      </div>
    {:else if cards?.tautulli?.state === 'not_configured'}
      <div class="error">{cards.tautulli.message}</div>
    {:else if cards?.tautulli?.state === 'error'}
      <div class="error">{cards.tautulli.message}</div>
    {/if}
  </div>
</div>

<p class="note">Live updates every 5s. Cards are clickable.</p>

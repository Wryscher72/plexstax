<script lang="ts">
  import { onMount } from 'svelte';
  import SonarrIcon from '$lib/icons/SonarrIcon.svelte';
  import RadarrIcon from '$lib/icons/RadarrIcon.svelte';
  import SabIcon from '$lib/icons/SabIcon.svelte';
  import NzbgetIcon from '$lib/icons/NzbgetIcon.svelte';
  import OverseerrIcon from '$lib/icons/OverseerrIcon.svelte';
  import TautulliIcon from '$lib/icons/TautulliIcon.svelte';

  type CardState<T=any> =
    | { state: 'ok'; data: T; link?: string }
    | { state: 'error'; message: string }
    | { state: 'not_configured'; message: string };

  type CardsPayload = {
    sonarr:   CardState<{ queued:number; wanted:number; series:number }>;
    radarr:   CardState<{ queued:number; movies:number }>;
    sab:      CardState<{ queue:number; rateDownBps:number; link:string }>;
    nzbget:   CardState<{ queue:number; rateDownBps:number; link:string }>;
    overseerr:CardState<{ pending:number; available:number; link:string }>;
    tautulli: CardState<{ total:number; sessions:any[]; link:string }>;
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

  function ratePercentFromBps(n: number){
    const cap = 100 * 1024 * 1024; // 100 MB/s visual cap
    const pct = Math.max(0, Math.min(1, n / cap));
    return Math.round(pct * 100);
  }

  onMount(() => {
    const es = new EventSource('/api/events');
    es.onmessage = (e) => {
      try {
        const obj = JSON.parse(e.data);
        if (obj?.kind === 'cards') cards = obj.data as CardsPayload;
      } catch { /* ignore */ }
    };
    return () => es.close();
  });
</script>

<h1>PlexStax</h1>

<div class="grid">
  <!-- Sonarr -->
  <div class="card" style="grid-column: span 4;">
    <div class="header">
      <SonarrIcon class="ico sonarr"/>
      <span class="badge badge-sonarr">Sonarr</span>
      <div class="title">Sonarr</div>
    </div>
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
    <div class="header">
      <RadarrIcon class="ico radarr"/>
      <span class="badge badge-radarr">Radarr</span>
      <div class="title">Radarr</div>
    </div>
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
    <div class="header">
      <SabIcon class="ico sab"/>
      <span class="badge badge-sab">SABnzbd</span>
      <div class="title">SABnzbd</div>
    </div>
    {#if cards?.sab?.state === 'ok'}
      <div class="kvs">
        <div class="label">Queue</div><div class="value">{cards.sab.data.queue}</div>
        <div class="label">Down</div><div class="value">{fmtBps(cards.sab.data.rateDownBps)}</div>
      </div>
      <div class="meter" aria-hidden="true">
        <div class="fill" style="background:var(--sab); width:{ratePercentFromBps(cards.sab.data.rateDownBps)}%"></div>
      </div>
    {:else if cards?.sab?.state === 'not_configured'}
      <div class="error">{cards.sab.message}</div>
    {:else if cards?.sab?.state === 'error'}
      <div class="error">{cards.sab.message}</div>
    {/if}
  </div>

  <!-- NZBGet -->
  <div class="card click" style="grid-column: span 4;" on:click={() => openLink(cards?.nzbget?.state==='ok' ? cards?.nzbget?.data?.link : undefined)}>
    <div class="header">
      <NzbgetIcon class="ico nzb"/>
      <span class="badge badge-nzb">NZBGet</span>
      <div class="title">NZBGet</div>
    </div>
    {#if cards?.nzbget?.state === 'ok'}
      <div class="kvs">
        <div class="label">Queue</div><div class="value">{cards.nzbget.data.queue}</div>
        <div class="label">Down</div><div class="value">{fmtBps(cards.nzbget.data.rateDownBps)}</div>
      </div>
      <div class="meter" aria-hidden="true">
        <div class="fill" style="background:var(--nzb); width:{ratePercentFromBps(cards.nzbget.data.rateDownBps)}%"></div>
      </div>
    {:else if cards?.nzbget?.state === 'not_configured'}
      <div class="error">{cards.nzbget.message}</div>
    {:else if cards?.nzbget?.state === 'error'}
      <div class="error">{cards.nzbget.message}</div>
    {/if}
  </div>

  <!-- Overseerr -->
  <div class="card click" style="grid-column: span 4;" on:click={() => openLink(cards?.overseerr?.state==='ok' ? cards?.overseerr?.data?.link : undefined)}>
    <div class="header">
      <OverseerrIcon class="ico over"/>
      <span class="badge badge-over">Overseerr</span>
      <div class="title">Overseerr</div>
    </div>
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
    <div class="header">
      <TautulliIcon class="ico taut"/>
      <span class="badge badge-taut">Tautulli</span>
      <div class="title">Plex (via Tautulli)</div>
    </div>
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

<style>
  .header{ display:flex; align-items:center; gap:8px; margin:2px 0 10px; }
  .title{ font-size:14px; font-weight:700; letter-spacing:.3px; }

  .ico{ width:18px; height:18px; }
  .ico.sonarr{ color:var(--sonarr); }
  .ico.radarr{ color:var(--radarr); }
  .ico.sab{    color:var(--sab); }
  .ico.nzb{    color:var(--nzb); }
  .ico.over{   color:var(--over); }
  .ico.taut{   color:var(--taut); }
</style>

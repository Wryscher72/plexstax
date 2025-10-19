<script lang="ts">
  import { onMount } from 'svelte';
  import Card from '$lib/components/Card.svelte';
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
    sonarr:   CardState<{ queued:number; wanted:number; series:number; link:string }>;
    radarr:   CardState<{ queued:number; movies:number; link:string }>;
    sab:      CardState<{ queue:number; rateDownBps:number; link:string }>;
    nzbget:   CardState<{ queue:number; rateDownBps:number; link:string }>;
    overseerr:CardState<{ pending:number; available:number; link:string }>;
    tautulli: CardState<{ total:number; sessions:any[]; link:string }>;
  };

  let cards: CardsPayload | null = null;

  function fmtBps(n: number){
    if (!n || n <= 0) return '0 B/s';
    const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    let i = 0, v = n;
    while (v >= 1024 && i < units.length-1){ v /= 1024; i++; }
    return `${v.toFixed(v >= 100 ? 0 : 1)} ${units[i]}`;
  }
  function ratePercentFromBps(n: number){
    const cap = 100 * 1024 * 1024; // 100 MB/s visual cap
    const pct = Math.max(0, Math.min(1, (n||0) / cap));
    return Math.round(pct * 100);
  }

  onMount(() => {
    const es = new EventSource('/api/events');
    es.onmessage = (e) => {
      try {
        const obj = JSON.parse(e.data);
        if (obj?.kind === 'cards') cards = obj.data as CardsPayload;
      } catch {}
    };
    return () => es.close();
  });

  const cardsConfig = [
    {
      id: 'sonarr', title: 'Sonarr', icon: SonarrIcon, iconClass: 'sonarr', badgeClass: 'badge-sonarr',
      getState: () => cards?.sonarr?.state,
      getMessage: () => (cards?.sonarr as any)?.message,
      getLink: () => (cards?.sonarr?.state === 'ok') ? (cards?.sonarr as any)?.data?.link : undefined,
      kvs: () => cards?.sonarr?.state === 'ok' ? [
        { label:'Queued', value: (cards!.sonarr as any).data.queued },
        { label:'Wanted', value: (cards!.sonarr as any).data.wanted },
        { label:'Series', value: (cards!.sonarr as any).data.series }
      ] : []
    },
    {
      id: 'radarr', title: 'Radarr', icon: RadarrIcon, iconClass: 'radarr', badgeClass: 'badge-radarr',
      getState: () => cards?.radarr?.state,
      getMessage: () => (cards?.radarr as any)?.message,
      getLink: () => (cards?.radarr?.state === 'ok') ? (cards?.radarr as any)?.data?.link : undefined,
      kvs: () => cards?.radarr?.state === 'ok' ? [
        { label:'Queued', value: (cards!.radarr as any).data.queued },
        { label:'Movies', value: (cards!.radarr as any).data.movies }
      ] : []
    },
    {
      id: 'sab', title: 'SABnzbd', icon: SabIcon, iconClass: 'sab', badgeClass: 'badge-sab',
      getState: () => cards?.sab?.state,
      getMessage: () => (cards?.sab as any)?.message,
      getLink: () => (cards?.sab?.state === 'ok') ? (cards?.sab as any)?.data?.link : undefined,
      kvs: () => cards?.sab?.state === 'ok' ? [
        { label:'Queue', value: (cards!.sab as any).data.queue },
        { label:'Down', value: fmtBps((cards!.sab as any).data.rateDownBps) }
      ] : [],
      meter: () => cards?.sab?.state === 'ok' ? ratePercentFromBps((cards!.sab as any).data.rateDownBps) : undefined,
      meterColor: 'var(--sab)'
    },
    {
      id: 'nzbget', title: 'NZBGet', icon: NzbgetIcon, iconClass: 'nzb', badgeClass: 'badge-nzb',
      getState: () => cards?.nzbget?.state,
      getMessage: () => (cards?.nzbget as any)?.message,
      getLink: () => (cards?.nzbget?.state === 'ok') ? (cards?.nzbget as any)?.data?.link : undefined,
      kvs: () => cards?.nzbget?.state === 'ok' ? [
        { label:'Queue', value: (cards!.nzbget as any).data.queue },
        { label:'Down', value: fmtBps((cards!.nzbget as any).data.rateDownBps) }
      ] : [],
      meter: () => cards?.nzbget?.state === 'ok' ? ratePercentFromBps((cards!.nzbget as any).data.rateDownBps) : undefined,
      meterColor: 'var(--nzb)'
    },
    {
      id: 'overseerr', title: 'Overseerr', icon: OverseerrIcon, iconClass: 'over', badgeClass: 'badge-over',
      getState: () => cards?.overseerr?.state,
      getMessage: () => (cards?.overseerr as any)?.message,
      getLink: () => (cards?.overseerr?.state === 'ok') ? (cards?.overseerr as any)?.data?.link : undefined,
      kvs: () => cards?.overseerr?.state === 'ok' ? [
        { label:'Pending', value: (cards!.overseerr as any).data.pending },
        { label:'Available', value: (cards!.overseerr as any).data.available }
      ] : []
    },
    {
      id: 'tautulli', title: 'Plex (via Tautulli)', icon: TautulliIcon, iconClass: 'taut', badgeClass: 'badge-taut',
      getState: () => cards?.tautulli?.state,
      getMessage: () => (cards?.tautulli as any)?.message,
      getLink: () => (cards?.tautulli?.state === 'ok') ? (cards?.tautulli as any)?.data?.link : undefined,
      kvs: () => cards?.tautulli?.state === 'ok' ? [
        { label:'Streams', value: (cards!.tautulli as any).data.total }
      ] : []
    }
  ] as const;
</script>

<h1>PlexStax</h1>

<div class="grid">
  {#each cardsConfig as c}
    <Card
      style="grid-column: span 4;"
      title={c.title}
      icon={c.icon}
      iconClass={c.iconClass}
      badgeClass={c.badgeClass}
      state={(c.getState() as any) ?? 'not_configured'}
      message={(c.getMessage() as any) ?? ''}
      link={c.getLink()}
      kvs={c.kvs()}
      meterPct={typeof (c as any).meter === 'function' ? (c as any).meter() : undefined}
      meterColor={(c as any).meterColor}
    />
  {/each}
</div>

<p class="note">Live updates every 5s. Cards are clickable.</p>

<style>
  .grid{ display:grid; grid-template-columns: repeat(12, 1fr); gap:14px; }
  @media (max-width: 900px){ .grid{ grid-template-columns: repeat(6, 1fr); } }
  @media (max-width: 640px){ .grid{ grid-template-columns: repeat(2, 1fr); } }
  .note{ margin-top:16px; color:var(--muted); border-top:1px solid var(--edge); padding-top:10px; }
</style>

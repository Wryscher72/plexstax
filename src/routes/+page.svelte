<script lang="ts">
	import { onMount } from 'svelte';

	type Ribbon = {
	itemKey: string;
	source: string;
	stage: string;
	title?: string;
	percent?: number;
	ts: number;
	};

	// top cards data (very light typing for now)
	let cards: any = {
	sonarr: {}, radarr: {}, sabnzbd: {}, nzbget: {}, qbittorrent: {}, deluge: {}, plex: [], overseerr: {}
	};

	// bottom 3 columns (each capped at 10 live items)
	const dlCols: Ribbon[] = [];     // Downloaders (SAB, NZBGet, qBittorrent, Deluge)
	const sonarrCol: Ribbon[] = [];  // Sonarr
	const radarrCol: Ribbon[] = [];  // Radarr

	const isDownloader = (s: string) => /sab|nzb|get|qbit|deluge/i.test(s);

	function pushLimited(arr: Ribbon[], item: Ribbon, cap = 10) {
	const i = arr.findIndex((r) => r.itemKey === item.itemKey);
	if (i >= 0) arr[i] = item; else arr.unshift(item);
	if (arr.length > cap) arr.splice(cap);
	}

	onMount(() => {
	const es = new EventSource('/api/events');

	es.onmessage = (ev) => {
	try {
	const msg = JSON.parse(ev.data);

	if (msg.kind === 'cards') {
	cards = msg.data;
	} else if (msg.kind === 'ribbon') {
	const r: Ribbon = msg.data;
	if (/sonarr/i.test(r.source))       pushLimited(sonarrCol, r);
	else if (/radarr/i.test(r.source))  pushLimited(radarrCol, r);
	else if (isDownloader(r.source))    pushLimited(dlCols, r);
	}
	} catch (e) {
	console.error('bad SSE message', ev.data);
	}
	};

	return () => es.close();
	});
</script>

<!-- Top: cards grid -->
<section class="cards">
	<!-- Sonarr -->
	<div class="card">
		<header>Sonarr</header>
		<div class="kv">
			<span>Queued</span>
			<b>{cards.sonarr?.queued ?? 0}</b>
		</div>
		<div class="kv">
			<span>To move</span>
			<b>{cards.sonarr?.toMove ?? 0}</b>
		</div>
		<div class="kv">
			<span>Moved</span>
			<b>{cards.sonarr?.moved ?? 0}</b>
		</div>
		<div class="kv">
			<span>Wanted</span>
			<b>{cards.sonarr?.wanted ?? 0}</b>
		</div>
		<div class="kv">
			<span>Series</span>
			<b>{cards.sonarr?.series ?? 0}</b>
		</div>
	</div>

	<!-- Radarr -->
	<div class="card">
		<header>Radarr</header>
		<div class="kv">
			<span>Queued</span>
			<b>{cards.radarr?.queued ?? 0}</b>
		</div>
		<div class="kv">
			<span>To move</span>
			<b>{cards.radarr?.toMove ?? 0}</b>
		</div>
		<div class="kv">
			<span>Moved</span>
			<b>{cards.radarr?.moved ?? 0}</b>
		</div>
		<div class="kv">
			<span>Wanted</span>
			<b>{cards.radarr?.wanted ?? 0}</b>
		</div>
		<div class="kv">
			<span>Movies</span>
			<b>{cards.radarr?.movies ?? 0}</b>
		</div>
	</div>

	<!-- SAB -->
	<div class="card">
		<header>SABnzbd</header>
		<div class="kv">
			<span>DL</span>
			<b>{Math.round((cards.sabnzbd?.dlRate ?? 0) / 1_000_000)} MB/s</b>
		</div>
		<div class="kv">
			<span>Queue</span>
			<b>{cards.sabnzbd?.queue ?? 0}</b>
		</div>
	</div>

	<!-- qBittorrent -->
	<div class="card">
		<header>qBittorrent</header>
		<div class="kv">
			<span>DL</span>
			<b>{Math.round((cards.qbittorrent?.dlRate ?? 0) / 1_000_000)} MB/s</b>
		</div>
		<div class="kv">
			<span>UL</span>
			<b>{Math.round((cards.qbittorrent?.ulRate ?? 0) / 1_000_000)} MB/s</b>
		</div>
		<div class="kv">
			<span>Queue</span>
			<b>{cards.qbittorrent?.queue ?? 0}</b>
		</div>
	</div>

	<!-- NZBGet -->
	<div class="card">
		<header>NZBGet</header>
		<div class="kv">
			<span>DL</span>
			<b>{Math.round((cards.nzbget?.dlRate ?? 0) / 1_000_000)} MB/s</b>
		</div>
		<div class="kv">
			<span>Queue</span>
			<b>{cards.nzbget?.queue ?? 0}</b>
		</div>
	</div>

	<!-- Deluge -->
	<div class="card">
		<header>Deluge</header>
		<div class="kv">
			<span>DL</span>
			<b>{Math.round((cards.deluge?.dlRate ?? 0) / 1_000_000)} MB/s</b>
		</div>
		<div class="kv">
			<span>UL</span>
			<b>{Math.round((cards.deluge?.ulRate ?? 0) / 1_000_000)} MB/s</b>
		</div>
		<div class="kv">
			<span>Queue</span>
			<b>{cards.deluge?.queue ?? 0}</b>
		</div>
	</div>

	<!-- Overseerr -->
	<div class="card">
		<header>Overseerr</header>
		<div class="kv">
			<span>Pending</span>
			<b>{cards.overseerr?.pending ?? 0}</b>
		</div>
		<div class="kv">
			<span>Available</span>
			<b>{cards.overseerr?.available ?? 0}</b>
		</div>
	</div>

	<!-- Plex (top 5 now playing) -->
	<div class="card">
		<header>Plex (Now Playing)</header>
		{#each (cards.plex ?? []).slice(0,5) as p}
		<div class="progress">
			<div class="title">{p.user}: {p.title}</div>
			<div class="bar">
				<div class="fill" style={"width:${Math.min(100, Math.round((p.pos / Math.max(1, p.dur)) * 100))}%"}></div>
			</div>
		</div>
		{/each}
	</div>
</section>

<!-- Bottom: three ribbon columns -->
<section class="ribbons">
	<div class="col">
		<h3>Downloaders</h3>
		{#each dlCols as r (r.itemKey)}
		<div class="rib">
			<b>{r.source}</b> — {r.title}
			{#if r.stage === 'downloading'}
			<div class="bar">
				<div class="fill" style={"width:${r.percent ?? 0}%"}></div>
			</div>
			{:else if r.stage === 'moving'}
			<span class="tag">Moving…</span>
			{:else if r.stage === 'complete'}
			<span class="tag ok">Complete ✓</span>
			{/if}
		</div>
		{/each}
	</div>

	<div class="col">
		<h3>Sonarr</h3>
		{#each sonarrCol as r (r.itemKey)}
		<div class="rib">
			<b>{r.source}</b> — {r.title} <span class="tag">{r.stage}</span>
		</div>
		{/each}
	</div>

	<div class="col">
		<h3>Radarr</h3>
		{#each radarrCol as r (r.itemKey)}
		<div class="rib">
			<b>{r.source}</b> — {r.title} <span class="tag">{r.stage}</span>
		</div>
		{/each}
	</div>
</section>

<style>
	:root { --bg:#0f1115; --card:#171a21; --ink:#e6eaf2; --muted:#9aa4b2; --ok:#22c55e; }
	:global(body){ margin:0; background:var(--bg); color:var(--ink); font:14px/1.4 system-ui,Segoe UI,Roboto,Helvetica,Arial; }
	.cards{ display:grid; gap:12px; grid-template-columns: repeat(auto-fit,minmax(220px,1fr)); padding:16px; max-width:1280px; margin:0 auto; }
	.card{ background:var(--card); border:1px solid #222; border-radius:14px; padding:12px; box-shadow:0 4px 12px rgba(0,0,0,.25); }
	.card header{ font-weight:700; margin-bottom:8px; }
	.kv{ display:flex; justify-content:space-between; color:var(--muted); }
	.progress .title{ color:var(--muted); font-size:12px; }
	.bar{ height:8px; background:#0b0d11; border:1px solid #222; border-radius:999px; overflow:hidden; margin-top:4px; }
	.fill{ height:100%; background:linear-gradient(90deg,#1b6aff,#10b981); }
	.ribbons{ display:grid; gap:12px; grid-template-columns: repeat(3, 1fr); padding:0 16px 24px; max-width:1280px; margin:0 auto; }
	.ribbons h3{ color:var(--muted); font-weight:600; }
	.col{ display:flex; flex-direction:column; gap:8px; }
	.rib{ background:var(--card); border:1px solid #222; border-radius:12px; padding:8px 10px; }
	.tag{ margin-left:6px; color:#cbd5e1; }
	.tag.ok{ color:var(--ok); font-weight:700; }
</style>

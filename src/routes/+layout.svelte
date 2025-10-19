<script>
  // no-op; purely for layout + global styles
</script>

<svelte:head>
  <title>PlexStax</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<div class="page">
  <slot />
</div>

<style>
  :root{
    --bg:#0f1115; --card:#171a21; --text:#e6eaf2; --muted:#9aa4b2;
    --accent:#60a5fa; --ok:#22c55e; --danger:#ef4444;
    --edge:#20242d;

    /* Service brand colors */
    --sonarr:#00a2ff;   /* Sonarr blue */
    --radarr:#f6c343;   /* Radarr yellow */
    --sab:#f7df1e;      /* SABnzbd yellow */
    --nzb:#4ade80;      /* NZBGet green */
    --over:#8b5cf6;     /* Overseerr purple */
    --taut:#ff5a5f;     /* Tautulli red */
  }

  *{ box-sizing:border-box }
  html,body{ height:100% }
  body{
    margin:0; background:var(--bg); color:var(--text);
    font:14px/1.5 system-ui,Segoe UI,Roboto,Helvetica,Arial
  }

  .page{
    max-width:1200px;
    margin:0 auto;
    padding:18px 16px 40px;
  }

  h1{
    margin:0 0 16px;
    font-size:22px;
    letter-spacing:.2px;
  }

  /* Shared card styles (Card.svelte also contains scoped styles) */
  .kvs .label{ color:var(--muted) }
  .error{ color:var(--danger); font-weight:600; font-size:12px; }

  /* Icon color helpers */
  .ico.sonarr{ color:var(--sonarr); }
  .ico.radarr{ color:var(--radarr); }
  .ico.sab{    color:var(--sab); }
  .ico.nzb{    color:var(--nzb); }
  .ico.over{   color:var(--over); }
  .ico.taut{   color:var(--taut); }
</style>

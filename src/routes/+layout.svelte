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
  }

  *{ box-sizing:border-box }
  html,body{ height:100% }
  body{ margin:0; background:var(--bg); color:var(--text);
        font:14px/1.5 system-ui,Segoe UI,Roboto,Helvetica,Arial }

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

  .grid{
    display:grid;
    grid-template-columns: repeat(12, 1fr);
    gap:14px;
  }

  /* Cards */
  .card{
    background:var(--card);
    border:1px solid var(--edge);
    border-radius:14px;
    box-shadow:0 4px 14px rgba(0,0,0,.35);
    padding:12px 14px;
    min-height:102px;
  }
  .card h3{
    margin:2px 0 10px;
    font-size:14px;
    font-weight:700;
    color:var(--text);
    letter-spacing:.3px;
  }
  .kvs{
    display:grid;
    grid-template-columns: auto 1fr;
    row-gap:4px; column-gap:10px;
    color:var(--text);
  }
  .kvs .label{ color:var(--muted) }
  .kvs .value{ text-align:right; font-weight:600 }

  .note{
    margin-top:16px; color:var(--muted); border-top:1px solid var(--edge); padding-top:10px;
  }

  /* Responsive */
  @media (max-width: 900px){
    .grid{ grid-template-columns: repeat(6, 1fr); }
  }
  @media (max-width: 640px){
    .grid{ grid-template-columns: repeat(2, 1fr); }
  }

  /* clickable card */
  .click{ cursor:pointer }
  .error{ color:var(--danger); font-weight:600; font-size:12px; }
  .ok{ color:var(--ok) }
</style>

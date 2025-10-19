<script lang="ts">
  export let icon: any;              // Svelte component
  export let iconClass = '';         // e.g., 'sonarr', 'radarr' for color
  export let badgeClass = '';        // optional badge style hook
  export let title = '';
  export let state: 'ok' | 'error' | 'not_configured' = 'ok';
  export let message = '';
  export let link: string | undefined = undefined;
  export let kvs: Array<{ label: string; value: string | number }> = [];
  export let meterPct: number | undefined = undefined; // 0..100
  export let meterColor: string | undefined = undefined; // e.g., 'var(--sab)'

  function open() {
    if (state === 'ok' && link) {
      window.open(link, '_blank', 'noopener,noreferrer');
    }
  }
  function onKey(e: KeyboardEvent){
    if (state === 'ok' && link && (e.key === 'Enter' || e.key === ' ')){
      e.preventDefault();
      open();
    }
  }
</script>

<div class="card {state === 'ok' && link ? 'click' : ''}"
     role={state === 'ok' && link ? 'button' : undefined}
     tabindex={state === 'ok' && link ? 0 : undefined}
     on:click={open}
     on:keydown={onKey}
     style={meterColor ? `--meter-color:${meterColor}` : undefined}
>
  <div class="header">
    {#if icon}
      <svelte:component this={icon} class={"ico " + (iconClass || '')} />
    {/if}
    {#if badgeClass}
      <span class={"badge " + badgeClass}>{title}</span>
    {/if}
    <div class="title">{title}</div>
  </div>

  {#if state === 'ok'}
    {#if kvs?.length}
      <div class="kvs">
        {#each kvs as row}
          <div class="label">{row.label}</div>
          <div class="value">{row.value}</div>
        {/each}
      </div>
    {/if}
    {#if meterPct !== undefined}
      <div class="meter" aria-hidden="true">
        <div class="fill" style={`width:${Math.max(0, Math.min(100, meterPct))}%`}></div>
      </div>
    {/if}
  {:else}
    <div class="error">{message}</div>
  {/if}
</div>

<style>
  .card{ background:var(--card); border:1px solid var(--edge); border-radius:14px; box-shadow:0 4px 14px rgba(0,0,0,.35); padding:12px 14px; min-height:102px; }
  .click{ cursor:pointer }
  .header{ display:flex; align-items:center; gap:8px; margin:2px 0 10px; }
  .title{ font-size:14px; font-weight:700; letter-spacing:.3px; }
  .ico{ width:18px; height:18px; }
  .kvs{ display:grid; grid-template-columns: auto 1fr; row-gap:4px; column-gap:10px; color:var(--text); }
  .kvs .label{ color:var(--muted) }
  .kvs .value{ text-align:right; font-weight:600 }
  .error{ color:var(--danger); font-weight:600; font-size:12px; }
  .meter{ margin-top:8px; height:6px; background:var(--edge); border-radius:999px; overflow:hidden; }
  .meter .fill{ height:100%; background:var(--meter-color, var(--accent)); }
</style>

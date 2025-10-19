<script lang="ts">
  export let size = 18;
  export let className = '';
</script>

<svg {size} {size} class={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" opacity="0.25"/>
  <path d="M12 3.5v17M3.5 12h17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  <path d="M8.2 8.2l7.6 7.6M15.8 8.2l-7.6 7.6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
</svg>

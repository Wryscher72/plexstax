<script lang="ts">
  export let size = 18;
  export let className = '';
</script>

<svg {size} {size} class={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
  <rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
  <path d="M12 6v7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  <path d="M9 10l3 3 3-3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>

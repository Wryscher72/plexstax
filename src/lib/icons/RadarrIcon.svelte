<script lang="ts">
  export let size = 18;
  export let className = '';
</script>

<svg {size} {size} class={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
  <circle cx="12" cy="12" r="9.5" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
  <circle cx="12" cy="12" r="6.5" stroke="currentColor" stroke-width="1.5" opacity="0.6"/>
  <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.5"/>
  <circle cx="12" cy="12" r="1.8" fill="currentColor"/>
  <path d="M12 2v4M22 12h-4M12 22v-4M2 12h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/>
</svg>

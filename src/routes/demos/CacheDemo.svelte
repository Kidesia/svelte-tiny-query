<script module lang="ts">
	export const code = `const useGcDemo = createQuery(
  ['gc-demo'],
  loadFn,
  { gcTime: 5000 } // evicted 5s after unused + stale
);

// elsewhere: watch the cache itself
const isCached = $derived(
  queryInfos.cachedQueries.some(([first]) => first === 'gc-demo')
);`;
</script>

<script lang="ts">
	import { queryInfos } from '$lib/index.ts';
	import CacheDemoInner from './CacheDemoInner.svelte';

	let mounted = $state(true);

	const isCached = $derived(
		queryInfos.cachedQueries.some(([first]) => first === 'gc-demo')
	);
</script>

<div class="row spaced">
	<button onclick={() => (mounted = !mounted)}>
		{mounted ? 'Unmount the component' : 'Mount it again'}
	</button>
</div>

<div class="slot">
	{#if mounted}
		<CacheDemoInner />
	{:else}
		<p class="muted">The component is unmounted.</p>
	{/if}
</div>

<p>
	Cache entry:
	{#if isCached}
		💾 <strong>cached</strong>
	{:else}
		🫧 <strong>evicted</strong>
	{/if}
</p>

<style>
	.spaced {
		margin-bottom: 0.75rem;
	}

	.slot {
		border: 1px dashed var(--border);
		border-radius: 0.75rem;
		padding: 0.25rem 1rem;
		margin-bottom: 0.75rem;
	}
</style>

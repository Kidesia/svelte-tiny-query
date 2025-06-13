<script lang="ts">
	import { type LoadResult } from '../src/lib/index.ts';
	import TestContainerChild from './TestContainerChild.svelte';

	let {
		states,
		...props
	}: {
		states: { value: unknown[] };
		key: string[];
		loadingFn: () => Promise<LoadResult<unknown, unknown>>;
		queryOptions?: {
			staleTime?: number;
			initialData?: unknown;
		};
	} = $props();

	let isShown = $state(true);
</script>

{#if isShown}
	<button onclick={() => (isShown = false)}>Hide</button>
	<TestContainerChild bind:states {...props} />
{:else}
	<h1>Nothing to see here</h1>
	<button onclick={() => (isShown = true)}>Show again</button>
{/if}

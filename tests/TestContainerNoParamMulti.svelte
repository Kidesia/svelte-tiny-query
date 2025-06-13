<script lang="ts">
	import { type LoadResult } from '../src/lib/index.ts';
	import TestContainerChild from './TestContainerChild.svelte';

	let {
		states1,
		states2,
		...props
	}: {
		states1: { value: unknown[] };
		states2: { value: unknown[] };
		key: string[];
		loadingFn: () => Promise<LoadResult<unknown, unknown>>;
		queryOptions?: {
			staleTime?: number;
			initialData?: unknown;
		};
	} = $props();

	let isShown1 = $state(true);
	let isShown2 = $state(true);
</script>

<div class="query1">
	{#if isShown1}
		<button onclick={() => (isShown1 = false)}>Hide 1</button>
		<TestContainerChild bind:states={states1} {...props} />
	{:else}
		<h1>Nothing to see here 1</h1>
		<button onclick={() => (isShown1 = true)}>Show again 1</button>
	{/if}
</div>

<div class="query2">
	{#if isShown2}
		<button onclick={() => (isShown2 = false)}>Hide 2</button>
		<TestContainerChild bind:states={states2} {...props} />
	{:else}
		<h1>Nothing to see here 2</h1>
		<button onclick={() => (isShown2 = true)}>Show again 2</button>
	{/if}
</div>

<script lang="ts">
	import { untrack } from 'svelte';
	import { createQuery, type LoadResult } from '../../src/lib/index.ts';

	let {
		states1,
		states2,
		key,
		loadingFn,
		queryOptions
	}: {
		states1: { value: unknown[] };
		states2: { value: unknown[] };
		key: string[];
		loadingFn: (param: { id: number }) => Promise<LoadResult<unknown, unknown>>;
		queryOptions?: {
			staleTime?: number;
			initialData?: unknown;
		};
	} = $props();

	const testQuery = createQuery(key, loadingFn, queryOptions);

	let param1 = $state({ id: 1 });
	let param2 = $state({ id: 1 });

	const { query: query1, reload: reload1 } = testQuery(param1);
	const { query: query2, reload: reload2 } = testQuery(param2);

	$effect(() => {
		states1.value = [...untrack(() => states1.value), $state.snapshot(query1)];
	});

	$effect(() => {
		states2.value = [...untrack(() => states2.value), $state.snapshot(query2)];
	});
</script>

<button onclick={() => param1.id--}>Decrement 1</button>
<button onclick={() => param1.id++}>Increment 1</button>
<button onclick={reload1}>Reload 1</button>

<div>Loading 1: {query1.loading}</div>
<div>Error 1: {query1.error}</div>
<div>Data 1: {query1.data ?? ''}</div>

<button onclick={() => param2.id--}>Decrement 2</button>
<button onclick={() => param2.id++}>Increment 2</button>
<button onclick={reload2}>Reload 2</button>

<div>Loading 2: {query2.loading}</div>
<div>Error 2: {query2.error}</div>
<div>Data 2: {query2.data ?? ''}</div>

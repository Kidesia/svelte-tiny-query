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

	const query1 = testQuery(param1);
	const query2 = testQuery(param2);

	$effect(() => {
		const { reload: _, ...queryValue } = query1;
		states1.value = [...untrack(() => states1.value), queryValue];
	});

	$effect(() => {
		const { reload: _, ...queryValue } = query2;
		states2.value = [...untrack(() => states2.value), queryValue];
	});
</script>

<button onclick={() => param1.id--}>Decrement 1</button>
<button onclick={() => param1.id++}>Increment 1</button>
<button onclick={query1.reload}>Reload 1</button>

<div>Loading 1: {query1.loading}</div>
<div>Error 1: {query1.error}</div>
<div>Data 1: {query1.data ?? ''}</div>
<div>
	Loaded at 1: {query1.loadedTimeStamp ? +query1.loadedTimeStamp : '-'}
</div>

<button onclick={() => param2.id--}>Decrement 2</button>
<button onclick={() => param2.id++}>Increment 2</button>
<button onclick={query2.reload}>Reload 2</button>

<div>Loading 2: {query2.loading}</div>
<div>Error 2: {query2.error}</div>
<div>Data 2: {query2.data ?? ''}</div>
<div>
	Loaded at 2: {query2.loadedTimeStamp ? +query2.loadedTimeStamp : '-'}
</div>

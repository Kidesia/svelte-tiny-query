<script lang="ts">
	import { untrack } from 'svelte';
	import { createQuery, type LoadResult } from '../../src/lib/index.ts';

	let {
		states,
		key,
		loadingFn,
		queryOptions
	}: {
		states: { value: unknown[] };
		key: string[];
		loadingFn: (param: { id: number }) => Promise<LoadResult<unknown, unknown>>;
		queryOptions?: {
			staleTime?: number;
			initialData?: unknown;
		};
	} = $props();

	const testQuery = createQuery(key, loadingFn, queryOptions);

	let param = $state({ id: 1 });

	const query = testQuery(param);

	$effect(() => {
		const { reload, ...queryValue } = query;
		states.value = [...untrack(() => states.value), queryValue];
	});
</script>

<button onclick={() => param.id--}>Decrement</button>
<button onclick={() => param.id++}>Increment</button>
<button onclick={query.reload}>Reload</button>

<div>Loading: {query.loading}</div>
<div>Error: {query.error}</div>
<div>Data: {query.data ?? ''}</div>
<div>Loaded at: {query.loadedTimeStamp ? +query.loadedTimeStamp : '-'}</div>

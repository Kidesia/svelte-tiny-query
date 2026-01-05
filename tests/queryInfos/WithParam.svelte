<script lang="ts">
	import { untrack } from 'svelte';
	import { createQuery, type LoadResult } from '../../src/lib/index.ts';
	import { queryInfos } from '../../src/lib/index.ts';
	import { captureState } from '../testHelpers.ts';

	let {
		states,
		activeQueries,
		key,
		loadingFn,
		queryOptions
	}: {
		states: { value: unknown[] };
		activeQueries: { value: unknown[] };
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
		const queryValue = captureState(query);
		states.value = [...untrack(() => states.value), queryValue];
	});

	$effect(() => {
		console.log(
			'Active Queries (in effect):',
			$state.snapshot(queryInfos.activeQueries)
		);
		activeQueries.value = [
			...untrack(() => activeQueries.value),
			queryInfos.activeQueries
		];
	});
</script>

<button onclick={() => param.id--}>Decrement</button>
<button onclick={() => param.id++}>Increment</button>
<button onclick={query.reload}>Reload</button>

<div>Loading: {query.loading}</div>
<div>Error: {query.error}</div>
<div>Data: {query.data ?? ''}</div>
<div>Loaded at: {query.loadedTimeStamp ? +query.loadedTimeStamp : '-'}</div>

<div>
	Active Queries: {JSON.stringify($state.snapshot(activeQueries.value))}
</div>

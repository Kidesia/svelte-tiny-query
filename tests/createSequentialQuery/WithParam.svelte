<script lang="ts">
	import { untrack } from 'svelte';
	import {
		createSequentialQuery,
		type SequentialLoadResult
	} from '../../src/lib/index.ts';

	let {
		states,
		key,
		loadingFn,
		queryOptions
	}: {
		states: { value: unknown[] };
		key: string[];
		loadingFn: (
			param: {
				id: number;
			},
			cursor: number | undefined
		) => Promise<SequentialLoadResult<unknown, number | undefined, unknown>>;
		queryOptions?: {
			staleTime?: number;
			initialData?: unknown;
		};
	} = $props();

	const testQuery = createSequentialQuery(key, loadingFn, queryOptions);

	let param = $state({ id: 1 });

	const { query, reload, loadMore } = testQuery(param);

	$effect(() => {
		states.value = [...untrack(() => states.value), $state.snapshot(query)];
	});
</script>

<button onclick={() => param.id--}>Decrement</button>
<button onclick={() => param.id++}>Increment</button>
<button onclick={reload}>Reload</button>
<button onclick={loadMore}>Load More</button>

<div>Loading: {query.loading}</div>
<div>Error: {query.error}</div>
<div>Has More: {query.hasMore ? 'Yes' : 'No'}</div>
<div>Data: {query.data ?? ''}</div>

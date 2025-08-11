<script lang="ts">
	import { untrack } from 'svelte';
	import {
		createSequentialQuery,
		type SequentialLoadResult
	} from '../../src/lib/index.ts';
	import { captureState } from '../testHelpers.ts';

	let {
		states,
		key,
		loadingFn,
		queryOptions
	}: {
		states: { value: unknown[] };
		key: string[];
		loadingFn: (
			_: void,
			cursor: number | undefined
		) => Promise<SequentialLoadResult<unknown, number | undefined, unknown>>;
		queryOptions?: {
			staleTime?: number;
			initialData?: unknown[];
		};
	} = $props();

	const testQuery = createSequentialQuery(key, loadingFn, queryOptions);

	const query = testQuery();

	$effect(() => {
		const queryValue = captureState(query);
		states.value = [...untrack(() => states.value), queryValue];
	});
</script>

<button onclick={query.reload}>Reload</button>
<button onclick={query.loadMore}>Load More</button>

<div>Loading: {query.loading}</div>
<div>Error: {query.error}</div>
<div>
	Has More: {query.hasMore
		? 'Yes'
		: query.hasMore === undefined
			? 'Maybe'
			: 'No'}
</div>
<div>Data: {query.data ? JSON.stringify(query.data) : ''}</div>

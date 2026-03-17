<script lang="ts">
	import { untrack } from 'svelte';
	import { createQuery, type LoadResult } from '../../src/lib/index.ts';
	import { captureState } from '../testHelpers.ts';

	let {
		states,
		key,
		loadingFn,
		queryOptions,
		keyFn
	}: {
		states: { value: unknown[] };
		key?: string[];
		loadingFn: (param: number) => Promise<LoadResult<unknown, unknown>>;
		queryOptions?: {
			staleTime?: number;
			initialData?: unknown;
		};
		keyFn?: (param: number) => string[];
	} = $props();

	const testQuery = createQuery(keyFn ?? key!, loadingFn, queryOptions);

	let param = $state(1);

	const query = testQuery(() => param);

	$effect(() => {
		const queryValue = captureState(query);
		states.value = [...untrack(() => states.value), queryValue];
	});
</script>

<button onclick={() => param++}>Increment</button>
<button onclick={() => param--}>Decrement</button>
<button onclick={query.reload}>Reload</button>

<div>Loading: {query.loading}</div>
<div>Error: {query.error}</div>
<div>Data: {query.data ?? ''}</div>
<div>Loaded at: {query.loadedTimeStamp ? +query.loadedTimeStamp : '-'}</div>

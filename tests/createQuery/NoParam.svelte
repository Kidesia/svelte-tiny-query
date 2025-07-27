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
		loadingFn: () => Promise<LoadResult<unknown, unknown>>;
		queryOptions?: {
			staleTime?: number;
			initialData?: unknown;
		};
	} = $props();

	const testQuery = createQuery(key, loadingFn, queryOptions);

	const { query, reload } = testQuery();

	$effect(() => {
		states.value = [...untrack(() => states.value), $state.snapshot(query)];
	});
</script>

<button onclick={reload}>Reload</button>

<div>Loading: {query.loading}</div>
<div>Error: {query.error}</div>
<div>Data: {query.data ?? ''}</div>

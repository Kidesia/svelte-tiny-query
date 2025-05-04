<script lang="ts">
	import { untrack } from 'svelte';
	import { createQuery, type LoadResult } from '../src/lib/index.ts';

	let {
		states,
		key,
		loadingFn
	}: {
		states: { value: unknown[] };
		key: string[];
		loadingFn: () => Promise<LoadResult<unknown, unknown>>;
	} = $props();

	const testQuery = createQuery(key, loadingFn);

	const { query } = testQuery();

	$effect(() => {
		states.value = [...untrack(() => states.value), $state.snapshot(query)];
	});
</script>

<div>Loading: {query.loading}</div>
<div>Error: {query.error}</div>
<div>Data: {query.data ?? ''}</div>

<script lang="ts">
	import { untrack } from 'svelte';
	import { createQuery, type LoadResult } from '../src/lib/index.ts';

	let {
		states,
		key,
		loadingFn
	}: {
		states: { value: any[] };
		key: string[];
		loadingFn: (param: { id: number }) => Promise<LoadResult<any, any>>;
	} = $props();

	const testQuery = createQuery(key, loadingFn);

	let param = $state({ id: 1 });

	const { query } = testQuery(param);

	$effect(() => {
		states.value = [...untrack(() => states.value), $state.snapshot(query)];
	});
</script>

<button onclick={() => param.id--}>Decrement</button>
<button onclick={() => param.id++}>Increment</button>

<div>Loading: {query.loading}</div>
<div>Error: {query.error}</div>
<div>Data: {query.data ?? ''}</div>

<script lang="ts">
	import { untrack } from 'svelte';
	import { createQuery, type LoadResult } from '../../src/lib/index.ts';
	import { captureState } from '../testHelpers.ts';

	let {
		states,
		key,
		loadingFn
	}: {
		states: { value: unknown[] };
		key: string[];
		loadingFn: (param: { id: number }) => Promise<LoadResult<unknown, unknown>>;
	} = $props();

	const testQuery = createQuery(key, loadingFn);

	let param = $state({ id: 1 });

	const query = testQuery(param);

	$effect(() => {
		const queryValue = captureState(query);
		states.value = [...untrack(() => states.value), queryValue];
	});
</script>

<button onclick={() => param.id++}>Increment</button>

<div>Loading: {query.loading}</div>
<div>Data: {query.data ?? ''}</div>

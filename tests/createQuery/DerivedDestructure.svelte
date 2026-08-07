<script lang="ts">
	import { createQuery, type LoadResult } from '../../src/lib/index.ts';

	let {
		key,
		loadingFn
	}: {
		key: string[];
		loadingFn: (
			param: number,
			signal: AbortSignal
		) => Promise<LoadResult<unknown, unknown>>;
	} = $props();

	const testQuery = createQuery(key, loadingFn);

	let param = $state(1);

	const query = testQuery(() => param);

	// Destructuring the query state is fine when wrapped in $derived
	const { data, loading, error } = $derived(query);
</script>

<button onclick={query.reload}>Reload</button>
<button onclick={() => param++}>Next Param</button>

<div>Loading: {loading}</div>
<div>Error: {error ?? ''}</div>
<div>Data: {data ?? ''}</div>

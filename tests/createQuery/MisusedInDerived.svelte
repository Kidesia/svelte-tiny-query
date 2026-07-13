<script lang="ts">
	import { createQuery, type LoadResult } from '../../src/lib/index.ts';

	let {
		key,
		loadingFn
	}: {
		key: string[];
		loadingFn: () => Promise<LoadResult<unknown, unknown>>;
	} = $props();

	const testQuery = createQuery(key, loadingFn);

	// This is intentionally wrong — calling testQuery() inside $derived
	const query = $derived(testQuery());
</script>

<div>Data: {query.data ?? ''}</div>

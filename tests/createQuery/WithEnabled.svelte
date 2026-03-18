<script lang="ts">
	import { untrack } from 'svelte';
	import { createQuery, type LoadResult } from '../../src/lib/index.ts';
	import { captureState } from '../testHelpers.ts';

	let {
		states,
		key,
		loadingFn,
		queryOptions,
		initialEnabled = true
	}: {
		states: { value: unknown[] };
		key: string[];
		loadingFn: () => Promise<LoadResult<unknown, unknown>>;
		queryOptions?: {
			staleTime?: number;
			initialData?: unknown;
		};
		initialEnabled?: boolean;
	} = $props();

	const testQuery = createQuery(key, loadingFn, queryOptions);

	let isEnabled = $state(initialEnabled);

	const query = testQuery(undefined, { enabled: () => isEnabled });

	$effect(() => {
		const queryValue = captureState(query);
		states.value = [...untrack(() => states.value), queryValue];
	});
</script>

<button onclick={() => (isEnabled = !isEnabled)}>Toggle Enabled</button>
<button onclick={query.reload}>Reload</button>
<div>Loading: {query.loading}</div>
<div>Error: {query.error}</div>
<div>Data: {query.data ?? ''}</div>
<div>Enabled: {query.enabled}</div>

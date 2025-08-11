<script lang="ts">
	import { untrack } from 'svelte';
	import { createQuery, type LoadResult } from '../../src/lib/index.ts';
	import { captureState } from '../testHelpers.ts';

	let {
		suffix = '',
		states = $bindable(),
		key,
		loadingFn,
		queryOptions
	}: {
		suffix?: string;
		states: { value: unknown[] };
		key: string[];
		loadingFn: () => Promise<LoadResult<unknown, unknown>>;
		queryOptions?: {
			staleTime?: number;
			initialData?: unknown;
		};
	} = $props();

	const testQuery = createQuery(key, loadingFn, queryOptions);

	const query = testQuery();

	$effect(() => {
		const queryValue = captureState(query);
		states.value = [...untrack(() => states.value), queryValue];
	});
</script>

<button onclick={query.reload}>Reload{suffix}</button>
<div>Loading{suffix}: {query.loading}</div>
<div>Error{suffix}: {query.error}</div>
<div>Data{suffix}: {query.data ?? ''}</div>
<div>
	Loaded at{suffix}: {query.loadedTimeStamp ? +query.loadedTimeStamp : '-'}
</div>

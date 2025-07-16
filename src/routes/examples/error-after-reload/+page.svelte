<script lang="ts">
	import { createQuery } from '$lib/svelte-tiny-query/query.svelte';

	let i = $state(0);

	const testQuery = createQuery(['error-after-success'], async () => {
		i += 1;
		return i % 2 === 1
			? { success: true, data: 'Lucky you' }
			: { success: false, error: 'Oopsie!' };
	});

	const { query, reload } = testQuery();
</script>

<button onclick={reload}>Reload</button>

<div>Loading: {query.loading}</div>
<div>Error: {query.error}</div>
<div>Data: {query.data ?? ''}</div>

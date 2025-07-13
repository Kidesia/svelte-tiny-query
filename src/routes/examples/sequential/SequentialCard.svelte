<script lang="ts">
	import { createSequentialQuery } from '$lib/svelte-tiny-query/sequential.svelte';

	const testQuery = createSequentialQuery(
		['to-infinity'],
		async (_param, cursor: number = 0) => {
			console.log('Fetching data with cursor:', cursor);

			await new Promise((resolve) => {
				setTimeout(resolve, 500);
			});

			const hasMore = cursor <= 12 && Math.random() > 0.2;
			console.log('Has more data:', hasMore);
			return {
				success: true,
				data: [cursor, cursor + 1],
				cursor: hasMore ? cursor + 2 : undefined
			};
		}
	);

	const { query, loadMore, reload } = testQuery();
</script>

<div>
	<button onclick={reload}>Reload</button>
	<button onclick={loadMore} disabled={!query.hasMore}>Load More</button>

	<div>Loading: {query.loading}</div>
	<div>Error: {query.error}</div>
	<div>Data: {query.data ?? ''}</div>
	<div>Has More: {query.hasMore ? 'yeah' : 'no'}</div>
</div>

<script lang="ts">
	import { createSequentialQuery } from '$lib/index.js';

	const testQuery = createSequentialQuery(
		['to-infinity'],
		async (_param, cursor: number = 0) => {
			await new Promise((resolve) => {
				setTimeout(resolve, 500);
			});

			const hasMore = cursor <= 12 && Math.random() > 0.1;
			state += 1;
			return {
				success: true,
				data: [`${cursor}-${state}`, `${cursor + 1}-${state}`],
				cursor: hasMore ? cursor + 2 : undefined
			};
		}
	);

	let state = $state(0);

	const query = testQuery();
</script>

<div>
	<button onclick={query.reload}>Reload</button>
	<button onclick={query.loadMore} disabled={!query.hasMore}>Load More</button>

	<div>Loading: {query.loading}</div>
	<div>Error: {query.error}</div>
	<div>Data: {query.data ?? ''}</div>
	<div>
		Has More: {query.hasMore
			? 'Yes'
			: query.hasMore === undefined
				? 'Maybe'
				: 'No'}
	</div>
</div>

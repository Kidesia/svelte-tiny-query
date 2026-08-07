<script lang="ts">
	import { createQuery, succeed } from '$lib/index.ts';

	const useGcDemo = createQuery(
		['gc-demo'],
		async () => {
			await new Promise((resolve) => setTimeout(resolve, 700));
			return succeed('Loaded at ' + new Date().toLocaleTimeString());
		},
		{ gcTime: 5000 }
	);

	const query = useGcDemo();
</script>

{#if query.loading}
	<p class="muted">Loading…</p>
{:else if query.data}
	<p>{query.data}</p>
{/if}

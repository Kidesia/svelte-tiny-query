<script lang="ts">
	import { invalidateQueries, globalLoading } from '$lib/index.js';

	const { children } = $props();

	let queryKey = $state('');

	function invalidate() {
		try {
			const key = JSON.parse(queryKey);
			invalidateQueries(key);
		} catch (error) {
			console.error('Error invalidating queries:', error);
		}
	}
</script>

<div class="query-container">
	{@render children()}

	<footer>
		<div>
			<input type="text" placeholder="invalidate" bind:value={queryKey} />
			<button onclick={invalidate}>invalidate</button>
		</div>

		<div>
			{globalLoading.count} loading
		</div>
	</footer>
</div>

<style>
	.query-container {
		display: flex;
		justify-content: center;
		align-items: center;
		flex-direction: column;
		background-color: rgb(253, 218, 206);
		gap: 0.5rem;
		padding: 1rem;
		border-radius: 1.5rem;
	}

	footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1.5rem;
	}
</style>

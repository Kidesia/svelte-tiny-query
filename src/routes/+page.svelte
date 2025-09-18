<script lang="ts">
	import MemeIdea from './MemeIdea.svelte';
	import QueryContainer from './QueryContainer.svelte';

	import { queryInfos } from '../lib/index.ts';

	$inspect({ activeQueries: queryInfos.activeQueries });
</script>

<main>
	<section>
		<QueryContainer>
			<div class="flex">
				<MemeIdea />
				<MemeIdea />
				<MemeIdea />
			</div>

			<div>
				Active Queries: {JSON.stringify(
					$state.snapshot(queryInfos.activeQueries)
				)}
			</div>
		</QueryContainer>
	</section>
</main>

<style>
	main {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		height: 100vh;
	}

	section {
		display: flex;
		gap: 1rem;
	}

	.flex {
		display: flex;
		justify-content: center;
		align-items: start;
		gap: 0.5rem;
	}
</style>

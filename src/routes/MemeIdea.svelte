<script lang="ts">
	import { createQuery } from '$lib/index.js';

	const EMOJI = ['😵', '🙏', '👋', '🚽', '💃', '💎', '🚀', '🌙', '🎁'];

	const formatHHMMSS = (date: Date) => {
		return date.toLocaleTimeString('en-US', {
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hour12: false
		});
	};

	const useMemeIdea = createQuery(
		['meme-idea'],
		async (param: { id: number }) => {
			await new Promise((resolve) => setTimeout(resolve, 1000));
			return {
				success: true,
				data: {
					id: param.id,
					emoji: EMOJI[param.id % EMOJI.length],
					fetchedAt: formatHHMMSS(new Date())
				}
			};
		},
		{
			staleTime: 5000
		}
	);

	const param = $state({ id: 1 });
	const { query, refetch } = useMemeIdea(param);
</script>

<div class="emojis-container">
	<h1>
		Emoji #{param.id}

		<button onclick={() => param.id--}> - </button>
		<button onclick={() => param.id++}> + </button>
	</h1>

	<div class="emoji" class:loading={query.loading}>
		{#if query.error}
			<p>Error: {query.error}</p>
		{/if}

		{#if query.data}
			<div class="content">{query.data.emoji}</div>
			<div>
				<div>id: {query.data.id}</div>
				<div>time: {query.data.fetchedAt}</div>
			</div>
		{/if}

		<button onclick={refetch}>Refetch</button>

		{#if query.loading}
			<div>Loading</div>
		{/if}
	</div>
</div>

<style>
	.emojis-container {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		gap: 0.5rem;
		background-color: aliceblue;
		border: 3px solid rgb(199, 196, 226);
		border-radius: 1rem;
		padding: 1rem;
		font-family: system-ui;

		> * {
			margin: 0;
		}
	}

	h1 {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 0.5rem;
	}

	.loading {
		opacity: 0.3;
	}

	.content {
		font-size: 5rem;
		text-align: center;
	}
</style>

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

	const emojiQuery = createQuery(
		['emoji'],
		async () => {
			await new Promise((resolve) => setTimeout(resolve, 1000));
			return {
				success: true,
				data: EMOJI.map((emoji, index) => ({
					id: index,
					emoji,
					fetchedAt: new Date()
				}))
			};
		},
		{
			staleTime: 8_000,
			initialData: []
		}
	);

	const query = emojiQuery();
</script>

<div class="emojis-container">
	<h1>Emojis</h1>

	<div class="emoji" class:loading={query.loading}>
		{#if query.error}
			<p>Error: {query.error}</p>
		{/if}

		{#each query.data as emoji (emoji.id)}
			<div class="content">{emoji.emoji}</div>
			<div>
				<div>id: {emoji.id}</div>
				<div>time: {formatHHMMSS(emoji.fetchedAt)}</div>
			</div>
			<div>
				staleTime:
				{#if query.staleTimeStamp}
					{formatHHMMSS(new Date(query.staleTimeStamp))}
				{:else}
					not
				{/if}
			</div>
		{/each}

		{#if query.loading}
			<div>Loading</div>
		{/if}
	</div>
</div>

<style>
	.emojis-container {
		display: flex;
		flex-direction: column;
		justify-content: start;
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
		font-size: 1rem;
	}

	.loading {
		opacity: 0.3;
	}

	.content {
		font-size: 5rem;
		text-align: center;
	}
</style>

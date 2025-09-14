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

	const useEmojiQuery = createQuery(
		['emoji'],
		async (param: { id: number }) => {
			await new Promise((resolve) => setTimeout(resolve, 1000));
			return {
				success: true,
				data: {
					id: param.id,
					emoji: EMOJI[param.id % EMOJI.length],
					fetchedAt: new Date()
				}
			};
		},
		{ staleTime: 8_000 }
	);

	const param = $state({ id: 1 });

	const emojiQuery = useEmojiQuery(param);
</script>

<div class="emojis-container">
	<h1>
		Emoji #{param.id}
	</h1>

	<div class="flex">
		<button onclick={emojiQuery.reload}>↻</button>
		<button onclick={() => param.id--}>-</button>
		<button onclick={() => param.id++}>+</button>
	</div>

	<div class="emoji" class:loading={emojiQuery.loading}>
		{#if emojiQuery.error}
			<p>Error: {emojiQuery.error}</p>
		{/if}

		{#if emojiQuery.data}
			<div class="content">{emojiQuery.data.emoji}</div>
			<div>
				<div>id: {emojiQuery.data.id}</div>
				<div>time: {formatHHMMSS(emojiQuery.data.fetchedAt)}</div>
			</div>
			<div>
				staleTime:
				{#if emojiQuery.staleTimeStamp}
					{formatHHMMSS(new Date(emojiQuery.staleTimeStamp))}
				{:else}
					not
				{/if}
			</div>
		{/if}

		{#if emojiQuery.loading}
			<div>Loading</div>
		{/if}
	</div>
</div>

<style>
	.flex {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 0.5rem;
	}

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

	button {
		display: flex;
		justify-content: center;
		align-items: center;
		background-color: rgb(203, 226, 246);
		border: none;
		cursor: pointer;
		font-size: 1.5rem;
		padding: 0.5rem;
		aspect-ratio: 1;
		text-box-trim: trim-both;
		text-box-edge: cap alphabetic;
	}
</style>

<script lang="ts">
	import { createQuery } from '$lib/index.js';
	import { fade } from 'svelte/transition';

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
					fetchedAt: formatHHMMSS(new Date())
				}
			};
		}
	);

	const param = $state({ id: 1 });
	const { query, refetch } = useMemeIdea(param);

	$inspect({ query });
</script>

<div class="memes-container">
	<h1>Meme Ideas</h1>

	<div class="controls">
		<button
			onclick={() => {
				param.id--;
			}}
		>
			-
		</button>
		<button
			onclick={() => {
				param.id++;
			}}
		>
			+
		</button>
	</div>

	<div class="meme">
		{#if query.loading}
			<div class="spinner" transition:fade>Loading...</div>
		{/if}

		{#if query.error}
			<p>Error: {query.error}</p>
		{/if}

		{#if query.data}
			<img src="https://picsum.photos/id/{200 + query.data.id}/200" alt="" />
			<p>{query.data?.fetchedAt}</p>
		{/if}

		<button onclick={refetch}>Refetch</button>
	</div>
</div>

<style>
	.memes-container {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		background-color: aliceblue;
		border: 3px solid rgb(199, 196, 226);
		border-radius: 1rem;
	}

	.controls {
		display: flex;
		gap: 1rem;
	}

	.meme {
		position: relative;
	}

	.meme img {
		width: 200px;
		height: 200px;
		background-color: aquamarine;
		object-fit: cover;
	}

	.spinner {
		position: absolute;
		inset: 0;
		display: flex;
		justify-content: center;
		align-items: center;
		background: white / 0.5;
	}
</style>

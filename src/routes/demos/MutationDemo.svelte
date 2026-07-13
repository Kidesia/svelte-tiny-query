<script module lang="ts">
	export const code = `import { invalidateQueries } from 'svelte-tiny-query';

let newIdea = $state('');

// Mutations are just functions
async function add() {
  await addMemeIdea(newIdea);
  invalidateQueries(['meme-ideas']);
  newIdea = '';
}`;
</script>

<script lang="ts">
	import { createQuery, invalidateQueries, succeed, fail } from '$lib/index.ts';
	import { addMemeIdea, fetchMemeIdeas } from './fakeApi.ts';

	// Same key as the first demo — same part of the global cache
	const useMemeIdeas = createQuery(['docs', 'meme-ideas'], async () => {
		try {
			return succeed(await fetchMemeIdeas());
		} catch {
			return fail('Could not load meme ideas 😢');
		}
	});

	const query = useMemeIdeas();

	let newIdea = $state('');
	let saving = $state(false);

	async function add(event: SubmitEvent) {
		event.preventDefault();
		if (!newIdea.trim() || saving) return;
		saving = true;
		await addMemeIdea(newIdea.trim());
		invalidateQueries(['docs', 'meme-ideas']);
		newIdea = '';
		saving = false;
	}
</script>

<ul class:muted={query.loading}>
	{#each query.data ?? [] as idea (idea)}
		<li>{idea}</li>
	{/each}
</ul>

<form onsubmit={add}>
	<input bind:value={newIdea} placeholder="Your own meme idea…" />
	<button disabled={saving || !newIdea.trim()}>
		{saving ? 'Saving…' : 'Add'}
	</button>
</form>

<style>
	form {
		display: flex;
		gap: 0.5rem;
	}

	input {
		flex: 1;
	}
</style>

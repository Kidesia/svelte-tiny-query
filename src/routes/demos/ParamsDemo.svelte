<script module lang="ts">
	export const code = `let selectedId = $state(1);

const useMemeIdea = createQuery(
  ['meme-idea'],
  async (id: number) => {
    try {
      return succeed(await fetchMemeIdea(id));
    } catch {
      return fail('Could not load this one 😢');
    }
  },
  { staleTime: 10_000 }
);

// Reactive params are passed as thunks
const query = useMemeIdea(() => selectedId);`;
</script>

<script lang="ts">
	import { createQuery, succeed, fail } from '$lib/index.ts';
	import { fetchMemeIdea } from './fakeApi.ts';

	let selectedId = $state(1);

	const useMemeIdea = createQuery(
		['docs', 'meme-idea'],
		async (id: number) => {
			try {
				return succeed(await fetchMemeIdea(id));
			} catch {
				return fail('Could not load this one 😢');
			}
		},
		{ staleTime: 10_000 }
	);

	const query = useMemeIdea(() => selectedId);
</script>

<div class="row">
	{#each [1, 2, 3, 4] as id (id)}
		<button class:active={selectedId === id} onclick={() => (selectedId = id)}>
			#{id}
		</button>
	{/each}
</div>

{#if query.loading}
	<p class="muted">Loading idea #{selectedId}…</p>
{:else if query.error}
	<p class="error">{query.error}</p>
{:else if query.data}
	<p><strong>{query.data.title}</strong></p>
	<p class="muted">by {query.data.author} · ▲ {query.data.upvotes}</p>
{/if}

<style>
	.row {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}
</style>

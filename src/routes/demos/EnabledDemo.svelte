<script module lang="ts">
	export const code = `let author = $state<string | undefined>(undefined);

const usePosts = createQuery(['posts'], async (author: string) => {
  try {
    return succeed(await fetchPostsBy(author));
  } catch {
    return fail('Could not load posts 😢');
  }
});

// Only loads once an author is picked
const query = usePosts(() => author ?? '', {
  enabled: () => author !== undefined
});`;
</script>

<script lang="ts">
	import { createQuery, succeed, fail } from '$lib/index.ts';
	import { fetchPostsBy } from './fakeApi.ts';

	let author = $state<string | undefined>(undefined);

	const usePosts = createQuery(['docs', 'posts'], async (author: string) => {
		try {
			return succeed(await fetchPostsBy(author));
		} catch {
			return fail('Could not load posts 😢');
		}
	});

	const query = usePosts(() => author ?? '', {
		enabled: () => author !== undefined
	});
</script>

<div class="row">
	{#each ['Ada', 'Grace'] as name (name)}
		<button class:active={author === name} onclick={() => (author = name)}>
			{name}
		</button>
	{/each}
	<button onclick={() => (author = undefined)} disabled={author === undefined}>
		Clear
	</button>
</div>

{#if !query.enabled}
	<p class="muted">Pick an author to load their posts.</p>
{:else if query.loading}
	<p class="muted">Loading posts by {author}…</p>
{:else if query.error}
	<p class="error">{query.error}</p>
{:else if query.data}
	<ul>
		{#each query.data as post (post)}
			<li>{post}</li>
		{/each}
	</ul>
{/if}

<style>
	.row {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}
</style>

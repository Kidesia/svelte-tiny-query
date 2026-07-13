<script module lang="ts">
	export const code = `import { createSequentialQuery } from 'svelte-tiny-query';

const useComments = createSequentialQuery(
  ['comments'],
  async (_, cursor) => {
    try {
      const page = await fetchComments(cursor ?? 0);
      return {
        success: true,
        data: page.items,
        cursor: page.next // undefined = no more pages
      };
    } catch {
      return { success: false, error: 'Could not load comments 😢' };
    }
  }
);

const query = useComments();`;
</script>

<script lang="ts">
	import { createSequentialQuery } from '$lib/index.ts';
	import { fetchComments } from './fakeApi.ts';

	const useComments = createSequentialQuery(
		['docs', 'comments'],
		async (_: void, cursor: number | undefined) => {
			try {
				const page = await fetchComments(cursor ?? 0);
				return {
					success: true as const,
					data: page.items,
					cursor: page.next
				};
			} catch {
				return { success: false as const, error: 'Could not load comments 😢' };
			}
		}
	);

	const query = useComments();
</script>

{#if query.error}
	<p class="error">{query.error}</p>
{:else if query.data}
	{#each query.data as page, pageIndex (pageIndex)}
		<ul class="page">
			{#each page as comment (comment)}
				<li>{comment}</li>
			{/each}
		</ul>
	{/each}
{/if}

<div class="row">
	{#if query.hasMore !== false}
		<button onclick={query.loadMore} disabled={query.loading}>
			{query.loading ? 'Loading…' : 'Load more'}
		</button>
	{:else}
		<p class="muted">You have reached the end 🎉</p>
	{/if}
	<button onclick={query.reload} disabled={query.loading}>Reload</button>
</div>

<style>
	.page {
		border-left: 3px solid var(--accent-soft);
		padding-left: 1rem;
		margin: 0 0 0.5rem;
		list-style: none;
	}

	.row {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}
</style>

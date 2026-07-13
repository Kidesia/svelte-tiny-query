<script module lang="ts">
	export const code = `import { createQuery, succeed, fail } from 'svelte-tiny-query';

const useMemeIdeas = createQuery(['meme-ideas'], async () => {
  try {
    return succeed(await fetchMemeIdeas());
  } catch {
    return fail('Could not load meme ideas 😢');
  }
});

const query = useMemeIdeas();`;
</script>

<script lang="ts">
	import { createQuery, succeed, fail } from '$lib/index.ts';
	import { fetchMemeIdeas } from './fakeApi.ts';

	const useMemeIdeas = createQuery(['docs', 'meme-ideas'], async () => {
		try {
			return succeed(await fetchMemeIdeas());
		} catch {
			return fail('Could not load meme ideas 😢');
		}
	});

	const query = useMemeIdeas();

	function show(value: unknown) {
		return value === undefined ? 'undefined' : JSON.stringify(value);
	}

	const snapshot = $derived(
		'{\n' +
			[
				`loading: ${show(query.loading)}`,
				`data: ${show(query.data)}`,
				`error: ${show(query.error)}`,
				`loadedTimeStamp: ${show(query.loadedTimeStamp)}`,
				`staleTimeStamp: ${show(query.staleTimeStamp)}`,
				`enabled: ${show(query.enabled)}`,
				'reload: ƒ'
			]
				.map((line) => '  ' + line)
				.join(',\n') +
			'\n}'
	);
</script>

<pre class="payload">{snapshot}</pre>

<button onclick={query.reload} disabled={query.loading}>
	{query.loading ? 'Loading…' : 'Reload'}
</button>

<style>
	.payload {
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: 0.5rem;
		padding: 0.6rem 0.8rem;
		font-family: var(--font-mono);
		font-size: 0.78rem;
		line-height: 1.5;
		overflow-x: auto;
	}
</style>

<script module lang="ts">
	export const code = `const useSlow = createQuery(['slow'], async (_, signal) => {
  signal.addEventListener('abort', () => log('cancelled!'));
  const data = await slowFetch(signal); // takes 3 seconds
  return succeed(data);
});

const query = useSlow();

// cancels the in-flight load and starts a fresh one
invalidateQueries(['slow']);`;
</script>

<script lang="ts">
	import { createQuery, invalidateQueries, succeed } from '$lib/index.ts';

	let counter = 0;
	let events = $state<string[]>([]);

	function log(message: string) {
		events = [...events, message].slice(-5);
	}

	const useSlow = createQuery(['cancel-demo'], async (_: void, signal) => {
		const id = ++counter;
		log(`Load #${id} started (takes 3s)…`);
		signal.addEventListener('abort', () => log(`Load #${id} was cancelled 🙅`));
		await new Promise((resolve) => setTimeout(resolve, 3000));
		if (!signal.aborted) log(`Load #${id} finished ✅`);
		return succeed(`Result of load #${id}`);
	});

	const query = useSlow();
</script>

<div class="row spaced">
	<button onclick={query.reload} disabled={query.loading}>Reload (3s)</button>
	<button onclick={() => invalidateQueries(['cancel-demo'])}>
		Invalidate now
	</button>
</div>

{#if query.data}
	<p>{query.data}</p>
{:else if query.loading}
	<p class="muted">Loading…</p>
{/if}

<ul class="log">
	{#each events as event (event)}
		<li>{event}</li>
	{/each}
</ul>

<style>
	.spaced {
		margin-bottom: 0.75rem;
	}

	.log {
		list-style: none;
		padding: 0.5rem 1rem;
		margin: 0.75rem 0 0;
		border: 1px dashed var(--border);
		border-radius: 0.75rem;
		font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
		font-size: 0.8rem;
		color: var(--text-muted);
	}
</style>

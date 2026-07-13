<script module lang="ts">
	export const code = `const useWobbly = createQuery(
  ['wobbly'],
  async () => {
    const response = await wobblyServer();
    return response.ok
      ? succeed(response.data)
      : fail('The server flaked out 🫠');
  },
  { retry: 2 } // 3 attempts in total, with 1s and 2s of backoff
);

const query = useWobbly();`;
</script>

<script lang="ts">
	import { createQuery, succeed, fail } from '$lib/index.ts';

	// Not $state: only read inside the loading function
	let failuresLeft = 0;
	let attempts = $state(0);

	const useWobbly = createQuery(
		['docs', 'wobbly'],
		async () => {
			attempts += 1;
			await new Promise((resolve) => setTimeout(resolve, 400));
			if (failuresLeft > 0) {
				failuresLeft -= 1;
				return fail('The server flaked out 🫠');
			}
			return succeed('The server pulled through 💪');
		},
		{ retry: 2 }
	);

	const query = useWobbly();

	function reload(failures: number) {
		failuresLeft = failures;
		attempts = 0;
		query.reload();
	}
</script>

<div class="row">
	<button onclick={() => reload(2)} disabled={query.loading}>
		Reload (flakes twice)
	</button>
	<button onclick={() => reload(99)} disabled={query.loading}>
		Reload (hopeless)
	</button>
</div>

{#if query.loading}
	<p class="muted">
		Loading… <strong>attempt {attempts}</strong> — hang in there
	</p>
{:else if query.error}
	<p class="error">{query.error} (gave up after {attempts} attempts)</p>
{:else if query.data}
	<p>{query.data} {attempts > 1 ? `(took ${attempts} attempts)` : ''}</p>
{/if}

<style>
	.row {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
		flex-wrap: wrap;
	}
</style>

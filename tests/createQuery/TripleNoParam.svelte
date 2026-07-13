<script lang="ts">
	import { type LoadResult } from '../../src/lib/index.ts';
	import NoParam from './NoParam.svelte';

	let {
		states1,
		states2,
		states3,
		key,
		loadingFn,
		queryOptions
	}: {
		states1: { value: unknown[] };
		states2: { value: unknown[] };
		states3: { value: unknown[] };
		key: string[];
		loadingFn: () => Promise<LoadResult<unknown, unknown>>;
		queryOptions?: {
			staleTime?: number;
			initialData?: unknown;
		};
	} = $props();

	const hideState = $state({
		hide1: false,
		hide2: false,
		hide3: false
	});
</script>

{#if !hideState.hide1}
	<button onclick={() => (hideState.hide1 = true)}>Hide 1</button>
	<NoParam bind:states={states1} {key} {loadingFn} {queryOptions} suffix=" 1" />
{:else}
	<button onclick={() => (hideState.hide1 = false)}>Show 1</button>
	<div>Component 1 is hidden</div>
{/if}

{#if !hideState.hide2}
	<button onclick={() => (hideState.hide2 = true)}>Hide 2</button>
	<NoParam bind:states={states2} {key} {loadingFn} {queryOptions} suffix=" 2" />
{:else}
	<button onclick={() => (hideState.hide2 = false)}>Show 2</button>
	<div>Component 2 is hidden</div>
{/if}

{#if !hideState.hide3}
	<button onclick={() => (hideState.hide3 = true)}>Hide 3</button>
	<NoParam bind:states={states3} {key} {loadingFn} {queryOptions} suffix=" 3" />
{:else}
	<button onclick={() => (hideState.hide3 = false)}>Show 3</button>
	<div>Component 3 is hidden</div>
{/if}

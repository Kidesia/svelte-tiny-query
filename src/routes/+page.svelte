<script lang="ts">
	import MemeIdea from './MemeIdea.svelte';
</script>

<main>
	<section>
		<MemeIdea />
		<MemeIdea />
		<MemeIdea />
	</section>
</main>

<style>
	main {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		height: 100vh;
	}

	section {
		display: flex;
		gap: 2rem;
	}
</style>

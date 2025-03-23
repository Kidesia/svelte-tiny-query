<script lang="ts">
	import { createQuery } from '$lib/index.js';

	const useFoo = createQuery(['foo'], async () => {
		const response = await fetch('/api/foo');
		return response.json();
	});
</script>

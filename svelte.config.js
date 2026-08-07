import { mdsvex } from 'mdsvex';
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: [vitePreprocess(), mdsvex({ extensions: ['.svx', '.md'] })],

	kit: {
		// The docs page is a fully prerendered static site (see src/routes)
		adapter: adapter(),
		paths: {
			// On GitHub Pages, the site is served under /svelte-tiny-query
			base: process.env.BASE_PATH ?? ''
		}
	},

	extensions: ['.svelte', '.svx', '.md']
};

export default config;

<script lang="ts">
	import '@fontsource/comic-neue';

	let { children } = $props();
</script>

{@render children()}

<style>
	:global {
		:root {
			--font-serif: ui-serif, Georgia, Cambria, 'Times New Roman', serif;
			--font-sans: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
			--font-mono: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;

			--bg: #fffcf9;
			--bg-card: #ffffff;
			--bg-code: #322c26;
			--text: #3d3530;
			--text-muted: #8a7d72;
			--text-code: #f4ede5;
			--accent: #ff3e00;
			--accent-soft: #ffe9de;
			--border: #f0e2d8;
			--error: #cc3355;

			--pink: #ffdbe4;
			--blue: #d9e9ff;
			--mint: #d8f2e0;
			--peach: #ffe2cd;
			--butter: #fff1c9;
			--lavender: #ece2ff;
			--tip-text: #684a9e;

			@media (prefers-color-scheme: dark) {
				--bg: #201a15;
				--bg-card: #2a231d;
				--bg-code: #16110d;
				--text: #f1eae2;
				--text-muted: #b3a496;
				--text-code: #f0e9e1;
				--accent: #ff6435;
				--accent-soft: #4a2b1c;
				--border: #3e332a;
				--error: #ff8fae;

				--pink: #4d2c3a;
				--blue: #293a55;
				--mint: #24443a;
				--peach: #4c3423;
				--butter: #4a4028;
				--lavender: #3a2e50;
				--tip-text: #d2c1f1;
			}
		}

		* {
			box-sizing: border-box;
		}

		html {
			/* 17px base — everything rem-based scales with it */
			font-size: 106.25%;
			scroll-behavior: smooth;
			overflow-x: clip;
		}

		[id] {
			/* a little air above anchor targets */
			scroll-margin-top: 1.5rem;
		}

		body {
			margin: 0;
			/* decorative hero blobs extend past the viewport */
			overflow-x: clip;
			background: var(--bg);
			color: var(--text);
			font-family: var(--font-serif);
			line-height: 1.65;
		}

		h1,
		h2,
		h3 {
			line-height: 1.2;
		}

		main h3 {
			margin-top: 2.75rem;
		}

		a {
			color: var(--accent);
		}

		p code,
		li code,
		td code {
			background: var(--accent-soft);
			padding: 0.1rem 0.35rem;
			border-radius: 0.35rem;
			font-family: var(--font-mono);
			font-size: 0.8em;
		}

		button {
			font: inherit;
			font-family: var(--font-sans);
			font-size: 0.9rem;
			padding: 0.4rem 1rem;
			border: 1px solid var(--border);
			border-radius: 999px;
			background: var(--bg-card);
			color: var(--text);
			cursor: pointer;
			transition:
				border-color 0.15s,
				transform 0.1s;
		}

		button:hover:not(:disabled) {
			border-color: var(--accent);
			transform: translateY(-1px);
		}

		button:disabled {
			opacity: 0.5;
			cursor: default;
		}

		button.active {
			background: var(--tint, var(--accent-soft));
			border-color: var(--accent);
		}

		input {
			font: inherit;
			font-family: var(--font-sans);
			font-size: 0.9rem;
			padding: 0.4rem 0.8rem;
			border: 1px solid var(--border);
			border-radius: 999px;
			background: var(--bg-card);
			color: var(--text);
			min-width: 0;
		}

		.table-wrap {
			/* tables live in a card and scroll on small screens */
			overflow-x: auto;
			margin: 1.25rem 0;
			padding: 0.5rem 1.25rem;
			background: var(--bg-card);
			border: 1px solid var(--border);
			border-radius: 0.75rem;
		}

		table {
			width: 100%;
			min-width: 38rem;
			border-collapse: collapse;
			font-size: 0.9rem;
		}

		th,
		td {
			text-align: left;
			padding: 0.5rem 0.75rem;
			border-bottom: 1px solid var(--border);
			vertical-align: top;
		}

		th {
			color: var(--text-muted);
			font-family: var(--font-sans);
			font-weight: 600;
			font-size: 0.75rem;
			text-transform: uppercase;
			letter-spacing: 0.05em;
		}

		tr:last-child td {
			border-bottom: none;
		}

		td:first-child {
			white-space: nowrap;
			font-family: var(--font-mono);
			font-size: 0.85rem;
		}

		/* Full-bleed section layout: text lives in a centered column of a
		   readable ~90-100 characters, while demos, tables and standalone
		   code blocks break out of it and stick out visually */
		main section:not(.hero) {
			display: grid;
			grid-template-columns: 1fr min(48rem, 100%) 1fr;
		}

		main section:not(.hero) > * {
			grid-column: 2;
			min-width: 0;
		}

		main section:not(.hero) > .demo-grid {
			grid-column: 1 / -1;
		}

		/* On narrow screens the centered column is as wide as the section
		   anyway — plain block flow avoids grid track edge cases */
		@media (max-width: 64rem) {
			main section:not(.hero) {
				display: block;
			}
		}

		.muted {
			color: var(--text-muted);
		}

		.error {
			color: var(--error);
		}

		.chip {
			display: inline-block;
			background: var(--tint, var(--accent-soft));
			border-radius: 999px;
			padding: 0.1rem 0.8rem;
			font-family: var(--font-sans);
			font-size: 0.7rem;
			font-weight: 600;
			letter-spacing: 0.08em;
			text-transform: uppercase;
		}

		.row {
			display: flex;
			gap: 0.5rem;
			flex-wrap: wrap;
			align-items: center;
		}
	}
</style>

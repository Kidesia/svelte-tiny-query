<script lang="ts">
	let { code, types }: { code: string; types?: Record<string, string> } =
		$props();

	// A deliberately tiny highlighter — enough for the snippets on this
	// page (comments, strings, keywords, literals, numbers and types)
	const TOKEN =
		/(\/\/[^\n]*)|('(?:[^'\\]|\\.)*')|("(?:[^"\\]|\\.)*")|(`(?:[^`\\]|\\.)*`)|\b(const|let|var|function|return|async|await|import|export|from|type|interface|extends|if|else|try|catch|new|typeof|as)\b|\b(true|false|undefined|null|Infinity)\b|(\b\d[\d_]*(?:\.\d+)?\b)|\b(string|number|boolean|bigint|symbol|void|unknown|never)\b|\b([A-Z][A-Za-z0-9_]*)\b/g;

	const CLASSES = [
		'tok-comment',
		'tok-string',
		'tok-string',
		'tok-string',
		'tok-keyword',
		'tok-literal',
		'tok-number',
		'tok-typename',
		'tok-typename'
	];

	function escapeHtml(text: string) {
		return text
			.replaceAll('&', '&amp;')
			.replaceAll('<', '&lt;')
			.replaceAll('>', '&gt;');
	}

	function highlight(source: string, linkTypes: boolean) {
		let html = '';
		let lastIndex = 0;
		for (const match of source.matchAll(TOKEN)) {
			html += escapeHtml(source.slice(lastIndex, match.index));
			const groupIndex = match.slice(1).findIndex((g) => g !== undefined);
			const tokenClass = CLASSES[groupIndex];
			const isKnownType =
				linkTypes && tokenClass === 'tok-typename' && types?.[match[0]];
			html += isKnownType
				? `<a class="tok-type" href="#api-typescript" data-type="${match[0]}">${match[0]}</a>`
				: `<span class="${tokenClass}">${escapeHtml(match[0])}</span>`;
			lastIndex = match.index + match[0].length;
		}
		return html + escapeHtml(source.slice(lastIndex));
	}

	const highlighted = $derived(highlight(code, true));

	// Hovering (or focusing) a linked type shows its definition in a
	// fixed-position overlay, so it escapes the code block's scroll clipping
	let tooltip = $state<{
		html: string;
		x: number;
		y: number;
		above: boolean;
	} | null>(null);

	function showTooltip(target: EventTarget | null) {
		const anchor =
			target instanceof Element ? target.closest('a.tok-type') : null;
		if (!anchor) return;
		const definition = types?.[(anchor as HTMLElement).dataset.type ?? ''];
		if (!definition) return;

		const rect = anchor.getBoundingClientRect();
		const above = rect.bottom > window.innerHeight - 300;
		tooltip = {
			html: highlight(definition, false),
			x: Math.min(rect.left, Math.max(8, window.innerWidth - 580)),
			y: above ? rect.top - 8 : rect.bottom + 8,
			above
		};
	}

	function hideTooltip(target: EventTarget | null) {
		if (target instanceof Element && target.closest('a.tok-type')) {
			tooltip = null;
		}
	}
</script>

<svelte:window onscroll={() => (tooltip = null)} />

<!-- The mouse handlers delegate to the type links inside, which are keyboard-
     covered by focusin/focusout (focus/blur do not bubble). The html is fully
     escaped by the highlighter, only our own span and anchor tags are injected. -->
<!-- svelte-ignore a11y_mouse_events_have_key_events -->
<!-- eslint-disable svelte/no-at-html-tags -->
<pre
	onmouseover={(event) => showTooltip(event.target)}
	onmouseout={(event) => hideTooltip(event.target)}
	onfocusin={(event) => showTooltip(event.target)}
	onfocusout={(event) => hideTooltip(event.target)}><code
		>{@html highlighted}</code
	></pre>
<!-- eslint-enable svelte/no-at-html-tags -->

{#if tooltip}
	<div
		class="type-tooltip"
		class:above={tooltip.above}
		style="left: {tooltip.x}px; top: {tooltip.y}px"
	>
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- same escaped highlighter output as above -->
		<pre><code>{@html tooltip.html}</code></pre>
	</div>
{/if}

<style>
	pre {
		margin: 0;
		padding: 1rem 1.25rem;
		text-align: left;
		background: var(--bg-code);
		color: var(--text-code);
		border-radius: 0.75rem;
		overflow-x: auto;
		font-size: 0.85rem;
		line-height: 1.55;
	}

	code {
		font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
	}

	.type-tooltip {
		position: fixed;
		z-index: 40;
		pointer-events: none;
		max-width: min(90vw, 34rem);
	}

	.type-tooltip.above {
		transform: translateY(-100%);
	}

	.type-tooltip pre {
		font-size: 0.78rem;
		padding: 0.75rem 1rem;
		border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
		box-shadow: 0 10px 32px color-mix(in srgb, var(--text) 30%, transparent);
	}

	code :global(.tok-comment) {
		color: #a3968a;
		font-style: italic;
	}

	code :global(.tok-string) {
		color: #a8dcae;
	}

	code :global(.tok-keyword) {
		color: #ff9d73;
	}

	code :global(.tok-literal) {
		color: #f2a2c0;
	}

	code :global(.tok-number) {
		color: #ffd88f;
	}

	code :global(.tok-typename) {
		color: #9cc7ff;
	}

	code :global(.tok-type) {
		color: #9cc7ff;
		text-decoration: underline dotted;
		text-underline-offset: 3px;
	}

	code :global(.tok-type:hover) {
		color: #cbe2ff;
	}
</style>

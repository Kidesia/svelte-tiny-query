<script lang="ts">
	import { queryInfos } from '$lib/index.ts';

	import ApiReference from './ApiReference.svelte';
	import CodeBlock from './demos/CodeBlock.svelte';
	import BasicDemo, { code as basicCode } from './demos/BasicDemo.svelte';
	import ParamsDemo, { code as paramsCode } from './demos/ParamsDemo.svelte';
	import MutationDemo, {
		code as mutationCode
	} from './demos/MutationDemo.svelte';
	import EnabledDemo, { code as enabledCode } from './demos/EnabledDemo.svelte';
	import RetryDemo, { code as retryCode } from './demos/RetryDemo.svelte';
	import SequentialDemo, {
		code as sequentialCode
	} from './demos/SequentialDemo.svelte';
	import CancelDemo, { code as cancelCode } from './demos/CancelDemo.svelte';
	import CacheDemo, { code as cacheCode } from './demos/CacheDemo.svelte';

	const DEMO_SOURCE =
		'https://github.com/Kidesia/svelte-tiny-query/blob/main/src/routes/demos';

	let menuOpen = $state(false);

	const ruleCode = `// ✅ invoke at the top level of the component
const query = useMeme(() => id);

// ✅ conditional? keep the invocation, gate the loading
const query = useMeme(() => id, { enabled: () => visible });

// ❌ not inside $derived or $effect (console warning)
const query = $derived(useMeme(() => id));

// ❌ no plain destructuring — getters lose their reactivity
const { data, loading } = useMeme(() => id);

// ✅ ...unless the query state is wrapped in $derived
const query = useMeme(() => id);
const { data, loading } = $derived(query);`;
</script>

<svelte:head>
	<title>Svelte Tiny Query 🦄</title>
	<meta
		name="description"
		content="Tiny declarative queries for Svelte 5 — caching, deduping, invalidation, retries and cancellation in ~2kB."
	/>
</svelte:head>

<svelte:window
	onkeydown={(event) => event.key === 'Escape' && (menuOpen = false)}
	onhashchange={() => (menuOpen = false)}
/>

<button
	class="menu-button"
	onclick={() => (menuOpen = !menuOpen)}
	aria-expanded={menuOpen}
>
	☰ Menu
</button>

<div class="layout">
	<nav class="sidenav" class:open={menuOpen} aria-label="On this page">
		<button class="menu-close" onclick={() => (menuOpen = false)}>
			✕ Close
		</button>
		<a class="brand" href="#top">🦄 <strong>Svelte Tiny Query</strong></a>
		<div
			class="status"
			class:busy={queryInfos.isLoading}
			title="queryInfos.isLoading"
		>
			<span class="dot"></span>
			{queryInfos.isLoading ? 'loading' : 'idle'}
		</div>
		<span class="group">Guide</span>
		<a href="#first-query">Your first query</a>
		<a href="#params">Reactive parameters</a>
		<a href="#mutations">Mutations</a>
		<a href="#enabled">Dependent queries</a>
		<a href="#retry">Errors and retries</a>
		<a href="#sequential">Sequential queries</a>
		<a href="#cancellation">Cancellation</a>
		<a href="#cache">Cache &amp; GC</a>
		<a href="#the-rule">The one rule</a>
		<span class="group">About</span>
		<a href="#why">Why this library?</a>
		<a href="#omissions">What is left out</a>
		<a href="#differences">vs TanStack Query</a>
		<span class="group">Reference</span>
		<a href="#api-typescript">TypeScript</a>
		<a href="#api-createquery">createQuery</a>
		<a href="#api-sequential">createSequentialQuery</a>
		<a href="#api-invalidate">invalidateQueries</a>
		<a href="#api-update">updateQueryData</a>
		<a href="#api-queryinfos">queryInfos</a>
		<span class="group">Links</span>
		<a href="https://github.com/Kidesia/svelte-tiny-query">GitHub ↗</a>
		<a href="https://www.npmjs.com/package/svelte-tiny-query">npm ↗</a>
	</nav>

	<main>
		<section class="hero" id="top">
			<div class="unicorn" aria-hidden="true">🦄</div>
			<h1>Declarative queries<br />for <em>Svelte&nbsp;5</em></h1>
			<p>
				Caching, deduping, invalidation, retries and cancellation in less than
				2kB — built entirely on Svelte 5's reactivity. No provider, no setup, no
				magic.
			</p>
			<div>
				<CodeBlock code="npm install svelte-tiny-query" />
			</div>
			<p class="hero-links">
				<a href="https://github.com/Kidesia/svelte-tiny-query">GitHub ↗</a>
				<a href="https://www.npmjs.com/package/svelte-tiny-query">npm ↗</a>
			</p>
			<p class="muted">
				Everything on this page is <strong>live</strong>. The idle indicator in
				the navigation is <code>queryInfos.isLoading</code> — it lights up
				whenever
				<em>any</em> query on this page loads. All demos share one fake server with
				~700ms of latency.
			</p>
		</section>

		<section id="first-query" style="--tint: var(--pink)">
			<h2>Your first query</h2>
			<p>
				A query is a <strong>key</strong> plus a
				<strong>loading function</strong> that returns data or an error. Invoke
				it at the top level of a component and you get reactive
				<code>loading</code>, <code>data</code> and <code>error</code> state,
				plus a <code>reload</code> function. If several components use the same
				query, the loading function still runs only once — and all of them share
				the result. In a real app you would define queries once, in a shared
				module, and import them wherever they are used (see
				<a href="#api-keys">Keys</a>).
			</p>
			<div class="demo-grid">
				<div class="demo-card">
					<BasicDemo />
					<a
						class="card-source"
						href="{DEMO_SOURCE}/BasicDemo.svelte"
						target="_blank"
						rel="noreferrer">full source ↗</a
					>
				</div>
				<CodeBlock code={basicCode} />
			</div>
			<p class="tip">
				<span class="tip-icon" aria-hidden="true">🦄</span>
				<span
					>Try reloading — the old list stays visible while the new one loads
					(stale-while-revalidate), and errors are cleared the moment a new load
					starts.</span
				>
			</p>
		</section>

		<section id="params" style="--tint: var(--blue)">
			<h2>Reactive parameters</h2>
			<p>
				Queries can take one parameter, passed as a <strong>thunk</strong> so it
				stays reactive — when it changes, the query switches to the matching
				part of the cache and loads it if needed. Each parameter value gets its
				own cache entry. This demo also sets <code>staleTime: 10_000</code>:
				data younger than 10 seconds is served straight from the cache, without
				a reload.
			</p>
			<div class="demo-grid">
				<div class="demo-card">
					<ParamsDemo />
					<a
						class="card-source"
						href="{DEMO_SOURCE}/ParamsDemo.svelte"
						target="_blank"
						rel="noreferrer">full source ↗</a
					>
				</div>
				<CodeBlock code={paramsCode} />
			</div>
			<p class="tip">
				<span class="tip-icon" aria-hidden="true">🦄</span>
				<span
					>Flip between ideas: the first visit loads, quick revisits are
					instant, and after 10 seconds a revisit reloads in the background.</span
				>
			</p>
		</section>

		<section id="mutations" style="--tint: var(--mint)">
			<h2>Mutations are just functions</h2>
			<p>
				There is no mutation API — write a function that triggers a mutation on
				the server, then call
				<code>invalidateQueries</code> with a key. Every active query under that
				key reloads (keys are hierarchical, so invalidating
				<code>['memes']</code> also hits <code>['memes', '7']</code>). Since the
				cache is global, this list shares its key — and therefore its data —
				with the first demo.
			</p>
			<p>
				And since mutations are plain async functions, their promise is your
				pending state: await it to drive spinners and disable buttons — exactly
				what the “Saving…” button in this demo does.
			</p>
			<div class="demo-grid">
				<div class="demo-card">
					<MutationDemo />
					<a
						class="card-source"
						href="{DEMO_SOURCE}/MutationDemo.svelte"
						target="_blank"
						rel="noreferrer">full source ↗</a
					>
				</div>
				<CodeBlock code={mutationCode} />
			</div>
			<p class="tip">
				<span class="tip-icon" aria-hidden="true">🦄</span>
				<span
					>Add an idea and scroll up — the first demo updated too. Same key,
					same cache.</span
				>
			</p>
		</section>

		<section id="enabled" style="--tint: var(--peach)">
			<h2>Dependent queries</h2>
			<p>
				The <code>enabled</code> option (a reactive getter) holds a query back
				until its prerequisites are ready. While disabled, the query does not
				load, <code>loading</code> is <code>false</code>, and
				<code>reload</code> does nothing. The moment it flips to
				<code>true</code>, loading starts.
			</p>
			<div class="demo-grid">
				<div class="demo-card">
					<EnabledDemo />
					<a
						class="card-source"
						href="{DEMO_SOURCE}/EnabledDemo.svelte"
						target="_blank"
						rel="noreferrer">full source ↗</a
					>
				</div>
				<CodeBlock code={enabledCode} />
			</div>
		</section>

		<section id="retry" style="--tint: var(--butter)">
			<h2>Errors and retries</h2>
			<p>
				Errors are <strong>returned, not thrown</strong>: the loading function
				produces either data or an error (the <code>succeed</code> and
				<code>fail</code> helpers construct the two shapes), which is why
				<code>query.error</code> is fully typed instead of the
				<code>unknown</code> of a catch block. A failed reload keeps the
				previous <code>data</code> visible — stale-while-revalidate — and the error
				is cleared the moment the next load starts.
			</p>
			<p>
				With the <code>retry</code> option, failed loads are retried with exponential
				backoff (1s, 2s, 4s, … capped at 30s). Retrying is invisible from the outside:
				the query simply stays in its loading state, intermediate errors are never
				exposed, and only the final result is stored.
			</p>
			<div class="demo-grid">
				<div class="demo-card">
					<RetryDemo />
					<a
						class="card-source"
						href="{DEMO_SOURCE}/RetryDemo.svelte"
						target="_blank"
						rel="noreferrer">full source ↗</a
					>
				</div>
				<CodeBlock code={retryCode} />
			</div>
			<p class="tip">
				<span class="tip-icon" aria-hidden="true">🦄</span>
				<span
					>The hopeless variant fails all three attempts and lands in the error
					state after the backoff runs out.</span
				>
			</p>
		</section>

		<section id="sequential" style="--tint: var(--lavender)">
			<h2>Sequential queries</h2>
			<p>
				<code>createSequentialQuery</code> is the cursor-based sibling of
				<code>createQuery</code>, for pagination and load-more lists. The
				loading function receives a cursor and returns one page plus the next
				cursor — returning <code>undefined</code> means there is no more data.
				The pages accumulate in <code>data</code>, an array of pages.
			</p>
			<div class="demo-grid">
				<div class="demo-card">
					<SequentialDemo />
					<a
						class="card-source"
						href="{DEMO_SOURCE}/SequentialDemo.svelte"
						target="_blank"
						rel="noreferrer">full source ↗</a
					>
				</div>
				<CodeBlock code={sequentialCode} />
			</div>
		</section>

		<section id="cancellation" style="--tint: var(--pink)">
			<h2>Cancellation</h2>
			<p>
				Every loading function receives an <code>AbortSignal</code>.
				Invalidating a query that is currently loading cancels the in-flight
				load — its result is discarded entirely — and starts a fresh one, so a
				response from before the invalidation can never sneak into the cache.
				Pass the signal to <code>fetch</code> to abort the request itself.
			</p>
			<div class="demo-grid">
				<div class="demo-card">
					<CancelDemo />
					<a
						class="card-source"
						href="{DEMO_SOURCE}/CancelDemo.svelte"
						target="_blank"
						rel="noreferrer">full source ↗</a
					>
				</div>
				<CodeBlock code={cancelCode} />
			</div>
			<p class="tip">
				<span class="tip-icon" aria-hidden="true">🦄</span>
				<span
					>Start the slow load, then invalidate mid-flight and watch the log:
					the first load is cancelled, and only the fresh result is stored.</span
				>
			</p>
		</section>

		<section id="cache" style="--tint: var(--blue)">
			<h2>The cache and garbage collection</h2>
			<p>
				Cached data lives through three stages: <strong>fresh</strong> (served
				without reloading), <strong>stale</strong> (shown instantly, reloaded on
				use) and — if you opt in with <code>gcTime</code> —
				<strong>gone</strong>. A query is evicted <code>gcTime</code>
				milliseconds after it is both <em>unused</em> and <em>stale</em>; fresh
				data is never collected. Without <code>gcTime</code>, the cache is kept
				for the lifetime of the app, which is fine for most queries.
			</p>
			<p>To be precise, a query loads when:</p>
			<ul>
				<li>it is first used (unless fresh cached data exists),</li>
				<li>its key changes, via a reactive parameter,</li>
				<li>it is used again (e.g. remounted) and its data is stale,</li>
				<li>it is invalidated via <code>invalidateQueries</code>,</li>
				<li>its <code>reload</code> function is called.</li>
			</ul>
			<p>
				Identical loads are always <strong>deduplicated</strong>: one key, at
				most one load in flight, no matter how many components ask.
			</p>
			<div class="demo-grid">
				<div class="demo-card">
					<CacheDemo />
					<a
						class="card-source"
						href="{DEMO_SOURCE}/CacheDemo.svelte"
						target="_blank"
						rel="noreferrer">full source ↗</a
					>
				</div>
				<CodeBlock code={cacheCode} />
			</div>
			<p class="tip">
				<span class="tip-icon" aria-hidden="true">🦄</span>
				<span
					>Unmount the component and watch the cache entry vanish after 5
					seconds — then remount within the window and see the eviction get
					cancelled.</span
				>
			</p>
		</section>

		<section id="the-rule" style="--tint: var(--butter)">
			<h2>The one rule</h2>
			<p>
				Query functions must be invoked at the
				<strong>top level of a component</strong> — not inside
				<code>$derived</code> or <code>$effect</code>, not in an event handler,
				and not in an <code>&lbrace;#each&rbrace;</code> expression. Invoking a query
				wires it into the component's lifecycle (that is how loading is triggered,
				and how the query counts as active), so it has to happen while the component
				is being set up. The library logs a console warning when it detects a misuse.
			</p>
			<CodeBlock code={ruleCode} />
			<p>
				Everything you would reach into a reactive context for has a declarative
				counterpart:
			</p>
			<ul>
				<li>
					<strong>Reactive parameters</strong> are thunks:
					<code>useMeme(() => id)</code>.
				</li>
				<li>
					<strong>Conditional loading</strong> is the <code>enabled</code>
					getter — the invocation stays, the loading is gated.
				</li>
				<li>
					<strong>A query per list item</strong> means invoking the query inside
					a child component rendered by the list.
				</li>
				<li>
					<strong>Destructuring</strong> wants a <code>$derived</code> wrapper:
					plain destructuring captures a one-time snapshot (as with any reactive
					<code>$state</code> object), while
					<code>const &lbrace; data &rbrace; = $derived(query)</code> keeps every
					binding reactive.
				</li>
			</ul>
			<p class="muted">
				This rule is the price of the declarative model, and it is not unique to
				this library: React Query users know it as the rules of hooks, and
				TanStack's Svelte adapter must also be created during component
				initialization.
			</p>
		</section>

		<section id="why" style="--tint: var(--mint)">
			<h2>Why this library?</h2>
			<p>
				Svelte Tiny Query was first conceived when Svelte 5 was still in beta,
				embedded in a very young app (that we still going strong today). It is
				inspired by <a href="https://tanstack.com/query">TanStack Query</a> — which
				at the time had no Svelte 5 adapter. After copying it from codebase to codebase
				for a while, we decided to extract it into this library.
			</p>
			<p>
				TanStack Query has long since caught up: its
				<a
					href="https://tanstack.com/query/latest/docs/framework/svelte/overview"
					>Svelte adapter</a
				>
				supports Svelte 5 today and offers capabilities beyond this library — SSR
				hydration, offline support, devtools and more. If you need those, use it,
				it is excellent. We keep using Svelte Tiny Query because its small surface
				fits our apps (and our heads).
			</p>

			<h3>A note on AI</h3>
			<p>
				Version 1.0 of Svelte Tiny Query was designed and written entirely by
				hand, before AI assistance was part of our workflow. Since then, AI has
				assisted the development — hunting edge cases, writing regression tests
				and helping with fixes and features — while the design and direction of
				the library remain human decisions. This docs page was also built with
				the help of AI.
			</p>
		</section>

		<section id="omissions" style="--tint: var(--peach)">
			<h2>What is left out (on purpose)</h2>
			<p>
				This library is tiny — honestly, more by accident than by discipline.
				Svelte 5's reactivity solves caching almost by itself, so about 2kB, no
				dependencies and a handful of concepts (a key, a loading function, one
				global cache) is simply what was left to write. The deliberate part is
				<em>staying</em> this way: when a feature would require a new concept, we
				would rather leave it out and show you the few lines of Svelte that do the
				same thing.
			</p>
			<ul class="omissions">
				<li>
					<strong>No query provider</strong>
					The cache is global — there is nothing to set up.
				</li>
				<li>
					<strong>No mutation API</strong>
					Mutations are plain async functions. Await the promise to drive spinners
					and disabled states with local <code>$state</code>, then call
					<code>invalidateQueries</code>
					(or the experimental
					<code>updateQueryData</code>) once the server is done.
				</li>
				<li>
					<strong>No window-focus or interval reloading</strong>
					An <code>$effect</code> with <code>addEventListener</code> or
					<code>setInterval</code> calling <code>reload</code> does this in three
					lines, exactly the way you want it.
				</li>
				<li>
					<strong>No query-chaining API</strong>
					When one query needs the result of another, point its
					<code>enabled</code> getter at the first query's state:
					<code
						>usePosts(() => user.data.id, &lbrace; enabled: () => !!user.data
						&rbrace;)</code
					>. No extra concept needed (see “Dependent queries” above).
				</li>
				<li>
					<strong>No select or subscription slicing</strong>
					The query state is deeply reactive, so only the parts of the UI that actually
					use a changed value update. Where you would reach for select,
					<code>$derived</code>
					already does it:
					<code>$derived(query.data?.name)</code> only reacts when the name changes.
				</li>
				<li>
					<strong>No devtools</strong>
					<code>queryInfos</code> exposes the primitive (loading, active and cached
					queries); build the panel your app actually needs.
				</li>
				<li>
					<strong>No SSR fetching or cache hydration</strong>
					This one is honestly out of scope rather than a few lines of DIY. Loading
					happens in <code>$effect</code>, which only runs in the browser —
					during SSR, queries render in their loading state (or with their
					<code>initialData</code>) and fetch after hydration. That is also why
					the global module-level cache is harmless on the server.
				</li>
			</ul>
		</section>

		<section id="differences" style="--tint: var(--blue)">
			<h2>Differences to TanStack Query</h2>
			<p>
				Missing features are listed above — this is about the things both
				libraries do, done differently. If you come from TanStack Query, these
				are the behaviors to re-learn:
			</p>
			<ul class="omissions">
				<li>
					<strong>Errors are returned, not thrown</strong>
					The loading function returns <code>fail(error)</code> instead of
					throwing, which is why <code>query.error</code> is fully typed. A
					thrown exception is treated as a bug (a <em>defect</em>): it is
					reported to your error monitoring, and the typed error state stays
					untouched.
				</li>
				<li>
					<strong>Retries are invisible</strong>
					Where TanStack exposes <code>failureCount</code> and
					<code>failureReason</code>, here a retrying query is simply still
					loading — only the final result is stored.
				</li>
				<li>
					<strong>Garbage collection only evicts stale data</strong>
					TanStack's <code>gcTime</code> evicts inactive queries regardless of
					freshness. Here, a query is evicted once it has been both unused and
					stale — fresh data is never collected, so a long
					<code>staleTime</code> cannot be undermined by eviction.
				</li>
				<li>
					<strong>One global cache instead of a QueryClient</strong>
					There is no client object and no provider — the cache is a module-level
					singleton, which is exactly what a client-rendered app needs (and part
					of why SSR is out of scope).
				</li>
				<li>
					<strong>One parameter instead of a query-key array</strong>
					Queries take a single serializable parameter that is appended to the key
					automatically — instead of encoding all inputs into the
					<code>queryKey</code> by hand.
				</li>
			</ul>
			<p>
				And much is deliberately the same: stale-while-revalidate, deduplication
				of identical loads, hierarchical keys and invalidation, and the
				invoke-at-the-top-level rule (their rules of hooks). If you know
				TanStack Query, you already know how this library thinks.
			</p>
		</section>

		<section id="api" style="--tint: var(--lavender)">
			<h2>API Reference</h2>
			<p>
				The whole library: two query constructors, two cache tools, two helpers
				and one readonly object. This is everything.
			</p>
			<ApiReference />
		</section>

		<p class="colophon muted">
			Built with 🦄 by <a href="https://github.com/Kidesia">Kidesia</a>.
		</p>
	</main>
</div>

<style>
	.brand {
		display: block;
		margin-bottom: 1rem;
		font-size: 0.95rem;
		color: var(--text);
		text-decoration: none;
	}

	.brand:hover {
		color: var(--accent);
	}

	.status {
		font-family: var(--font-sans);
		width: fit-content;
		margin-bottom: 1.25rem;
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.8rem;
		color: var(--text-muted);
		border: 1px solid var(--border);
		border-radius: 1rem;
		padding: 0.1rem 0.7rem;
	}

	.dot {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
		background: var(--border);
	}

	.status.busy .dot {
		background: var(--accent);
		animation: pulse 1s infinite;
	}

	@keyframes pulse {
		50% {
			opacity: 0.3;
		}
	}

	.layout {
		display: grid;
		grid-template-columns: 14rem minmax(0, 1fr);
		gap: 0 2.5rem;
		max-width: 86rem;
		margin: 0 auto;
		padding: 0 1.5rem;
	}

	.sidenav {
		font-family: var(--font-sans);
		position: sticky;
		top: 0;
		align-self: start;
		max-height: 100vh;
		overflow-y: auto;
		padding: 1.5rem 0 2rem;
		font-size: 0.82rem;
	}

	.sidenav .group {
		display: block;
		margin: 1.5rem 0 0.4rem;
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.sidenav .group:first-child {
		margin-top: 0;
	}

	.sidenav a {
		display: block;
		padding: 0.15rem 0.7rem;
		color: var(--text-muted);
		text-decoration: none;
		border-left: 2px solid var(--border);
	}

	.sidenav a:hover {
		color: var(--accent);
		border-left-color: var(--accent);
	}

	.menu-button,
	.menu-close {
		display: none;
	}

	@media (max-width: 64rem) {
		.layout {
			grid-template-columns: 1fr;
			padding: 0 1rem;
		}

		/* On narrow screens a floating menu button opens the
		   sidenav as an overlay panel */
		.menu-button {
			display: block;
			position: fixed;
			top: 1rem;
			right: 1rem;
			z-index: 20;
			box-shadow: 0 2px 12px color-mix(in srgb, var(--text) 15%, transparent);
		}

		.sidenav {
			display: none;
		}

		.sidenav.open {
			display: block;
			position: fixed;
			inset: 0;
			z-index: 30;
			max-height: none;
			overflow-y: auto;
			background: var(--bg);
			padding: 1.25rem 1.5rem 2rem;
			font-size: 1rem;
			animation: menu-in 0.15s ease-out;
		}

		.sidenav.open a {
			padding: 0.35rem 0.7rem;
		}

		.menu-close {
			display: block;
			margin-left: auto;
		}
	}

	@keyframes menu-in {
		from {
			opacity: 0;
			transform: translateY(-0.5rem);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.sidenav.open {
			animation: none;
		}
	}

	main {
		min-width: 0;
		padding: 1rem 0 3rem;
	}

	.hero {
		position: relative;
		text-align: center;
		max-width: 46rem;
		margin: 3.5rem auto 4rem;
	}

	.hero::before {
		content: '';
		position: absolute;
		/* never wider than the viewport, so mobile browsers do not zoom out */
		inset: -6rem max(-10rem, -4vw);
		background:
			radial-gradient(
				24rem 16rem at 20% 20%,
				color-mix(in srgb, var(--peach) 60%, transparent),
				transparent 70%
			),
			radial-gradient(
				22rem 15rem at 80% 10%,
				color-mix(in srgb, var(--pink) 55%, transparent),
				transparent 70%
			),
			radial-gradient(
				26rem 17rem at 55% 90%,
				color-mix(in srgb, var(--butter) 55%, transparent),
				transparent 70%
			);
		filter: blur(24px);
		z-index: -1;
		pointer-events: none;
	}

	.unicorn {
		font-size: 4.5rem;
		line-height: 1;
		animation: float 4s ease-in-out infinite;
	}

	@keyframes float {
		50% {
			transform: translateY(-0.6rem) rotate(-8deg);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.unicorn {
			animation: none;
		}
	}

	.hero h1 {
		font-size: clamp(2.2rem, 5.5vw, 3.4rem);
		margin: 0.5rem 0;
	}

	.hero em {
		font-style: normal;
		background: linear-gradient(120deg, var(--accent), #ff8a3c, #ffc46b);
		background-clip: text;
		-webkit-background-clip: text;
		color: transparent;
	}

	.hero-links {
		display: flex;
		justify-content: center;
		gap: 0.75rem;
	}

	.hero-links a {
		font-family: var(--font-sans);
		font-size: 0.9rem;
		text-decoration: none;
		border: 1px solid var(--border);
		border-radius: 999px;
		padding: 0.3rem 1rem;
		background: var(--bg-card);
	}

	.hero-links a:hover {
		border-color: var(--accent);
	}

	section {
		margin: 4.5rem 0;
	}

	h2 {
		font-size: 1.6rem;
		margin: 0.75rem 0 1rem;
	}

	.demo-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		align-items: stretch;
		margin: 1.5rem 0 1rem;
		border: 1px solid var(--border);
		border-radius: 1rem;
		overflow: hidden;
		box-shadow: 0 4px 20px color-mix(in srgb, var(--tint) 25%, transparent);
	}

	.demo-grid > :global(pre) {
		border-radius: 0;
	}

	.demo-grid > * {
		/* wide content scrolls inside the cards, the columns stay 50/50 */
		min-width: 0;
	}

	@media (max-width: 56rem) {
		.demo-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 40rem) {
		section {
			margin: 3rem 0;
		}

		.hero {
			margin: 2rem auto 2.5rem;
		}
	}

	.demo-card {
		display: flex;
		flex-direction: column;
		font-family: var(--font-sans);
		background: var(--bg-card);
		padding: 1.5rem;
	}

	/* bare buttons from demo components should not stretch full width */
	.demo-card > :global(button) {
		align-self: flex-start;
	}

	.tip {
		display: flex;
		gap: 0.85rem;
		align-items: center;
		background: var(--lavender);
		border-radius: 0.75rem;
		padding: 0.9rem 1.25rem;
		font-size: 1.05rem;
		line-height: 1.4;
		font-family: 'Comic Neue', 'Bradley Hand', 'Segoe Print', cursive;
		color: var(--tip-text);
	}

	.tip-icon {
		/* two text lines tall, flipped to look at its tip */
		font-size: 2.6rem;
		line-height: 1;
		transform: scaleX(-1);
	}

	.omissions li {
		margin-bottom: 1.3rem;
	}

	.omissions strong {
		display: block;
	}

	.card-source {
		margin-top: auto;
		align-self: flex-end;
		padding-top: 0.75rem;
		font-size: 0.75rem;
		color: var(--text-muted);
		text-decoration: none;
	}

	.card-source:hover {
		color: var(--accent);
		text-decoration: underline;
	}

	.colophon {
		text-align: center;
		margin: 5rem 0 2rem;
		font-size: 0.9rem;
	}
</style>

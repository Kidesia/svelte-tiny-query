<script module lang="ts">
	const TYPE_DEFS: Record<string, string> = {
		LoadResult: `type LoadResult<TData, TError> =
  | { success: true; data: TData }
  | { success: false; error: TError };`,
		QueryState: `type QueryState<TData, TError> = {
  loading: boolean;
  data: TData | undefined; // TData, if initialData was provided
  error: TError | undefined;
  loadedTimeStamp: number | undefined;
  staleTimeStamp: number | undefined;
  enabled: boolean;
  reload: () => void;
};`,
		QueryInvokeOptions: `type QueryInvokeOptions = {
  enabled?: () => boolean;
};`,
		QueryParam: `type QueryParam = // any serializable value
  | string | number | boolean | bigint | symbol
  | null | undefined | Date | RegExp
  | QueryParam[] | { [key: string]: QueryParam };`,
		QueryPersister: `type QueryPersister<TData> = {
  get: (key: string[]) => TData | undefined | Promise<TData | undefined>;
  set: (key: string[], data: TData) => void | Promise<void>;
  remove: (key: string[]) => void | Promise<void>;
};`,
		SequentialLoadResult: `type SequentialLoadResult<TData, TCursor, TError> =
  | { success: true; data: TData; cursor: TCursor | undefined }
  | { success: false; error: TError };`,
		SequentialQueryState: `type SequentialQueryState<TData, TError> = {
  loading: boolean;
  data: TData[] | undefined; // an array of pages
  error: TError | undefined;
  hasMore: boolean | undefined;
  loadedTimeStamp: number | undefined;
  staleTimeStamp: number | undefined;
  enabled: boolean;
  loadMore: () => void;
  reload: () => void;
};`
	};

	const typesBlock = Object.values(TYPE_DEFS).join('\n\n');

	const createQueryType = `function createQuery<TError, TParam extends QueryParam, TData>(
  key: string[] | ((param: TParam) => string[]),
  loadFn: (param: TParam, signal: AbortSignal) => Promise<LoadResult<TData, TError>>,
  options?: { initialData?: TData; staleTime?: number; gcTime?: number; retry?: number;
    persister?: QueryPersister<TData> }
): (param?: TParam | (() => TParam), options?: QueryInvokeOptions) => QueryState<TData, TError>;`;

	const sequentialType = `function createSequentialQuery<TError, TParam extends QueryParam, TData, TCursor>(
  key: string[] | ((param: TParam) => string[]),
  loadFn: (param: TParam, cursor: TCursor | undefined, signal: AbortSignal) =>
    Promise<SequentialLoadResult<TData, TCursor, TError>>,
  options?: { initialData?: TData[]; staleTime?: number; gcTime?: number; retry?: number }
): (param?: TParam | (() => TParam), options?: QueryInvokeOptions) => SequentialQueryState<TData, TError>;`;

	const invalidateType = `function invalidateQueries(
  key: string[],
  options?: { force?: boolean; exact?: boolean }
): void;`;

	const updateType = `function updateQueryData(
  key: string[],
  updater: (currentData: unknown) => unknown
): void;`;

	const queryInfosType = `const queryInfos: {
  isLoading: boolean;
  loadingQueries: string[][];
  activeQueries: string[][];
  cachedQueries: string[][];
};`;

	const createQuerySig = `const useMemeIdea = createQuery(
  // a key, which identifies the data in the cache
  ['meme-idea'],

  // a loading function, which produces the data (or an error)
  async (id, signal) => {
    try {
      return succeed(await fetchMemeIdea(id, signal));
    } catch {
      return fail('Could not load 😢');
    }
  },

  // options — all optional, explained below
  { staleTime: 10_000, gcTime: 60_000, retry: 2 }
);

// invoking it (at the top level!) returns the reactive query state
const query = useMemeIdea(() => id, { enabled: () => loggedIn });`;

	const helpersSig = `succeed(data); // returns { success: true, data }
fail(error);   // returns { success: false, error }`;

	const keysExample = `// Array key: the serialized param is appended automatically
const useMeme = createQuery(['memes'], loadFn);
useMeme(() => 7);         // cached as ['memes', '7']
useMeme(() => ({ id: 7 })); // cached as ['memes', '{"id":7}']

// Key function: full control, e.g. for nested keys
const useComments = createQuery(
  (id: number) => ['memes', String(id), 'comments'],
  loadFn
);`;

	const sequentialSig = `const useComments = createSequentialQuery(
  ['comments'],

  // the loading function receives a cursor (undefined for the first page)
  async (_, cursor, signal) => {
    const page = await fetchComments(cursor ?? 0);
    return {
      success: true,
      data: page.items,
      cursor: page.next // undefined = no more pages
    };
  },

  // same options as createQuery — but staleTime defaults to Infinity
  { staleTime: Infinity }
);

const query = useComments();`;

	const organizeExample = `// lib/queries.ts — one definition per resource
export const useMemeIdea = createQuery(['meme-idea'], loadMemeIdea);
export const useComments = createSequentialQuery(['comments'], loadComments);

// in any component: import and invoke
import { useMemeIdea } from '$lib/queries';

const query = useMemeIdea(() => id);`;

	const invalidateExample = `invalidateQueries(['memes']);
// ...matches ['memes'] and all children, like ['memes', '7']

invalidateQueries(['memes', '7'], { exact: true });
// ...matches only exactly ['memes', '7']

invalidateQueries(['memes'], { force: true });
// ...additionally forgets all cached state right away`;

	const updateExample = `updateQueryData(['memes', '7'], (current) => ({
  ...(current as Meme),
  title: 'A better title'
}));`;

	const typescriptExample = `const useMeme = createQuery(['memes'], async (id: number) => {
  try {
    return succeed(await fetchMeme(id)); // infers TData: Meme
  } catch {
    return fail('Could not load meme');  // infers TError: string
  }
});

const query = useMeme(() => 7); // param must be a number

query.data;  // Meme | undefined
query.error; // string | undefined`;
</script>

<script lang="ts">
	import CodeBlock from './demos/CodeBlock.svelte';
</script>

<h3 id="api-typescript">TypeScript</h3>

<p>
	The library is written in TypeScript and designed for inference: annotate the
	loading function's parameter, and everything else follows. The data type flows
	from what you <code>succeed</code> with, the error type from what you
	<code>fail</code> with, and both arrive fully typed on the query state — in everyday
	use you never write a generic.
</p>

<CodeBlock code={typescriptExample} />

<p>Where the types are specific on purpose:</p>

<ul>
	<li>
		<strong>Errors are typed values.</strong> Because loading functions return
		errors instead of throwing them, <code>query.error</code> is your
		<code>TError</code> — not the <code>unknown</code> of a catch block.
	</li>
	<li>
		<strong>TError comes first in the generics list.</strong>
		The error type is the one you most often want to pin down explicitly (e.g. to
		a shared <code>ApiError</code>), so it can be given without spelling out the
		rest: <code>createQuery&lt;ApiError&gt;(key, loadFn)</code>
		— param and data are still inferred.
	</li>
	<li>
		<strong>initialData narrows data.</strong>
		When it is provided, an overload types <code>query.data</code> as
		<code>TData</code> instead of <code>TData | undefined</code>.
	</li>
	<li>
		<strong>Params must be serializable.</strong> The parameter type is
		constrained to <code>QueryParam</code> — passing something that cannot become
		part of a cache key is a type error, not a silent bug.
	</li>
</ul>

<p>
	These are the exported types that the reference below is written in. Whenever
	one of them appears in a signature, you can
	<strong>hover it</strong> to see its definition again (or click it to come back
	here):
</p>

<CodeBlock code={typesBlock} />

<h3 id="api-createquery">createQuery</h3>

<CodeBlock code={createQueryType} types={TYPE_DEFS} />

<p>
	Creates a query function. Invoke it at the top level of a component to get
	reactive access to the query state. In practice it looks like this:
</p>

<CodeBlock code={createQuerySig} />

<h4>Options</h4>

<div class="table-wrap">
	<table>
		<thead>
			<tr><th>Option</th><th>Default</th><th>What it does</th></tr>
		</thead>
		<tbody>
			<tr>
				<td>staleTime</td>
				<td>0</td>
				<td>
					How long (in milliseconds) loaded data counts as <strong>fresh</strong
					>. Fresh data is served from the cache without reloading; stale data
					is shown immediately but reloaded in the background when the query is
					used again. <code>Infinity</code> means the data never goes stale.
				</td>
			</tr>
			<tr>
				<td>initialData</td>
				<td>undefined</td>
				<td>
					The value of <code>data</code> before the first load. Providing it
					narrows the type of <code>data</code> from
					<code>TData | undefined</code> to <code>TData</code>. Useful for
					persisted or precomputed data.
				</td>
			</tr>
			<tr>
				<td>gcTime</td>
				<td>no eviction</td>
				<td>
					Enables garbage collection: the cached state is evicted
					<code>gcTime</code> milliseconds after the query is both
					<strong>unused</strong> (in no mounted component) and
					<strong>stale</strong>. Fresh data is never collected, so with
					<code>staleTime: Infinity</code> the cache lives forever. Set it on queries
					whose parameter space is unbounded (search input, per-item views).
				</td>
			</tr>
			<tr>
				<td>retry</td>
				<td>0</td>
				<td>
					How many times a failed load is retried before the error is stored.
					Backoff is exponential: 1s, 2s, 4s, … capped at 30s. Retrying is
					invisible — the query stays in its loading state and only the final
					result lands.
				</td>
			</tr>
			<tr>
				<td>persister</td>
				<td>undefined</td>
				<td>
					Persists the query's data outside the in-memory cache, e.g. in
					<code>localStorage</code>. <code>get(key)</code> restores the data of
					a query that has none cached yet — it is shown right away but counts
					as stale, so the load still runs. <code>set(key, data)</code> is
					called with the data of every successful load, and
					<code>remove(key)</code> when the query is invalidated with
					<code>force: true</code>. All functions receive the cache key as an
					array of strings and may be sync or async; serialization is up to the
					persister.
				</td>
			</tr>
		</tbody>
	</table>
</div>

<h4>The query function</h4>

<p>
	The returned function takes the parameter (as a plain value or as a thunk —
	use a thunk whenever the parameter is reactive) and optional invoke options.
	<code>enabled</code> is a reactive getter: while it returns
	<code>false</code>, the query does not load, <code>loading</code> is
	<code>false</code>, and <code>reload</code> does nothing. It returns the reactive
	query state:
</p>

<div class="table-wrap">
	<table>
		<thead>
			<tr><th>Field</th><th>Type</th><th>Behavior</th></tr>
		</thead>
		<tbody>
			<tr>
				<td>loading</td>
				<td>boolean</td>
				<td>True while a load (including its retries) is running.</td>
			</tr>
			<tr>
				<td>data</td>
				<td>TData | undefined</td>
				<td>
					The last successful data. Stays visible during reloads and even when a
					later load fails (stale-while-revalidate). Loaded
					<code>null</code> values are preserved, they do not fall back to
					<code>initialData</code>.
				</td>
			</tr>
			<tr>
				<td>error</td>
				<td>TError | undefined</td>
				<td>
					The error of the last failed load. Cleared the moment a new load
					starts.
				</td>
			</tr>
			<tr>
				<td>loadedTimeStamp</td>
				<td>number | undefined</td>
				<td>When the current data was stored (epoch milliseconds).</td>
			</tr>
			<tr>
				<td>staleTimeStamp</td>
				<td>number | undefined</td>
				<td>When the current data goes (or went) stale.</td>
			</tr>
			<tr>
				<td>enabled</td>
				<td>boolean</td>
				<td>The current value of the <code>enabled</code> invoke option.</td>
			</tr>
			<tr>
				<td>reload</td>
				<td>() =&gt; void</td>
				<td>
					Triggers a load. A no-op while the query is disabled or a load for the
					same key is already running (loads are never concurrent per key).
				</td>
			</tr>
		</tbody>
	</table>
</div>

<h3 id="api-loadfn">The loading function</h3>

<p>
	The loading function receives the parameter and an
	<code>AbortSignal</code>, and returns a <code>LoadResult</code> (see the types
	above) — errors are <strong>returned, not thrown</strong>, so wrap throwing
	code in <code>try</code>/<code>catch</code>. The two helpers construct the two
	shapes:
</p>

<CodeBlock code={helpersSig} />

<p>
	The signal aborts when the library cancels the load — currently when the query
	is invalidated while loading. Pass it to <code>fetch</code> to abort the request
	over the network; even if you ignore it, the result of a cancelled load is always
	discarded (no data, error or timestamps are stored).
</p>

<p>
	If a loading function throws anyway, that is treated as a
	<strong>defect</strong> — a bug, not an expected error:
	<code>query.error</code> stays untouched (and typed), the previous data is
	kept, the loading state recovers, and the exception is reported to the global
	error handlers via <code>reportError</code>, where monitoring tools like
	Sentry pick it up.
</p>

<h3 id="api-keys">Keys and serialization</h3>

<p>
	The key uniquely identifies the data of a query in the global cache — two
	queries with the same key share their state (and overwrite each other, so keep
	keys unique per resource). Parameters are serialized deterministically: object
	keys are sorted, and
	<code>string</code>, <code>number</code>, <code>boolean</code>,
	<code>bigint</code>, <code>Date</code>, <code>RegExp</code>, arrays and plain
	objects are supported.
</p>

<CodeBlock code={keysExample} />

<p>
	Nested keys enable <strong>hierarchical invalidation</strong>: invalidating
	<code>['memes']</code> also hits <code>['memes', '7', 'comments']</code>.
</p>

<p>
	Because keys must be unique, each resource should have exactly
	<strong>one query definition</strong> — never create two queries with the same
	key but different loading functions, or they will fight over the same cache
	entry. The easy way to guarantee this: define your queries in a shared module
	and import them wherever they are used. Creating a query registers no
	reactivity (only <em>invoking</em> it does), so module level is exactly where definitions
	belong.
</p>

<CodeBlock code={organizeExample} />

<h3 id="api-sequential">createSequentialQuery</h3>

<CodeBlock code={sequentialType} types={TYPE_DEFS} />

<p>
	The cursor-based sibling of <code>createQuery</code> for pagination. In practice:
</p>

<CodeBlock code={sequentialSig} />

<p>Its state differs from a normal query in a few ways:</p>

<div class="table-wrap">
	<table>
		<thead>
			<tr><th>Field</th><th>Type</th><th>Behavior</th></tr>
		</thead>
		<tbody>
			<tr>
				<td>data</td>
				<td>TData[] | undefined</td>
				<td>An array of <strong>pages</strong>, one entry per load.</td>
			</tr>
			<tr>
				<td>hasMore</td>
				<td>boolean | undefined</td>
				<td>
					Whether the last load returned a cursor. <code>undefined</code> while loading.
				</td>
			</tr>
			<tr>
				<td>loadMore</td>
				<td>() =&gt; void</td>
				<td>
					Loads the next page with the current cursor. A no-op when there is no
					more data, while disabled, or while a load is running.
				</td>
			</tr>
			<tr>
				<td>reload</td>
				<td>() =&gt; void</td>
				<td>Discards all pages and reloads from the start (one page).</td>
			</tr>
		</tbody>
	</table>
</div>

<p>Two behavioral differences worth knowing:</p>

<ul>
	<li>
		<code>staleTime</code> defaults to <code>Infinity</code> — using a
		sequential query again does not automatically reload it, because that reload
		refetches <em>all</em> current pages in order (stopping early if the data shrank).
		Failed multi-page reloads keep the previous pages and cursor consistent.
	</li>
	<li>
		Cursor and <code>hasMore</code> are only updated after a load fully succeeds.
	</li>
</ul>

<h3 id="api-invalidate">invalidateQueries</h3>

<CodeBlock code={invalidateType} />

<CodeBlock code={invalidateExample} />

<p>
	Invalidated queries are marked stale, and the <strong>active</strong> ones
	(used in a mounted component) reload immediately — deduplicated, so a query
	used by five components loads once. If a matching query is loading at that
	moment, the in-flight load is cancelled and a fresh one starts, so responses
	that predate the invalidation are never stored. With
	<code>force: true</code>, all cached state (data, errors, timestamps) is
	forgotten immediately instead of being kept while reloading.
</p>

<h3 id="api-update">
	updateQueryData <span class="chip">experimental</span>
</h3>

<CodeBlock code={updateType} />

<CodeBlock code={updateExample} />

<p>
	Directly rewrites the cached data of all <strong>active</strong> queries whose
	key starts with the given key — the building block for optimistic updates. The
	API is experimental and may change.
</p>

<h3 id="api-queryinfos">queryInfos</h3>

<CodeBlock code={queryInfosType} />

<div class="table-wrap">
	<table>
		<thead>
			<tr><th>Field</th><th>Type</th><th>Behavior</th></tr>
		</thead>
		<tbody>
			<tr>
				<td>isLoading</td>
				<td>boolean</td>
				<td>
					True while any query is loading — perfect for a global indicator like
					the one in this page's navigation.
				</td>
			</tr>
			<tr>
				<td>loadingQueries</td>
				<td>string[][]</td>
				<td>The keys of all currently loading queries.</td>
			</tr>
			<tr>
				<td>activeQueries</td>
				<td>string[][]</td>
				<td>The keys of all queries used in currently mounted components.</td>
			</tr>
			<tr>
				<td>cachedQueries</td>
				<td>string[][]</td>
				<td>The keys of all queries that currently have cached data.</td>
			</tr>
		</tbody>
	</table>
</div>

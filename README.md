# Svelte Tiny Query 🦄

Define declarative queries that handle caching, deduping and reloading, and help you simplify your codebase. Built on **Svelte 5's reactivity**, it's _tiny_ (~2kB gzipped) and fully type-safe.

**Features**

- 🚀 Declarative and reactive queries
- 💾 Caching and stale-time support
- 👬 Deduplication of identical loads
- 🚧 Query invalidation from anywhere
- 📜 Sequential queries (pagination, load-more)
- 🐍 Written in TypeScript

## Usage

In your **Svelte 5** project, install the library.

    npm install svelte-tiny-query --save

And use it in your components.

```svelte
<script>
  import { createQuery } from 'svelte-tiny-query';

  // A query that represents the "meme-idea" resource
  const useMemeIdea = createQuery(
    // Key which uniquely identifies the resource
    ['meme-ideas'],
    // Loading function which returns data or an error
    async (id) => {
      try {
        const memeIdea = await fetchMemeIdea(id);
        return { success: true, data: memeIdea };
      } catch (e) {
        return { success: false, error: 'Oopsie!' };
      }
    }
  );

  let currentId = $state(1);

  // Invoke the query at the top level of your component.
  // Reactive params are passed as functions ("thunks").
  const memeIdeaQuery = useMemeIdea(() => currentId);
</script>

{#if memeIdeaQuery.loading}
  Loading...
{:else if memeIdeaQuery.error}
  Error: {memeIdeaQuery.error}
{:else}
  Data: {JSON.stringify(memeIdeaQuery.data)}
{/if}

<button onclick={memeIdeaQuery.reload}>Reload</button>
<button onclick={() => currentId++}>Next Meme Idea</button>
```

## Basics

### The Query

A **query** is an abstraction for loading and caching data. It consists of a **loading function** which produces some data, and a **unique key** which identifies that data. Queries expose their reactive state (`data`, `error`, `loading` and more), along with a `reload` function.

Svelte Tiny Query uses Svelte 5's `$state` to **cache the states of _all_ queries globally**, indexed by their keys. When you use a query, you get reactive access to a small part of that global cache, based on the current key.

### Keys and Parameters

A query can have one parameter (or none), and the parameter can be reactive. When its value changes, the query points to a different part of the global cache and triggers its loading function, if the cached data is missing or stale.

To keep the parameter reactive, pass it as a **thunk** (a function returning the value):

```typescript
const query = useMemeIdea(() => currentId);
```

Passing a plain value also works, but only stays reactive if the value is a `$state` proxy (an object or array). Primitives passed directly are captured once and never update — when in doubt, use a thunk.

The key of a query has to uniquely identify the data that the query produces, so it must include the parameter in some form:

- If the key is an **array of strings**, the serialized parameter is automatically appended to it. A query with key `['meme-ideas']` and parameter `{ id: 1 }` is cached under `['meme-ideas', '{"id":1}']`. Serialization is deterministic (object keys are sorted), and `string`, `number`, `boolean`, `bigint`, `Date`, `RegExp`, arrays and plain objects are all supported.

- If the key is a **function**, it receives the parameter and returns the key segments. This gives you full control and allows nested keys like `['meme-ideas', '1', 'comments']`, which are useful for hierarchical invalidation.

### One important rule

Invoke the query function **at the top level of your component** — not inside `$derived`, `$effect`, `{#each}` mappings or template expressions. The invocation registers effects, so it needs to run during component initialization. The library warns in the console when it detects a violation of this rule.

This also means the query state should not be destructured into plain variables — like with any reactive object, destructuring captures a one-time snapshot. Access the properties on the returned object, or wrap it in `$derived` to destructure:

```typescript
const query = useMemeIdea(() => currentId);
// ✅ query.data, query.loading, query.error
// ✅ const { data, loading } = $derived(query);
// ❌ const { data, loading } = useMemeIdea(() => currentId);
```

### When does a query load?

A query loads when it is first used, when its key changes (via the parameter), when it is used again and the cached data is stale, when it is invalidated via `invalidateQueries`, and when its `reload` function is called. Identical loads are deduplicated: if five components use the same query with the same key at the same time, the loading function runs once.

### Server-side rendering

Loading happens in `$effect`, which only runs in the browser. During SSR, queries simply render in their loading state and fetch after hydration. There is no server-side fetching or cache hydration.

## API Reference

Svelte Tiny Query exports the query constructors `createQuery` and `createSequentialQuery`, the cache tools `invalidateQueries` and `updateQueryData`, the helpers `succeed` and `fail`, and the readonly state `queryInfos`.

### `createQuery`

```typescript
function createQuery<TError, TParam, TData>(
  key: string[] | ((param: TParam) => string[]),
  loadFn: (
    param: TParam,
    signal: AbortSignal
  ) => Promise<LoadResult<TData, TError>>,
  options?: {
    initialData?: TData;
    staleTime?: number;
    gcTime?: number;
    retry?: number;
  }
): (
  param?: TParam | (() => TParam),
  invokeOptions?: { enabled?: () => boolean }
) => QueryState<TData, TError>;
```

Creates a query function which can be invoked (at the top level of a component) to get reactive access to the query state.

#### Param 1: Key

The **key** identifies the data of the query in the global cache. It must be unique — otherwise, different queries will overwrite each other's state. It is either an array of strings (the serialized query parameter is appended automatically), or a function from the parameter to an array of strings. See [Keys and Parameters](#keys-and-parameters).

#### Param 2: Loading Function

```typescript
loadFn: (param: TParam, signal: AbortSignal) =>
  Promise<LoadResult<TData, TError>>;
```

An asynchronous function that produces the data or an error. It receives the current value of the query parameter. The returned `LoadResult` is either:

- `{ success: true, data: TData }`
- `{ success: false, error: TError }`

You can use the helpers `succeed(data)` and `fail(error)` to construct these values. Note that the loading function is expected to **return** errors, not throw them — wrap throwing code in `try`/`catch`. If it throws anyway, that is treated as a defect (a bug, not an expected error): the query recovers (`loading` resets, `data` and `error` stay untouched), and the exception is reported to the global error handlers via `reportError`, where monitoring tools like Sentry pick it up.

The loading function also receives an `AbortSignal`, which is aborted when the library cancels the load (currently, this happens when the query is invalidated while loading). You can pass the signal to `fetch` to abort the request over the network — but even if you ignore it, the result of a cancelled load is always discarded.

#### Param 3: Options (optional)

- **staleTime**: How long (in milliseconds) the loaded data stays fresh. A query whose data is fresh is not automatically reloaded when it is used again. Defaults to `0` (using a query always reloads it). Set it to `Infinity` to never reload automatically.

- **initialData**: Used as the value of `data` before the query has first loaded (instead of `undefined`). When provided, the type of `query.data` is narrowed from `TData | undefined` to `TData`. Can be used to implement persisted queries.

- **gcTime**: Enables garbage collection for the query: its cached state is evicted `gcTime` milliseconds after the query is both **unused** (not part of any mounted component) and **stale**. Fresh data is never collected — with `staleTime: Infinity`, the cache is kept forever, so set that deliberately. Using the query again cancels a pending eviction. If `gcTime` is not set, cached data is kept for the lifetime of the app. You rarely need this — set it on queries whose parameter space is unbounded (search input, per-item detail views), where distinct cache keys accumulate over a session.

- **retry**: How many times a failed load is retried before the error is stored. Defaults to `0` (no retries). Retries use exponential backoff (1s, 2s, 4s, … capped at 30s). Retrying is invisible from the outside: the query simply stays in its loading state, and only the final error is exposed.

#### Return: The Query Function

```typescript
(
  param?: TParam | (() => TParam),
  invokeOptions?: { enabled?: () => boolean }
) => QueryState<TData, TError>;
```

The query function takes the query parameter (as a value or a thunk) and optional invoke options:

- **enabled**: A reactive getter that controls whether the query loads. While it returns `false`, the query does not load, `loading` is `false`, and `reload` (as well as `loadMore` on sequential queries) does nothing. When it flips to `true`, loading starts. Use this for dependent queries, e.g. `{ enabled: () => !!user.data }`.

It returns the reactive query state:

```typescript
type QueryState<TData, TError> = {
  loading: boolean;
  data: TData | undefined; // TData, if initialData was provided
  error: TError | undefined;
  loadedTimeStamp: number | undefined;
  staleTimeStamp: number | undefined;
  enabled: boolean;
  reload: () => void;
};
```

While a query reloads, its previous `data` remains available (stale-while-revalidate). If a reload fails, `error` is set and the previous `data` is kept.

### `createSequentialQuery`

```typescript
function createSequentialQuery<TError, TParam, TData, TCursor>(
  key: string[] | ((param: TParam) => string[]),
  loadFn: (
    param: TParam,
    cursor: TCursor | undefined,
    signal: AbortSignal
  ) => Promise<SequentialLoadResult<TData, TCursor, TError>>,
  options?: {
    initialData?: TData[];
    staleTime?: number;
    gcTime?: number;
    retry?: number;
  }
): (
  param?: TParam | (() => TParam),
  invokeOptions?: { enabled?: () => boolean }
) => SequentialQueryState<TData, TError>;
```

A cursor-based query for paginated data ("load more"). The loading function receives the query parameter and the current cursor (`undefined` on the first load), and returns:

- `{ success: true, data: TData, cursor: TCursor | undefined }`
- `{ success: false, error: TError }`

Returning `undefined` as the cursor signals that there is no more data.

```svelte
<script>
  import { createSequentialQuery } from 'svelte-tiny-query';

  const useComments = createSequentialQuery(
    ['comments'],
    async (postId, cursor) => {
      try {
        const page = await fetchComments(postId, cursor);
        return {
          success: true,
          data: page.items,
          cursor: page.nextCursor // undefined = no more pages
        };
      } catch (e) {
        return { success: false, error: 'Oopsie!' };
      }
    }
  );

  let postId = $state(1);
  const commentsQuery = useComments(() => postId);
</script>

{#each commentsQuery.data ?? [] as page}
  {#each page as comment}
    <p>{comment.text}</p>
  {/each}
{/each}

{#if commentsQuery.hasMore}
  <button onclick={commentsQuery.loadMore}>Load More</button>
{/if}
```

The state of a sequential query differs from a normal query:

- **data** is an **array of pages** (`TData[]`), one entry per load.
- **hasMore** indicates whether there is more data to load (`undefined` while loading).
- **loadMore()** loads the next page using the current cursor (and does nothing when there is no more data).
- **reload()** discards the pages and reloads from the start.

Two more differences: `staleTime` defaults to `Infinity` (using a sequential query again does not automatically reload it), and when a stale sequential query reloads, all of its current pages are fetched again in order.

### `invalidateQueries`

```typescript
function invalidateQueries(
  key: string[],
  options?: { force?: boolean; exact?: boolean }
): void;
```

Invalidates all queries whose key starts with the given key. Invalidated queries are marked as stale, and those that are **active** (currently used in a mounted component) reload immediately. If multiple components use an invalidated query, its loading function only runs once.

If a matching query is loading while it is invalidated, the in-flight load is **cancelled** (its signal is aborted and its result is discarded) and a fresh load starts, so responses that predate the invalidation are never stored as fresh data.

- **exact**: Only invalidate the query with exactly this key, not queries with child keys.
- **force**: Additionally clear the cached data right away. Active queries lose their `data` until the reload finishes (no stale-while-revalidate).

```typescript
// invalidates ['meme-ideas'], ['meme-ideas', '1'], etc.
invalidateQueries(['meme-ideas']);

// invalidates only ['meme-ideas', '1']
invalidateQueries(['meme-ideas', '1'], { exact: true });

// invalidates and immediately clears the cached data
invalidateQueries(['meme-ideas'], { force: true });
```

Note that when using automatic key generation (key as array of strings), the serialized parameter is part of the key: the query `useMemeIdea(() => 1)` with key `['meme-ideas']` is cached under `['meme-ideas', '1']` and can be invalidated with either `['meme-ideas']` or `['meme-ideas', '1']`.

### `updateQueryData` (experimental)

```typescript
function updateQueryData(
  key: string[],
  updater: (currentData: unknown) => unknown
): void;
```

Directly updates the cached data of all **active** queries whose key starts with the given key. Useful for optimistic updates. This API is experimental and may change.

```typescript
updateQueryData(['meme-ideas', '1'], (current) => ({
  ...current,
  title: 'Updated Title'
}));
```

### `queryInfos`

```typescript
{
  isLoading: boolean;
  loadingQueries: string[][];
  activeQueries: string[][];
  cachedQueries: string[][];
}
```

A readonly reactive object with information about all queries:

- **isLoading**: Whether any query is currently loading. Useful for global loading indicators.
- **loadingQueries**: Keys of the currently loading queries.
- **activeQueries**: Keys of the currently active queries (used in a mounted component).
- **cachedQueries**: Keys of the queries that currently have cached data.

## What is Omitted

Svelte Tiny Query deliberately omits some features that other query libraries offer:

**Query Provider**<br />
There is no need to set up a query provider. Queries and their caches are global in your app.

**Timed and Window Focus Reloading**<br />
Use `$effect`, `setInterval` (or `addEventListener`) and `reload` to achieve this yourself.

**Dependent Queries**<br />
Use the `enabled` option to only load a query when its prerequisites are ready.

**Persisted Queries**<br />
Use `initialData` to inject persisted data into the query.

**Mutations**<br />
Mutations can just be normal functions. Use `invalidateQueries` (or the experimental `updateQueryData`) to update queries after a mutation.

## Migrating from 1.x

Version 2 changed how parameters are passed to queries:

- Reactive parameters are now passed as **thunks**: `useQuery(() => param)` instead of `useQuery(param)`.
- Query functions must be invoked at the **top level of a component**. In particular, `$derived(useQuery(param))` — recommended in the 1.x docs — is no longer supported and triggers a console warning. Use the returned object's reactive properties directly instead of destructuring.
- The query state gained `loadedTimeStamp`, `staleTimeStamp` and `enabled` fields, and the invoke options gained `enabled`.
- `createSequentialQuery`, `updateQueryData` and the `force`/`exact` options of `invalidateQueries` are new.

## Roadmap

While we want to keep the library _tiny_, there are a few things on our plate:

- Manual query cancellation and cancel-on-unmount
- Stabilize optimistic updates (`updateQueryData`)

## Thanks

This library exists, because **Svelte 5 is awesome**! It solves the problem of caching almost by itself and allows this library to be so _tiny_ and simple.

Svelte Tiny Query is also very much inspired by [**TanStack Query**](https://tanstack.com/query) (for which there exists a [svelte variant](https://tanstack.com/query/latest/docs/framework/svelte/overview)).

And last but not least, if you are still reading this, thank you! We hope you give it a try and consider contributing.

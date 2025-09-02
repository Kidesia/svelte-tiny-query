# Svelte Tiny Query 🦄

Define declarative queries that handle caching, deduping, reloading and help you simplify your codebase. Built on **Svelte 5's reactivity**, it’s _tiny_ (<1kB gzipped) and fully type-safe.

**Features**

- 🚀 Declarative and reactive queries
- 💾 Caching and stale-time support
- 👬 Deduplication of identical loads
- 🚧 Query invalidation from anywhere
- 🐍 Written in typescript

## Usage

In your **Svelte 5** project, install the library.

    npm install svelte-tiny-query --save

And use it in your components.

```svelte
<script>
  import { createQuery } from 'svelte-tiny-query';

  // Create a query that represents the "meme-idea" resource
  const useMemeIdeaQuery = createQuery(
    // Key to uniquely identify the resource
    ['meme-ideas'],
    // Loading function that returns the data or error
    async ({ id }) => {
      try {
        const memeIdea = await fetchDataSomehow(id);
        return { success: true, data: memeIdea };
      } catch (e) {
        return { success: false, error: 'Oopsie!' };
      }
    }
  );

  // The query param can be reactive to
  const param = $state({ id: 1 });

  // Invoke the query to access its reactive state
  const memeIdeaQuery = useMemeIdeaQuery(param);

  // When destructuring, make sure to use $derived!
  const { loading, data, error } = $derived(useMemeIdeaQuery(param));
</script>

{#if memeIdeaQuery.loading}Query is loading{/if}
{#if memeIdeaQuery.error}Error: {memeIdeaQuery.error}{/if}
{#if memeIdeaQuery.data}Data: {memeIdeaQuery.data}{/if}

<button onclick={memeIdeaQuery.reload}> Reload</button>

<button onclick={() => param++}> Next Meme Idea</button>
```

## Basics

### The Query

A **query** is an abstraction for loading and caching data. It consists of a **loading function** which produces some data, and a **unique key** which identifies that data. Queries expose their reactive `data`, `error`, and `loading` state, along with a `reload` function.

Svelte Tiny Query uses Svelte 5's `$state` to **cache _all_ states of _all_ queries**, indexed by their keys. When you use a query, you are essentially getting reactive access to a small part of the global cache based on the current key.

### Keys and Parameters

Queries can have one or zero parameters, and the parameter can be reactive. If it is reactive and the value changes, the query now points to the new bit of global cache and triggers the loading function if appropriate.

The key of a query has to uniquely identify the data that the query produces, and thus depends also on the parameters of the query. In Svelte Tiny Query, the parameter is automatically included in the final key, but you can also use a function to

### When is a query reloaded?

Each query is loaded when it is first used (unless there exists not yet stale cache data for it) and when its `reload` function is used.

## API Reference

Svelte Tiny Query only exports 2 functions (`createQuery` and `invalidateQueries`), 2 tiny helpers (`fail` and `succeed`) and one readonly state (`queryInfos`).

### `createQuery`

```typescript
(
  key: string[] | (param: P) => string[],
  loadFn: (param: P) => LoadResult<T, E>,
  options?: { initialData?: T, staleTime?: number }
) =>
  (param: P) => {
    data: T | undefined,
    error: E | undefined,
    loading: boolean,
    reload: () => void
  }
```

Creates a query function which can be invoked to get reactive access to the query state.

- `T` is the data that is returned by the loading function
- `P` is the parameter which is passed into the query function
- `E` is the error which might be returned by the loading function

#### Param 1: Key

```typescript
key: string[] | (P) => string[]
```

The **key** of a query is crucial for caching and invalidating the query. It must be unique — otherwise, different queries will overwrite each other’s state.

- If the key is a _function_, it receives the query's parameter and returns an array of strings. This allows for nested keys like `["meme-ideas", "1", "comments"]`.

- If the key is not a function but the query takes a parameter, the **parameter is serialized and appended to the key**. In the example above, the key intially is `["meme-ideas", "id:1"]`.

#### Param 2: Loading Function

```typescript
loadFn: (param: P) => Promise<LoadResult<T, E>>;
```

An asychronous function that returns the new data or error. It accepts a parameter `P`, which is the value passed to the query. This parameter can be reactive, and if its value changes, the query will automatically re-initialize.

The function returns a `LoadResult`, which can either be:

- `{ success: true, data: T }`
- `{ success: false, error: E }`

You can use the helper functions `succeed(data: T)` and `fail(error: E)` to easily construct these values.

#### Param 3: Options (optional)

```typescript
options?: {
  staleTime: 0 as number
  initialData: undefined as T | undefined,
}
```

- **staleTime**: Defines how long (in milliseconds) before the query is considered stale. Before this time is reached, the query is not automatically reloaded. Defaults to 0 (query always reloads) and can also be set to infinity, to prevent reloads completely.

- **initialData**: This is used as the initial value of `data` before the query has finished loading (instead of undefined). Can be used to implement persisted queries.

#### Return: The Query Function

```typescript
(param: P) => {
  data: T | undefined,
  error: E | undefined,
  loading: boolean,
  reload: () => void
}
```

The `createQuery` function returns a query function that gives you access to the reactive state of the query (`data`, `error`, `loading`), and a `reload` function.

- The query function checks the cache for existing data. If the data is found and not stale, it’s returned immediately.

- If the data isn’t in the cache or is stale, the loading function is triggered. While it’s loading, the `loading` state is set to `true`.

- Once the loading function completes, the query state updates with the new data or error, and the data is cached for future use.

- The `reload` function can be used to manually reload the data, which will update the cache and reset the state as needed.

- If the query has reactive parameters, a change will trigger a re-initialization, causing a reload based on the new cache key.

### `invalidateQueries`

```typescript
(key: string[]) => void
```

Invalidates a query and its children by key. If a query is invalidated, and it is active (on a mounted component), its loading function is triggered. This happens, whether the query is stale or not.

If multiple identical queries are invalidated, the loading function is only run once.

### `queryInfos`

```typescript
{
  isLoading: bool;
  loadingQueries: string[][];
  activeQueries: string[][];
  cachedQueries: string[][];
}
```

- **isLoading**: Indicates if any query is currently loading.

- **loadingQueries**: Array of the keys of the currently loading queries.

- **activeQueries**: Array of the keys of the currently active queries. A query is considered active, when it is used in a currently mounted component.

- **cachedQueries**: Array of the keys of the currently cached queries. A query is cached, when it has been loaded and has since not been force-invalidated.

## What is Omited

Svelte Tiny Query deliberately omits some features that other query libraries offer. Here are some of those:

**Query Provider**<br />
There is no need to set up a query provider. Queries and their caches are global in your app.

**Timed and Window Focus Reloading**<br />
Use `$effect`, `setInterval` (or `addEventListener`) and `reload` to achieve this yourself.

**Dependent Queries**<br />
Use `$derived` to conditionally invoke the query function.

**Persisted Queries**<br />
Use `initialData` to inject perstisted data into the query.

**Mutations**<br />
Use `invalidateQueries` anywhere in your app to invalidate queries. This means mutations can just be normal functions.

## Roadmap

While we want to keep the library _tiny_, there are a few things on our plate.

- Optimistic updates (`upateQuery`)
- Retries on error
- Paginated and/or load-more queries
- Query cancellation
- Unused cache clearing (maybe?)
- Tests (d'uh!)

## Thanks

This library exists, because **Svelte 5 is awesome**! It solves the problem of caching almost by itself and allows this library to be so _tiny_ and simple.

Svelte Tiny Query is also very much inspired by [**TanStack Query**](https://tanstack.com/query) (for which there exists a [svelte variant](https://tanstack.com/query/latest/docs/framework/svelte/overview)).

And last but not least, if you are still reading this, thank you! We hope you give it a try and consider contributing.

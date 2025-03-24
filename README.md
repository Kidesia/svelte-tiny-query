# Svelte Tiny Query 🦄

**Svelte Tiny Query** simplifies working with external data in Svelte 5. Define declarative queries that handle caching, deduping, and reloading — with reactive access to `data`, `loading`, and `error` states.

Built on Svelte 5's reactivity, it’s *tiny* (~1.1kB gzipped), fast, and fully type-safe.

**Features**

- 🚀 Declarative and reactive queries
- 💾 Caching with stale-time support
- 🏃 Auto and manual reloading
- 💥 Loading and error state tracking
- ‼️ Deduplication of identical loads
- 🚧 Easy query invalidation
- ⌨️ Fully typed with TypeScript

## Usage

In your svelte 5 project, install **Svelte Tiny Query**

    npm install svelte-tiny-query --save

And use it in your apps.

~~~html
<script>
  import { createQuery } from 'svelte-tiny-query';

  const memeIdeaQuery = createQuery(
    ['meme-ideas'],
    async ({ id }) => {
      try {
        const memeIdea = await fetchDataSomehow(id);
        return { success: true, data: memeIdea };
      } catch (e) {
        return { success: false, error: 'Oopsie!' };
      }
    }
  );

  const queryParam = $state({ id: 1 });

  const { query } = memeIdeaQuery(queryParam);
</script>

{#if query.loading}
  <p>Loading...</p>
{:else if query.error}
  <p>Error: {query.error}</p>
{:else}
  <h1>{query.data.title}</h1>
{/if}

<button onclick={() => {
  queryParam.id += 1
}}>
  Next Meme Idea
</button>
~~~

## Basics

### The Query

A **query** is an abstraction for loading and caching data. It consists of a **loading function** which produces some data, and a **unique key** which identifies that data. Queries expose their reactive `data`, `error`, and `loading` state, along with a `refetch` function.

Svelte Tiny Query uses Svelte 5's `$state` to **cache *all* states of *all* queries**, indexed by their keys. When you use a query, you are essentially getting reactive access to a small part of the global cache based on the current key.

### Keys and Parameters

Queries can have one or zero parameters, and the parameter can be reactive. If it is reactive and the value changes, the query now points to the new bit of global cache and triggers the loading function if appropriate.

The key of a query has to uniquely identify the data that the query produces, and thus depends also on the parameters of the query. In Svelte Tiny Query, the parameter is automatically included in the final key, but you can also use a function to

## API Reference

Svelte Tiny Query only exports 2 functions (`createQuery` and `invalidateQueries`), 2 tiny helpers (`fail` and `succeed`) and one readonly state (`globalLoading`).

### `createQuery`

Creates a query, which then can be used in components.

~~~typescript
(
  key: string[] | (P) => string[],
  loadFn: (param: P) => LoadResult<T, E>,
  options?: { initialData?: T, staleTime?: number }
) =>
  (param: P) => {
    query: {
      data: T | undefined,
      error: E | undefined,
      loading: boolean
    },
    refetch: () => void
  }
~~~

You can see 3 generic types in there. `T` is the type of the data that is returned by the loading functioin, `P` is the type of the parameter which is passed into the query function, and `E` is the error which might be returned by the loading function. Let's break it down.

#### Param 1: Key

~~~typescript
key: string[] | (P) => string[]
~~~

The **key** of a query is crucial for caching and invalidating the query. It uniquely identifies the data, and it must be unique — otherwise, different queries may overwrite each other’s state.

- If the key is a function, it receives the query's parameter and returns an array of strings. This allows for dynamic keys, like `["user", "1", "posts"]`.
- If the key is not a function but the query takes a parameter, the **parameter is serialized and appended to the key**. This guarantees that each key is unique and represents the query’s data correctly. In the example above, the key intially is `["meme-ideas", "id:1"]`.

#### Param 2: Loading Function

~~~typescript
loadFn: (param: P) => Promise<LoadResult<T, E>>
~~~

The **loading function** is responsible for loading data asynchronously. It accepts a parameter `P`, which is the value passed to the query. This parameter can be reactive, and if its value changes, the query will automatically re-initialize.

The function returns a `LoadResult`, which can either be:

- `{ success: true, data: T }`
- `{ success: false, error: E }`

You can use the helper functions `succeed` and `fail` to easily construct these values.

#### Param 3: Options (optional)

~~~typescript
options?: {
  initialData: undefined as T | undefined,
  staleTime: 0 as number
}
~~~

- **initialData**: This is used as the initial value of `data` in the query, before it has finished loading (instead of undefined). Can be used to implement persisted queries (maybe in localStorage).
- **staleTime**: Defines how long (in milliseconds) before the query is considered stale. Before this time is reached, the query is not automatically reloaded. Defaults to 0 (query always reloads) and can also be set to infinity, to prevent reloads completely.

#### Returns the actual query function

~~~typescript
(param: P) => {
  query: {
    data: T | undefined,
    error: E | undefined,
    loading: boolean
  },
  refetch: () => void
}
~~~

The `createQuery` function returns a query function that gives you access to the reactive state of the query (`data`, `error`, `loading`), and a `refetch` function.

- The query function checks the cache for existing data. If the data is found and not stale, it’s returned immediately.

- If the data isn’t in the cache or is stale, the loading function is triggered. While it’s loading, the `loading` state is set to `true`.

- Once the loading function completes, the query state updates with the new data or error, and the data is cached for future use.

- The `refetch` function can be used to manually reload the data, which will update the cache and reset the state as needed.

- If the query has reactive parameters, a change will trigger a re-initialization, causing a reload based on the new cache key.

### `invalidateQuery`

~~~typescript
(key: string[]) => void
~~~

Invalidates a query and its children by key. If a query is invalidated, and it is active (on a mounted component), its loading function is triggered. This happens, whether the query is stale or not.

If multiple identical queries are invalidated, the loading function is only run once.

### `globalLoading`

~~~typescript
{ count: number }
~~~

Reactive value that holds the number of currently active loadings.

## What is Omited

Svelte Tiny Query also deliberately omits some features that other query libraries offer. These are some of those:

**Query Provider**:<br />
There is no need to set up a query provider. Queries and their caches operate globally in your app.

**Timed and Window Focus Reloading**:<br />
Use `$effect`, `setInterval` (or `addEventListener`) and `refetch` to achieve this yourself.

**Dependent Queries**:<br />
Use `$derived` to achieve dependent queries. But also consider extracting the part of the component that rely on the dependent query into its own component.

**Persisted Queries**:<br />
Use `initialData` and manually persist the data in the loading function.

**Mutations**:<br />
Use `invalidateQueries` anywhere in your app to invalidate queries. This means mutations can just be normal functions.

## Roadmap

While we want to keep the library *tiny*, there are a few things on our plate. If you feel like contributing to this project with issues or pull requests, you are very welcome.

- Optimistic updates (`upateQuery`)
- Retries on error
- Paginated and/or load-more queries
- Query cancellation
- Unused cache clearing (maybe?)
- Tests (d'uh!)

## Thanks

This library exists, because **Svelte 5 is awesome**! It solves the problem of caching almost by itself and allows this library to be so *tiny* and simple.

It also exists because of the (**TanStack Query**)[https://tanstack.com/query] (for which there exists a (svelte variant)[https://tanstack.com/query/latest/docs/framework/svelte/overview]) sparked the idea of the query abstraction in the first place. So thank you TanStack Query!

And last but not least, if you are still reading this, **thank you**! We hope you give it a try and consider contributing.

# Svelte Tiny Query 🦄

**Svelte Tiny Query 🦄** simplifies working with external data in Svelte 5. Define declarative queries that handle caching, deduping, and reloading — with reactive access to `data`, `loading`, and `error` states.

Built on Svelte 5's `$state`, it’s tiny (1.7kB gzipped), fast, and fully type-safe.

**Features**

- 🚀 Declarative and reactive queries
- 💾 Caching with stale-time support
- 🏃 Auto and manual reloading
- 💥 Loading and error state tracking
- ‼️ Deduplication of identical loads
- 🚧 Easy query invalidation
- ⌨️ Fully typed with TypeScript

## Usage

In your svelte 5 project, install **Svelte Tiny Query 🦄**

    npm install svelte-tiny-query --save

And off you go

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

## Queries and Keys

A query is a simple abstraction that ties together a loading function and its loaded data. Each query is **uniquely identified by a key 🔑**, which is used for caching the data and invalidating the query.

Once you create a query (using `createQuery`), the query itself is just a function which, when called, initializes the query and returns its reactive state (`data`, `error` and `loading`), as well as a `refetch` function.

When a query is initialized, it sets its data, error and loading properties to the respective values found in the cache (using the queries key). Also when initializing, unless the query has data from the cache that is not yet stale, the queries loading function is triggered.

When your queries cache is updated (from invalidation or another usage of that same query), the query automatically updates its properties - they are reactive. This also means, that when a query is reloading, the `loading` property of that query in all instances changes to true, not only the query that actually triggered the reload.

A query can also accept a **reactive parameter**. If a query is passed a reactive parameter and its value changes, the query is simple re-initialized (redoing the steps outlined above).

## API Reference

**Svelte Tiny Query 🦄** only exports 4 functions: `createQuery`, `invalidateQueries`, `fail` and `succeed`.

### createQuery

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

Let's break it down.

#### Param 1: Key

~~~typescript
key: string[] | (P) => string[]
~~~

The key of a query is used for caching and invalidating the query. To identify nested or hierarchical data, the key is a `string[]`. **It has to be unique‼️**, otherwise different queries will overwrite each others state.

If the key is a function, it gets passed the parameter of the query. This can be used to construct meaningful keys like `["user", "1", "posts"]`.

If the query has takes a parameter but the key is not a function, **the parameter is serialized and appended to the key**. This ensures that the key uniquely represents its data (and allows you to not worry to much about keys). In the example above, the actual initial key of the query is `["meme-ideas", "id:1"]`.

#### Param 2: Loading Function

~~~typescript
loadFn: (param: P) => Promise<LoadResult<T, E>>
~~~

The loading function loads the data asynchronously. Its parameter P is the parameter, that is expected to be passed into the query. The loading function can only have one parameter (or none), and this parameter can be a reactive state. If the parameter is reactive, the query will re-initialize whenever its value changes.

The return type of the loading function is a `LoadResult`, which is defined as `{ success: true, data: T } | { success: false, error: E }`. You can use the helper functions `succeed` and `fail` to construct these values.

#### Param 3: Options (optional)

~~~typescript
options?: {
  initialData: undefined as T | undefined,
  staleTime: 0 as number
}
~~~

**initialData**

The value is used as the initial value of `data` in the query, when it has not yet finished loading (instead of undefined). This can be used to implement persisted queries (maybe in localStorage), you just have to actually persist the data in the loading function.

**staleTime**

The amount of miliseconds before a query is considered stale. Before this time is reached, the query is not automatically reloaded. Defaults to 0 (query always reloads) and can also be set to infinity, to prevent reloads completely.

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

The `createQuery` function returns the actual query function, which can be used to load the query and get access to its state.

When the query is called, its data is set to a cached value based on the queries key. If the cache is empty, it is set to the content of `initialValue`, and if that is also not set, the data is undefined.

If there is no data found in the cache, or the cached data is already stale, the loading function is immediately invoked and the loading state is set to true for the duration of the loading function.

When the loading function returns a value or an error, the query is updated accordingly. These values are now cached and any later usage of the same query will see its cached data immediately. The error value is reset when the query reloads.

If the parameter of the query function is reactive and its value changes, the query now represents a new key and re-initializes, repeating the steps above.

### invalidateQuery



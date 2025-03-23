# Svelte Tiny Query 🦄

Svelte Tiny Query simplifies working with external data by allowing you to define queries and use them in your components. Under the hood it uses svelte 5 reactive state, which allows it to be so small (<2K gzipped).

Features

- 📥 Declarative queries
- 🚀 Reactive params
- 💾 Caching query results
- 🏃 Reloading data (when appropriate)
- ‼️ Deduping reloads of the same query
- 🚧 Invalidating queries
- 💥 Loading and error states
- 🤓 Fully Typescript

## Usage

In your svelte 5 project, install the dependency

    npm install svelte-tiny-query --save

And off you go

~~~svelte
<script>
  import { createQuery } from "svelte-tiny-query";

  // create a query (probably in another file)
  const useFriends = createQuery(
    ["friends"],
    async () => {
      try {
        const friends = fetchFriends();
        return { success: true, data: friends };
      } catch (e) {
        return { success: false, error: "oopsie" };
      }
    }
  )

  // use the query (returns data, loading and error)
  const { query } = useFriends();
</script>

{#if query.loading}
  loading...
{:else if query.error}
  {query.error}
{:else if query.data}
  {query.data.join(", ")}
{/if}
~~~

## Queries

A query is a simple abstraction that ties together a loading function and its loaded data. Each query is uniquely identified by a key, which is used for caching the data and invalidating the query.

### Creating a Query

To create a query you use the `createQuery` function.

It has three parameters

- key `string[] | (P) => string[]`
- loadFn `(param: P) => LoadResult<T, E>`
- options `{ initialData?: T, staleTime?: number }`

and returns a query function

- returns `(param: P) => { query: { data: T | undefined, error: E | undefined, loading: boolean }, refetch: () => void }`

~~~javascript
const useFriends = createQuery(
  ['friends'],
  async () => {
    try {
      const data = await fetchFriends();
      return { success: true, data };
    } catch (error) {
      return { success: false, error };
    }
  }
);
~~~

### Query Key

The key of a query is used for caching the data. In order to identify nested or hierarchical data, the key is a `string[]`. It has to be unique, otherwise different queries will overwrite each others data.

The key can also be a function of type `(param: P) => string[]`. This allows the key to be based on the params of the query.

If the key is not a function, but the query takes a parameter, the param is serialized and added as the last key fragment.

### Loading Function

The loading function is invoked whenever the query is first used and subsequently, when its (reactive) param changes or when its `refetch` function is called.

It is an asynchronous function that takes one argument and returns a promise of either a `{ success: true, data }` or a `{ success: false, error }` object. To construct these objects you can also use the `succeed` and `fail` functions which are provided.

~~~javascript
const useFriend = createQuery(
  ({ id }) => ["friend", `${id}`],
  async ({ id }: { id: number}) => {
    try {
      const data = await fetchFriend(id);
      return succeed(data);
    } catch (error) {
      return fail(error);
    }
  }
);
~~~

### The Query itself

Once you created a query, its time to use it. Invoke it and you get access to its loadingstate, data and errors. It will load right away, but if you want to manually trigger a reload down the line, you can use the refetch function, which is also provided.

[WIP]

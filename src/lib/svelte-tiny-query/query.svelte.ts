import type { LoadResult } from './loadHelpers.ts';
import { fromBaseQuery, type BaseQueryState } from './baseQuery.svelte.ts';

/**
 * Creates a reactive query function for fetching and managing data in Svelte components.
 *
 * This overload is used when `options.initialData` is provided, ensuring that
 * the `query.data` property will always be of type `TData` (never `undefined`).
 *
 * @template TError The type of the error that can be returned by the `loadFn`.
 * @template TParam The type of the parameter passed to the `loadFn`.
 * @template TData The type of the data returned by the `loadFn`.
 *
 * @param key - A unique key for the query.
 * @param loadFn - An asynchronous function that fetches the data.
 * @param options - Query options, where `initialData` is required.
 *
 * @returns A function returning the reactive query state.
 */
export function createQuery<TError, TParam = void, TData = unknown>(
	key: string[] | ((queryParam: TParam) => string[]),
	loadFn: (queryParam: TParam) => Promise<LoadResult<TData, TError>>,
	options: {
		/**
		 * Initial data to be used before the query is loaded.
		 * When provided, the `query.data` will always be of type `TData`.
		 */
		initialData: TData;
		/**
		 * Time in milliseconds after which the query is considered stale.
		 * A stale query will be automatically re-fetched when accessed.
		 */
		staleTime?: number;
	}
): (queryParam: TParam) => BaseQueryState<TData, TError>;

/**
 * Creates a reactive query function for fetching and managing data in Svelte components.
 *
 * @template TError The type of the error that can be returned by the `loadFn`.
 * @template TParam The type of the parameter passed to the `loadFn`.
 * @template TData The type of the data returned by the `loadFn`.
 *
 * @param key - A unique key for the query.
 * @param loadFn - An asynchronous function that fetches the data.
 * @param [options] - Optional query configuration.
 *
 * @returns A function returning the reactive query state.
 */
export function createQuery<TError, TParam = void, TData = unknown>(
	key: string[] | ((queryParam: TParam) => string[]),
	loadFn: (queryParam: TParam) => Promise<LoadResult<TData, TError>>,
	options?: {
		/**
		 * Initial data to be used before the query is loaded.
		 * If not provided, `query.data` will be `undefined` until the first successful load.
		 */
		initialData?: TData;
		/**
		 * Time in milliseconds after which the query is considered stale.
		 * A stale query will be automatically re-fetched when accessed.
		 */
		staleTime?: number;
	}
): (queryParam: TParam) => BaseQueryState<TData | undefined, TError>;

export function createQuery<TError, TParam = void, TData = unknown>(
	key: string[] | ((queryParam: TParam) => string[]),
	loadFn: (queryParam: TParam) => Promise<LoadResult<TData, TError>>,
	options?: {
		initialData?: TData;
		staleTime?: number;
	}
): (queryParam: TParam) => BaseQueryState<TData | undefined, TError> {
	return (queryParam: TParam) => {
		const loadData = async (queryParam: TParam) => {
			return await loadFn(queryParam);
		};

		return fromBaseQuery(key, loadData, queryParam, options);
	};
}

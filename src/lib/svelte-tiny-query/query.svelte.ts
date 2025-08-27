import { untrack } from 'svelte';

import type { LoadResult } from './loadHelpers.js';
import { generateKey } from './utils.js';
import {
	queryLoaderByKey,
	loadingByKey,
	dataByKey,
	errorByKey,
	loadedTimeStampByKey,
	staleTimeStampByKey
} from './cache.svelte';
import { registerActiveQuery, withLoading } from './queryHelpers.svelte';

/**
 * Represents the current state of a query.
 * @template TData The type of the data returned by the query.
 * @template TError The type of the error that can occur during the query.
 */
export type QueryState<TData, TError> = {
	/** Indicates if the query is currently loading. */
	loading: boolean;
	/** The data returned by the query. This can be `undefined` if `initialData` was not provided and the query hasn't loaded yet. */
	data: TData;
	/** Any error that occurred during the query, or undefined if no error. */
	error: TError | undefined;
	/** The timestamp when the data was fetched, or `undefined` if the data hasn't been loaded yet. */
	loadedTimeStamp: number | undefined;
	/** The timestamp when the data will be considered stale, or `undefined` if no staleTime is set or data hasn't loaded. */
	staleTimeStamp: number | undefined;
	/** Reload function to manually trigger the query again. */
	reload: () => void;
};

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
): (queryParam: TParam) => QueryState<TData, TError>;

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
): (queryParam: TParam) => QueryState<TData | undefined, TError>;

export function createQuery<TData, TError, TParam = void>(
	key: string[] | ((queryParam: TParam) => string[]),
	loadFn: (queryParam: TParam) => Promise<LoadResult<TData, TError>>,
	options?: {
		initialData?: TData;
		staleTime?: number;
	}
): (param: TParam) => QueryState<TData | undefined, TError> {
	return (param: TParam) => {
		const internalState = $state({
			currentKey: generateKey(key, param).join('__')
		});

		registerActiveQuery(internalState.currentKey);

		$effect(() => {
			// Reset state and run the query loader when the queryParam changes
			const cacheKey = generateKey(key, param).join('__');

			untrack(() => {
				// Set the new cache key in the internal state
				internalState.currentKey = cacheKey;

				// Create and store the query loader if it doesn't exist
				if (!queryLoaderByKey[cacheKey]) {
					const frozenQueryParam = $state.snapshot(param) as TParam;

					const queryLoaderWithParam = async () => {
						const cacheKey = generateKey(key, param).join('__');
						withLoading(
							cacheKey,
							() => loadFn(frozenQueryParam),
							options?.staleTime
						);
					};

					queryLoaderByKey[cacheKey] = queryLoaderWithParam;
				}

				// Run the query
				queryLoaderByKey[cacheKey]();
			});
		});

		return {
			get loading() {
				return !!loadingByKey[internalState.currentKey];
			},
			get data() {
				return (
					(dataByKey[internalState.currentKey] as TData | undefined) ??
					options?.initialData
				);
			},
			get error() {
				return errorByKey[internalState.currentKey] as TError | undefined;
			},
			get loadedTimeStamp() {
				return loadedTimeStampByKey[internalState.currentKey];
			},
			get staleTimeStamp() {
				return staleTimeStampByKey[internalState.currentKey];
			},
			reload: () => {
				queryLoaderByKey[internalState.currentKey]?.('reload');
			}
		};
	};
}

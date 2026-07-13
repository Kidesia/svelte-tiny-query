import { untrack } from 'svelte';

import type { LoadResult } from './loadHelpers.js';
import { generateCacheKey, normalizeParam, type QueryParam } from './utils.js';
import {
	warnIfTracking,
	trackActiveQueriesCount,
	withLoading
} from './queryHelpers.svelte';
import {
	queryLoaderByKey,
	loadingByKey,
	dataByKey,
	errorByKey,
	loadedTimeStampByKey,
	staleTimeStampByKey
} from './cache.svelte';

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
	/** Whether the query is enabled. When `false`, the query will not fetch data. */
	enabled: boolean;
	/** Reload function to manually trigger the query again. */
	reload: () => void;
};

/** Options for the returned query function (consumer-side). */
export type QueryInvokeOptions = {
	/** Reactive getter that controls whether the query is enabled. Defaults to `() => true`. */
	enabled?: () => boolean;
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
export function createQuery<
	TError,
	TParam extends QueryParam = void,
	TData = unknown
>(
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
): (
	param?: TParam | (() => TParam),
	invokeOptions?: QueryInvokeOptions
) => QueryState<TData, TError>;

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
 * @returns A function that accepts an optional param getter and returns the reactive query state.
 */
export function createQuery<
	TError,
	TParam extends QueryParam = void,
	TData = unknown
>(
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
): (
	param?: TParam | (() => TParam),
	invokeOptions?: QueryInvokeOptions
) => QueryState<TData | undefined, TError>;

export function createQuery<TData, TError, TParam extends QueryParam = void>(
	key: string[] | ((queryParam: TParam) => string[]),
	loadFn: (queryParam: TParam) => Promise<LoadResult<TData, TError>>,
	options?: {
		initialData?: TData;
		staleTime?: number;
	}
): (
	param?: TParam | (() => TParam),
	invokeOptions?: QueryInvokeOptions
) => QueryState<TData | undefined, TError> {
	return (
		paramOrGetter?: TParam | (() => TParam),
		invokeOptions?: QueryInvokeOptions
	) => {
		const getParam = normalizeParam(paramOrGetter);
		const isEnabled = invokeOptions?.enabled ?? (() => true);

		// Internal state to track the current cache key
		const internalState = $state({
			currentKey: generateCacheKey(key, getParam())
		});

		warnIfTracking('createQuery', internalState.currentKey);

		// Register the active query (and unregister later)
		trackActiveQueriesCount(key, getParam);

		$effect(() => {
			// Track enabled reactively — if disabled, skip loading
			if (!isEnabled()) return;

			// Reset state and run the query loader when key or queryParam changes
			const param = getParam();
			const cacheKey = generateCacheKey(key, param);
			const frozenParam = $state.snapshot(param) as TParam;

			// Set the new cache key in the internal state
			internalState.currentKey = cacheKey;

			if (!queryLoaderByKey[cacheKey]) {
				// Create and store the query loader if it doesn't exist
				queryLoaderByKey[cacheKey] = async () => {
					untrack(() => {
						withLoading(
							cacheKey,
							() => {
								return loadFn(frozenParam);
							},
							options?.staleTime
						);
					});
				};
			}

			queryLoaderByKey[cacheKey]();
		});

		// Return reactive query state
		return {
			get loading() {
				if (!isEnabled()) return false;
				const isLoading = loadingByKey[internalState.currentKey];
				return isLoading === undefined ? true : isLoading;
			},
			get data() {
				const currentKey = internalState.currentKey;
				// "in" instead of "??", so that null/undefined data does not
				// fall back to initialData once the query has loaded
				return currentKey in dataByKey
					? (dataByKey[currentKey] as TData)
					: options?.initialData;
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
			get enabled() {
				return isEnabled();
			},
			reload: () => {
				queryLoaderByKey[internalState.currentKey]?.();
			}
		};
	};
}

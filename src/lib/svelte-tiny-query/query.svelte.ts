import { untrack } from 'svelte';

import { generateKey } from './utils.js';
import type { LoadResult } from './loadHelpers.js';
import {
	queryLoaderByKey,
	loadingByKey,
	dataByKey,
	errorByKey,
	staleTimeStampByKey,
	activeQueryCounts,
	globalLoading
} from './cache.svelte';

/**
 * Represents the current state of a query.
 * @template TData The type of the data returned by the query.
 * @template TError The type of the error that can occur during the query.
 */
type QueryState<TData, TError> = {
	/** Indicates if the query is currently loading. */
	loading: boolean;
	/** Any error that occurred during the query, or undefined if no error. */
	error: TError | undefined;
	/** The data returned by the query. This can be `undefined` if `initialData` was not provided and the query hasn't loaded yet. */
	data: TData;
	/** The timestamp when the data will be considered stale, or `undefined` if no staleTime is set or data hasn't loaded. */
	staleTimeStamp: number | undefined;
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
): (queryParam: TParam) => {
	/** The current state of the query, including loading status, data, and error. */
	query: QueryState<TData, TError>;
	/** A function to manually reload the query data. */
	reload: () => void;
};

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
): (queryParam: TParam) => {
	/** The current state of the query, including loading status, data, and error. */
	query: QueryState<TData | undefined, TError>;
	/** A function to manually reload the query data. */
	reload: () => void;
};

export function createQuery<TError, TParam = void, TData = unknown>(
	key: string[] | ((queryParam: TParam) => string[]),
	loadFn: (queryParam: TParam) => Promise<LoadResult<TData, TError>>,
	options?: {
		initialData?: TData;
		staleTime?: number;
	}
): (queryParam: TParam) => {
	query: QueryState<TData | undefined, TError>;
	reload: () => void;
} {
	const loadData = async (queryParam: TParam) => {
		const cacheKey = generateKey(key, queryParam).join('__');

		errorByKey[cacheKey] = undefined;
		loadingByKey[cacheKey] = true;
		globalLoading.count++;

		const loadResult = await loadFn(queryParam);
		if (loadResult.success) {
			dataByKey[cacheKey] = loadResult.data;
			staleTimeStampByKey[cacheKey] = +new Date() + (options?.staleTime ?? 0);
		} else {
			errorByKey[cacheKey] = loadResult.error;
		}

		loadingByKey[cacheKey] = false;
		globalLoading.count--;
	};

	return (queryParam: TParam) => {
		const internalState = $state({
			currentKey: generateKey(key, queryParam).join('__')
		});

		const queryState = $state({
			loading: false,
			error: undefined as TError | undefined,
			data: options?.initialData,
			staleTimeStamp: undefined as number | undefined
		});

		$effect(() => {
			// Update loading whenever the key or the referenced data change
			queryState.loading = !!loadingByKey[internalState.currentKey];
		});

		$effect(() => {
			// Update data whenever the key or the referenced data change
			queryState.data =
				(dataByKey[internalState.currentKey] as TData | undefined) ??
				options?.initialData;
		});

		$effect(() => {
			// Update error wwhenever the key or the referenced data change
			queryState.error = errorByKey[internalState.currentKey] as
				| TError
				| undefined;
		});

		$effect(() => {
			// Update staleTimeStamp whenever kwhenever the key or the referenced data change
			queryState.staleTimeStamp = staleTimeStampByKey[internalState.currentKey];
		});

		$effect(() => {
			// Reset state and run the query loader when the queryParam changes
			const cacheKey = generateKey(key, queryParam).join('__');

			untrack(() => {
				const frozenQueryParam = $state.snapshot(queryParam) as TParam;
				const queryLoaderWithParam = () => {
					loadData(frozenQueryParam);
				};

				activeQueryCounts[cacheKey] = (activeQueryCounts[cacheKey] ?? 0) + 1;
				queryLoaderByKey[cacheKey] = queryLoaderWithParam;
				internalState.currentKey = cacheKey;

				const alreadyLoading = loadingByKey[cacheKey];
				const notFetchedYet = !staleTimeStampByKey[cacheKey];
				const staleData = staleTimeStampByKey[cacheKey] < +new Date();

				if (!alreadyLoading && (notFetchedYet || staleData)) {
					queryLoaderWithParam();
				}
			});

			return () => {
				// Decrement the active query count when the query is destroyed
				activeQueryCounts[cacheKey] = Math.max(
					(activeQueryCounts[cacheKey] ?? 0) - 1,
					0
				);
			};
		});

		return {
			query: queryState,
			reload: () => {
				queryLoaderByKey[internalState.currentKey]?.();
			}
		};
	};
}

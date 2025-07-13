import { untrack } from 'svelte';

import { generateKey } from './utils.ts';
import type { LoadResult } from './loadHelpers.ts';
import {
	queryLoaderByKey,
	loadingByKey,
	dataByKey,
	errorByKey,
	staleTimeStampByKey,
	activeQueryCounts,
	globalLoading
} from './cache.svelte.ts';

type QueryState<TData, TError> = {
	loading: boolean;
	error: TError | undefined;
	data: TData;
	staleTimeStamp: number | undefined;
};

/**
 * Creates a query function that can be used to load data.
 * @param key Path of the query
 * @param loadFn Function to load the data
 * @param options Options for the query
 * @param options.initialData Initial data to be used before the query is loaded
 * @param options.staleTime Time in milliseconds after which the query is considered stale
 * @returns Query function to use in Svelte components
 */
export function createQuery<TError, TParam = void, TData = unknown>(
	key: string[] | ((queryParam: TParam) => string[]),
	loadFn: (queryParam: TParam) => Promise<LoadResult<TData, TError>>,
	options: {
		/**
		 * Initial data to be used before the query is loaded.
		 */
		initialData: TData;
		/**
		 * Time in milliseconds after which the query is considered stale.
		 */
		staleTime?: number;
	}
): (queryParam: TParam) => {
	query: QueryState<TData, TError>;
	reload: () => void;
};

/**
 * Creates a query function that can be used to load data.
 * @param key Path of the query
 * @param loadFn Function to load the data
 * @param options Options for the query
 * @param options.initialData Initial data to be used before the query is loaded
 * @param options.staleTime Time in milliseconds after which the query is considered stale
 * @returns Query function to use in Svelte components
 */
export function createQuery<TError, TParam = void, TData = unknown>(
	key: string[] | ((queryParam: TParam) => string[]),
	loadFn: (queryParam: TParam) => Promise<LoadResult<TData, TError>>,
	options?: {
		/**
		 * Initial data to be used before the query is loaded.
		 */
		initialData?: TData;
		/**
		 * Time in milliseconds after which the query is considered stale.
		 */
		staleTime?: number;
	}
): (queryParam: TParam) => {
	query: QueryState<TData | undefined, TError>;
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

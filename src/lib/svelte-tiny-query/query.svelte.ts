import { untrack } from 'svelte';

import { generateKey } from './utils.ts';
import type { LoadResult } from './loadHelpers.ts';
import {
	querieLoaderByKey,
	loadingByKey,
	dataByKey,
	errorByKey,
	staleTimeStampByKey,
	activeQueryCounts,
	globalLoading
} from './cache.svelte.ts';

type QueryState<T, E> = {
	loading: boolean;
	error: E | undefined;
	data: T;
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
export function createQuery<E, P = void, T = unknown>(
	key: string[] | ((queryParam: P) => string[]),
	loadFn: (queryParam: P) => Promise<LoadResult<T, E>>,
	options: {
		/**
		 * Initial data to be used before the query is loaded.
		 */
		initialData: T;
		/**
		 * Time in milliseconds after which the query is considered stale.
		 */
		staleTime?: number;
	}
): (queryParam: P) => {
	query: QueryState<T, E>;
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
export function createQuery<E, P = void, T = unknown>(
	key: string[] | ((queryParam: P) => string[]),
	loadFn: (queryParam: P) => Promise<LoadResult<T, E>>,
	options?: {
		/**
		 * Initial data to be used before the query is loaded.
		 */
		initialData?: T;
		/**
		 * Time in milliseconds after which the query is considered stale.
		 */
		staleTime?: number;
	}
): (queryParam: P) => {
	query: QueryState<T | undefined, E>;
	reload: () => void;
};

export function createQuery<E, P = void, T = unknown>(
	key: string[] | ((queryParam: P) => string[]),
	loadFn: (queryParam: P) => Promise<LoadResult<T, E>>,
	options?: {
		initialData?: T;
		staleTime?: number;
	}
): (queryParam: P) => {
	query: QueryState<T | undefined, E>;
	reload: () => void;
} {
	const loadData = async (queryParam: P) => {
		const cacheKey = generateKey(key, queryParam).join('__');

		untrack(() => {
			errorByKey[cacheKey] = undefined;
			loadingByKey[cacheKey] = true;
			globalLoading.count++;
		});

		const loadResult = await loadFn(queryParam);
		if (loadResult.success) {
			dataByKey[cacheKey] = loadResult.data;
			untrack(() => {
				staleTimeStampByKey[cacheKey] = +new Date() + (options?.staleTime ?? 0);
			});
		} else {
			errorByKey[cacheKey] = loadResult.error;
		}

		untrack(() => {
			loadingByKey[cacheKey] = false;
			globalLoading.count--;
		});
	};

	return (queryParam: P) => {
		const internalState = $state({
			currentKey: generateKey(key, queryParam).join('__')
		});

		const queryState = $state({
			loading: false,
			error: undefined as E | undefined,
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
				(dataByKey[internalState.currentKey] as T | undefined) ??
				options?.initialData;
		});

		$effect(() => {
			// Update error wwhenever the key or the referenced data change
			queryState.error = errorByKey[internalState.currentKey] as E | undefined;
		});

		$effect(() => {
			// Update staleTimeStamp whenever kwhenever the key or the referenced data change
			queryState.staleTimeStamp = staleTimeStampByKey[internalState.currentKey];
		});

		$effect(() => {
			// Reset state and run the query loader when the queryParam changes
			const cacheKey = generateKey(key, queryParam).join('__');

			internalState.currentKey = cacheKey;

			untrack(() => {
				activeQueryCounts[cacheKey] = (activeQueryCounts[cacheKey] ?? 0) + 1;
			});

			const frozenQueryParam = $state.snapshot(queryParam) as P;
			const queryLoaderWithParam = () => {
				loadData(frozenQueryParam);
			};

			untrack(() => {
				querieLoaderByKey[cacheKey] = queryLoaderWithParam;
			});

			const alreadyLoading = untrack(() => loadingByKey[cacheKey]);
			const staleOrNew = untrack(() => {
				const staleTime = staleTimeStampByKey[cacheKey];
				return staleTime ? staleTime < +new Date() : true;
			});

			if (staleOrNew && !alreadyLoading) {
				queryLoaderWithParam();
			}

			return () => {
				// Decrement the active query count when the query is destroyed
				untrack(() => {
					activeQueryCounts[cacheKey] = Math.max(
						(activeQueryCounts[cacheKey] ?? 0) - 1,
						0
					);
				});
			};
		});

		return {
			query: queryState,
			reload: () => {
				querieLoaderByKey[internalState.currentKey]?.();
			}
		};
	};
}

import { untrack } from 'svelte';

import { generateKey } from './utils.ts';
import type { LoadResult } from './loadHelpers.ts';
import {
	queriesByKey,
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
	const initializeState = (currentKey: string) => {
		const internal = $state({ currentKey });
		const query = $state({
			loading: false,
			error: undefined as E | undefined,
			data: options?.initialData,
			staleTimeStamp: undefined as number | undefined
		});

		$effect(() => {
			query.loading = !!loadingByKey[internal.currentKey];
		});

		$effect(() => {
			query.data =
				internal.currentKey in dataByKey
					? (dataByKey[internal.currentKey] as T)
					: options?.initialData;
		});

		$effect(() => {
			query.error = errorByKey[internal.currentKey] as E | undefined;
		});

		$effect(() => {
			query.staleTimeStamp = staleTimeStampByKey[internal.currentKey];
		});

		return {
			internal,
			query
		};
	};

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
		const cacheKey = generateKey(key, queryParam).join('__');
		const { internal, query } = initializeState(cacheKey);

		$effect(() => {
			const currentKey = generateKey(key, queryParam);
			const cacheKey = currentKey.join('__');
			internal.currentKey = cacheKey;

			untrack(() => {
				activeQueryCounts[cacheKey] = (activeQueryCounts[cacheKey] ?? 0) + 1;
			});

			const frozenQueryParam = $state.snapshot(queryParam) as P;
			const queryLoaderInstance = () => {
				loadData(frozenQueryParam);
			};

			untrack(() => {
				queriesByKey[cacheKey] = queryLoaderInstance;
			});

			const alreadyLoading = untrack(() => loadingByKey[cacheKey]);
			const staleOrNew = untrack(() => {
				const staleTime = staleTimeStampByKey[cacheKey];
				return staleTime ? staleTime < +new Date() : true;
			});

			if (staleOrNew && !alreadyLoading) {
				queryLoaderInstance();
			}

			return () => {
				untrack(() => {
					activeQueryCounts[cacheKey] = Math.max(
						(activeQueryCounts[cacheKey] ?? 0) - 1,
						0
					);
				});
			};
		});

		const reload = () => {
			queriesByKey[internal.currentKey]?.();
		};

		return {
			query,
			/**
			 * reloades the query.
			 */
			reload
		};
	};
}

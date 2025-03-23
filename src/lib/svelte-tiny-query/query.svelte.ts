import { untrack } from 'svelte';
import createCache from './cache.svelte';
import type { LoadResult } from './loadResult.ts';

// Helpers

function generateKeyFragment(param: Record<string, unknown>) {
	return Object.entries(param)
		.map(([key, value]) => `${key}:${String(value)}`)
		.sort()
		.join('|');
}

function generateKey<T>(baseKey: string[] | ((params: T) => string[]), queryParam: T) {
	return typeof baseKey === 'function'
		? baseKey(queryParam)
		: queryParam
			? [...baseKey, generateKeyFragment(queryParam)]
			: baseKey;
}

// State

export const globalLoading = $state({ loadingCount: 0 });
export const queriesCache = createCache('querie-caches');
export const loadingCache = createCache('loading-cache');
export const errorCache = createCache('error-cache');
export const dataCache = createCache('data-cache');

// Actions

/**
 * Invalidates queries hierarchically by key.
 * Invalidating makes queries reload, if they are currently active.
 * @param key The root path of the queries to invalidate.
 */
export function invalidateQuery(key: string[]) {
	const queries = queriesCache.getValues(key);
	for (const query of queries) {
		if (query && typeof query === 'function') {
			query();
		}
	}
}

/**
 * Creates a query function that can be used to load data.
 * @param key The path of the query
 * @param loadFn The function to load the data
 * @param options The options
 * @returns A function to create the query
 */
export function createQuery<E, P = void, T = unknown>(
	key: string[] | ((queryParam: P) => string[]),
	loadFn: (queryParam: P) => Promise<LoadResult<T, E>>,
	options?: {
		initialData?: T;
	}
) {
	const initializeState = () => {
		const internal = $state({
			currentKey: undefined as string[] | undefined
		});

		const query = $state({
			loading: false,
			error: undefined as E | undefined,
			data: options?.initialData
		});

		$effect(() => {
			if (internal.currentKey) {
				query.data = dataCache.getValue(internal.currentKey) as T;
			}
		});

		$effect(() => {
			if (internal.currentKey) {
				query.loading = !!loadingCache.getValue(internal.currentKey);
			}
		});

		$effect(() => {
			if (internal.currentKey) {
				query.error = errorCache.getValue(internal.currentKey) as E | undefined;
			}
		});

		return {
			internal,
			query
		};
	};

	const loadData = async (queryParam: P) => {
		const cacheKey = generateKey(key, queryParam);

		const alreadyLoading = untrack(() => loadingCache.getValue(cacheKey));
		if (alreadyLoading) {
			return;
		}

		untrack(() => {
			loadingCache.setValue(cacheKey, true);
			errorCache.removeValue(cacheKey);
			globalLoading.loadingCount++;
		});

		const loadResult = await loadFn(queryParam);
		if (loadResult.success) {
			dataCache.setValue(cacheKey, loadResult.data);
		} else {
			errorCache.setValue(cacheKey, loadResult.error);
		}

		untrack(() => {
			loadingCache.removeValue(cacheKey);
			globalLoading.loadingCount--;
		});
	};

	return (queryParam: P) => {
		const { internal, query } = initializeState();

		$effect(() => {
			// Runs initially and whenever the queryParam changes

			const cacheKey = generateKey(key, queryParam);
			internal.currentKey = cacheKey;

			untrack(() => {
				const frozenQueryParam = $state.snapshot(queryParam) as P;
				queriesCache.setValue(cacheKey, () => {
					loadData(frozenQueryParam);
				});
			});

			loadData(queryParam);

			return () => {
				untrack(() => {
					queriesCache.removeValue(cacheKey);
				});
			};
		});

		const refetch = () => {
			const query = queriesCache.getValue(generateKey(key, queryParam));
			if (query && typeof query === 'function') {
				query();
			}
		};

		return {
			query,
			refetch
		};
	};
}

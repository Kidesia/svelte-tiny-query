import { untrack } from 'svelte';

// Types

type LoadSuccess<T> = { success: true; data: T };
type LoadFailure<E> = { success: false; error: E };
type LoadResult<T, E> = LoadSuccess<T> | LoadFailure<E>;

// Helpers

function generateKeyFragment(param: Record<string, unknown>) {
	return Object.entries(param)
		.map(([key, value]) => `${key}:${String(value)}`)
		.sort()
		.join('|');
}

function generateKey<T>(
	baseKey: string[] | ((params: T) => string[]),
	queryParam: T
) {
	return typeof baseKey === 'function'
		? baseKey(queryParam)
		: queryParam
			? [...baseKey, generateKeyFragment(queryParam)]
			: baseKey;
}

// State

const queriesCache = $state({} as Record<string, () => void>);
const loadingCache = $state({} as Record<string, boolean>);
const dataCache = $state({} as Record<string, unknown>);
const errorCache = $state({} as Record<string, unknown>);
const activeQueries = $state([] as string[][]);

export const globalLoading = $state({ count: 0 });

// Actions

/**
 * Creates a query function that can be used to load data.
 * @param key Path of the query
 * @param loadFn Function to load the data
 * @param options Options for the query
 * @returns Query function to use in Svelte components
 */
export function createQuery<E, P = void, T = unknown>(
	key: string[] | ((queryParam: P) => string[]),
	loadFn: (queryParam: P) => Promise<LoadResult<T, E>>,
	options?: {
		initialData?: T;
	}
) {
	const initializeState = (currentKey: string) => {
		const internal = $state({ currentKey });
		const query = $state({
			loading: false,
			error: undefined as E | undefined,
			data: options?.initialData
		});

		$effect(() => {
			query.loading = !!loadingCache[internal.currentKey];
		});

		$effect(() => {
			query.data = dataCache[internal.currentKey] as T;
		});

		$effect(() => {
			query.error = errorCache[internal.currentKey] as E | undefined;
		});

		return {
			internal,
			query
		};
	};

	const loadData = async (queryParam: P) => {
		const cacheKey = generateKey(key, queryParam).join('__');

		untrack(() => {
			if (errorCache[cacheKey] !== undefined) {
				errorCache[cacheKey] = undefined;
			}
			loadingCache[cacheKey] = true;
			globalLoading.count++;
		});

		const loadResult = await loadFn(queryParam);
		if (loadResult.success) {
			dataCache[cacheKey] = loadResult.data;
		} else {
			errorCache[cacheKey] = loadResult.error;
		}

		untrack(() => {
			loadingCache[cacheKey] = false;
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
				activeQueries.push(currentKey);
			});

			untrack(() => {
				const frozenQueryParam = $state.snapshot(queryParam) as P;
				queriesCache[cacheKey] = () => {
					loadData(frozenQueryParam);
				};
			});

			const alreadyLoading = untrack(() => loadingCache[cacheKey]);
			if (!alreadyLoading) {
				loadData(queryParam);
			}

			return () => {
				untrack(() => {
					activeQueries.splice(
						activeQueries.findIndex(
							(activeKey) => activeKey.join('__') === currentKey.join('__')
						),
						1
					);
				});
			};
		});

		const refetch = () => {
			queriesCache[internal.currentKey]?.();
		};

		return {
			query,
			refetch
		};
	};
}

/**
 * Invalidates queries based on the provided key.
 * This will cause the matching queries to be reloaded if they are currently active.
 * @param key The key of the query to invalidate.
 * @param options Options for invalidation
 * @param options.force If true, forces the query to be invalidated even if it is not currently loading.
 * @param options.exact If true, only invalidates queries that match the exact key. Otherwise, it will invalidate all queries that start with the provided key.
 * @returns void
 */
export function invalidateQueries(
	key: string[],
	options?: { force?: boolean; exact?: boolean }
) {
	const cacheKey = key.join('__');
	const queriesToInvalidate = activeQueries.filter((query) =>
		options?.exact
			? query.join('__') === cacheKey
			: query.join('__').startsWith(cacheKey)
	);

	queriesToInvalidate.forEach((query) => {
		const cacheKey = query.join('__');

		if (options?.force) {
			loadingCache[cacheKey] = false;
			dataCache[cacheKey] = undefined;
			errorCache[cacheKey] = undefined;
		}

		queriesCache[cacheKey]?.();
	});
}

/**
 * Constructs a LoadSuccess object.
 * @param data The data to be returned.
 * @returns A LoadSuccess object containing the data.
 */
export function succeed<T>(data: T): LoadSuccess<T> {
	return { success: true, data };
}

/**
 * Constructs a LoadFailure object.
 * @param error The error to be returned.
 * @returns A LoadFailure object containing the error.
 */
export function fail<E>(error: E): LoadFailure<E> {
	return { success: false, error };
}

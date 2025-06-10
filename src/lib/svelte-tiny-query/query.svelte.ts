import { untrack } from 'svelte';

// Types

type LoadSuccess<T> = { success: true; data: T };
type LoadFailure<E> = { success: false; error: E };

export type LoadResult<T, E> = LoadSuccess<T> | LoadFailure<E>;

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

/**
 * Constructs a LoadSuccess object.
 * @param data The data to be represented.
 * @returns A LoadSuccess object containing the data.
 */
export function succeed<T>(data: T): LoadSuccess<T> {
	return { success: true, data };
}

/**
 * Constructs a LoadFailure object.
 * @param error The error to be represented.
 * @returns A LoadFailure object containing the error.
 */
export function fail<E>(error: E): LoadFailure<E> {
	return { success: false, error };
}

// State

const queriesByKey = $state({} as Record<string, () => void>);
const loadingByKey = $state({} as Record<string, boolean>);
const dataByKey = $state({} as Record<string, unknown>);
const errorByKey = $state({} as Record<string, unknown>);
const staleTimeStampByKey = $state({} as Record<string, number>);
export const activeQueries = $state({ keys: [] as string[][] });

/**
 * Global loading state to track the number of active queries.
 */
export const globalLoading = $state({ count: 0 });

// Actions

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
	/**
	 * Foo.
	 */
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
			query.data = (dataByKey[internal.currentKey] ?? options?.initialData) as
				| T
				| undefined;
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
				activeQueries.keys = [...activeQueries.keys, currentKey];
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
					const activeQueryIndex = activeQueries.keys.findIndex(
						(key) => key?.join('__') === cacheKey
					);

					if (activeQueryIndex >= 0) {
						activeQueries.keys = activeQueries.keys.filter(
							(_, index) => index !== activeQueryIndex
						);
					}
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

	// marks all relevant queries as stale
	Object.keys(staleTimeStampByKey).forEach((key) => {
		if (options?.exact ? key === cacheKey : key.startsWith(cacheKey)) {
			staleTimeStampByKey[key] = +new Date() - 1;
		}
	});

	// reloads the currently active queries right away
	const queriesToInvalidate = activeQueries.keys.filter((query) =>
		options?.exact
			? query.join('__') === cacheKey
			: query.join('__').startsWith(cacheKey)
	);

	queriesToInvalidate.forEach((query) => {
		const cacheKey = query.join('__');

		if (options?.force) {
			loadingByKey[cacheKey] = false;
			dataByKey[cacheKey] = undefined;
			errorByKey[cacheKey] = undefined;
		}

		queriesByKey[cacheKey]?.();
	});
}

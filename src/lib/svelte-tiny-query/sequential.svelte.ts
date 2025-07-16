import { untrack } from 'svelte';

import { generateKey } from './utils.js';
import {
	queryLoaderByKey,
	loadingByKey,
	dataByKey,
	errorByKey,
	staleTimeStampByKey,
	activeQueryCounts,
	globalLoading
} from './cache.svelte';

// Types

type SequentialLoadSuccess<TData, TCursor> = {
	success: true;
	data: TData;
	cursor: TCursor | undefined;
};
type LoadFailure<TError> = { success: false; error: TError };

type SequentialLoadResult<TData, TCursor, TError> =
	| SequentialLoadSuccess<TData, TCursor>
	| LoadFailure<TError>;

type QueryState<TData, TError> = {
	loading: boolean;
	hasMore: boolean | undefined;
	data: TData[] | undefined;
	error: TError | undefined;
};

// States

const cursorByKey: Record<string, unknown> = $state({});
const hasMoreByKey: Record<string, boolean | undefined> = $state({});

// Actions

/**
 * Creates a query function that can be used to load data.
 * @param key Path of the query
 * @param loadFn Function to load the data
 * @returns Query function to use in Svelte components
 */
export function createSequentialQuery<TError, TData, TCursor, TParam = void>(
	key: string[] | ((queryParam: TParam) => string[]),
	loadFn: (
		queryParam: TParam,
		cursor?: TCursor
	) => Promise<SequentialLoadResult<TData, TCursor, TError>>
): (queryParam: TParam) => {
	query: QueryState<TData, TError>;
	loadMore: () => void;
	reload: () => void;
} {
	const initializeState = (currentKey: string) => {
		const internal = $state({ currentKey });
		const query: QueryState<TData, TError> = $state({
			loading: false,
			hasMore: undefined,
			data: undefined,
			error: undefined
		});

		$effect(() => {
			query.loading = !!loadingByKey[internal.currentKey];
		});

		$effect(() => {
			query.data =
				internal.currentKey in dataByKey
					? (dataByKey[internal.currentKey] as TData[])
					: undefined;
		});

		$effect(() => {
			query.error = errorByKey[internal.currentKey] as TError | undefined;
		});

		$effect(() => {
			query.hasMore = hasMoreByKey[internal.currentKey];
		});

		return {
			internal,
			query
		};
	};

	const loadData = async (queryParam: TParam, reload = false) => {
		const cacheKey = generateKey(key, queryParam).join('__');

		untrack(() => {
			errorByKey[cacheKey] = undefined;
			loadingByKey[cacheKey] = true;
			globalLoading.count++;
		});

		const cursor = untrack(() => cursorByKey[cacheKey] as TCursor | undefined);
		const loadResult = await loadFn(queryParam, !reload ? cursor : undefined);

		if (loadResult.success) {
			if (Array.isArray(dataByKey[cacheKey]) && !reload) {
				dataByKey[cacheKey].push(loadResult.data);
			} else {
				dataByKey[cacheKey] = [loadResult.data];
			}

			untrack(() => {
				cursorByKey[cacheKey] = loadResult.cursor;
				hasMoreByKey[cacheKey] = loadResult.cursor !== undefined;
			});
		} else {
			errorByKey[cacheKey] = loadResult.error;
		}

		untrack(() => {
			loadingByKey[cacheKey] = false;
			globalLoading.count--;
		});
	};

	return (queryParam: TParam) => {
		const cacheKey = generateKey(key, queryParam).join('__');
		const { internal, query } = initializeState(cacheKey);

		$effect(() => {
			const currentKey = generateKey(key, queryParam);
			const cacheKey = currentKey.join('__');
			internal.currentKey = cacheKey;

			untrack(() => {
				activeQueryCounts[cacheKey] = (activeQueryCounts[cacheKey] ?? 0) + 1;
			});

			const frozenQueryParam = $state.snapshot(queryParam) as TParam;
			const queryLoaderInstance = () => {
				loadData(frozenQueryParam);
			};

			untrack(() => {
				queryLoaderByKey[cacheKey] = queryLoaderInstance;
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

		return {
			query,
			/**
			 * Reloads the query.
			 */
			reload: () => {
				if (query.loading || !query.hasMore) return;
				loadData(queryParam, true);
			},
			/**
			 * Loads more data if available.
			 */
			loadMore: () => {
				if (query.loading || !query.hasMore) return;
				loadData(queryParam, false);
			}
		};
	};
}

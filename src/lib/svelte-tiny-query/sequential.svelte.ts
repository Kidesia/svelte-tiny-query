import { untrack } from 'svelte';

import { generateKey } from './utils.js';
import {
	queryLoaderByKey,
	loadingByKey,
	dataByKey,
	errorByKey,
	activeQueryCounts,
	globalLoading,
	loadedTimeStampByKey,
	staleTimeStampByKey
} from './cache.svelte';

// Types

type SequentialLoadSuccess<TData, TCursor> = {
	success: true;
	data: TData;
	cursor: TCursor | undefined;
};
type LoadFailure<TError> = { success: false; error: TError };

export type SequentialLoadResult<TData, TCursor, TError> =
	| SequentialLoadSuccess<TData, TCursor>
	| LoadFailure<TError>;

type QueryState<TData, TError> = {
	loading: boolean;
	hasMore: boolean | undefined;
	data: TData[] | undefined;
	error: TError | undefined;
	loadedTimeStamp: number | undefined;
	staleTimeStamp: number | undefined;
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
	) => Promise<SequentialLoadResult<TData, TCursor, TError>>,
	options?: {
		initialData?: TData;
		staleTime?: number;
	}
): (queryParam: TParam) => {
	query: QueryState<TData, TError>;
	loadMore: () => void;
	reload: () => void;
} {
	const loadData = async (queryParam: TParam, reload = false) => {
		const cacheKey = generateKey(key, queryParam).join('__');

		errorByKey[cacheKey] = undefined;
		loadingByKey[cacheKey] = true;
		globalLoading.count++;

		const cursor = cursorByKey[cacheKey] as TCursor | undefined;
		const loadResult = await loadFn(queryParam, !reload ? cursor : undefined);

		if (loadResult.success) {
			if (Array.isArray(dataByKey[cacheKey]) && !reload) {
				dataByKey[cacheKey].push(loadResult.data);
			} else {
				dataByKey[cacheKey] = [loadResult.data];
			}

			cursorByKey[cacheKey] = loadResult.cursor;
			hasMoreByKey[cacheKey] = loadResult.cursor !== undefined;
			loadedTimeStampByKey[cacheKey] = +new Date();
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

		const queryState: QueryState<TData, TError> = $state({
			loading: false,
			hasMore: undefined,
			data: undefined,
			error: undefined,
			loadedTimeStamp: undefined,
			staleTimeStamp: undefined
		});

		$effect(() => {
			// Update loading whenever the key or the referenced data change
			queryState.loading = !!loadingByKey[internalState.currentKey];
		});

		$effect(() => {
			// Update data whenever the key or the referenced data change
			queryState.data = dataByKey[internalState.currentKey] as
				| TData[]
				| undefined;
		});

		$effect(() => {
			// Update error whenever the key or the referenced data change
			queryState.error = errorByKey[internalState.currentKey] as
				| TError
				| undefined;
		});

		$effect(() => {
			// Update loadedTimeStamp whenever the key or the referenced data change
			queryState.loadedTimeStamp =
				loadedTimeStampByKey[internalState.currentKey];
		});

		$effect(() => {
			// Update staleTimeStamp whenever the key or the referenced data change
			queryState.staleTimeStamp = staleTimeStampByKey[internalState.currentKey];
		});

		$effect(() => {
			// Update hasMore whenever the key or the referenced data change
			queryState.hasMore = hasMoreByKey[internalState.currentKey];
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
				const notFetchedYet = !loadedTimeStampByKey[cacheKey];

				// We never consider sequential queries as stale (TODO: do!), so we don't check the staleTimeStamp here.
				if (!alreadyLoading && notFetchedYet) {
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
				// TODO: allow reloading while its already loading (should then abort the previous request)
				if (queryState.loading) return;
				loadData(queryParam, true);
			},
			loadMore: () => {
				if (queryState.loading || !queryState.hasMore) return;
				loadData(queryParam, false);
			}
		};
	};
}

import { untrack } from 'svelte';

import { generateKey } from './utils.js';
import {
	queryLoaderByKey,
	loadingByKey,
	dataByKey,
	errorByKey,
	activeQueryCounts,
	globalLoading,
	fetchedTimeStampByKey
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
				fetchedTimeStampByKey[cacheKey] = +new Date();
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
		const internalState = $state({
			currentKey: generateKey(key, queryParam).join('__')
		});

		const queryState: QueryState<TData, TError> = $state({
			loading: false,
			hasMore: undefined,
			data: undefined,
			error: undefined
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
				const notFetchedYet = !fetchedTimeStampByKey[cacheKey];

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
				if (queryState.loading || !queryState.hasMore) return;
				loadData(queryParam, true);
			},
			loadMore: () => {
				if (queryState.loading || !queryState.hasMore) return;
				loadData(queryParam, false);
			}
		};
	};
}

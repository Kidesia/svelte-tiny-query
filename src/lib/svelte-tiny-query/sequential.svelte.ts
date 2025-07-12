import { untrack } from 'svelte';

import { generateKey } from './utils.ts';
import {
	queriesByKey,
	loadingByKey,
	dataByKey,
	errorByKey,
	staleTimeStampByKey,
	activeQueryCounts,
	globalLoading
} from './cache.svelte.ts';

// Types

type SequentialLoadSuccess<TData, TCursor> = {
	success: true;
	data: TData;
	cursor: TCursor;
};
type LoadFailure<TError> = { success: false; error: TError };

type SequentialLoadResult<TData, TCursor, TError> =
	| SequentialLoadSuccess<TData, TCursor>
	| LoadFailure<TError>;

type QueryState<TData, TCursor, TError> = {
	loading: boolean;
	error: TError | undefined;
	data: TData | undefined;
	nextCursor: TCursor | undefined;
};

// Actions

/**
 * Creates a query function that can be used to load data.
 * @param key Path of the query
 * @param loadFn Function to load the data
 * @returns Query function to use in Svelte components
 */
export function createSequentialQuery<TData, TCursor, TParam, TError>(
	key: string[] | ((queryParam: TParam) => string[]),
	loadFn: (
		queryParam: TParam,
		cursor?: TCursor
	) => Promise<SequentialLoadResult<TData, TCursor, TError>>
): (queryParam: TParam) => {
	query: QueryState<TData, TCursor, TError>;
	reload: () => void;
} {
	const initializeState = (currentKey: string) => {
		const internal = $state({ currentKey });
		const query: QueryState<TData, TCursor, TError> = $state({
			loading: false,
			error: undefined,
			data: undefined,
			nextCursor: undefined
		});

		$effect(() => {
			query.loading = !!loadingByKey[internal.currentKey];
		});

		$effect(() => {
			query.data =
				internal.currentKey in dataByKey
					? (dataByKey[internal.currentKey] as TData)
					: undefined;
		});

		$effect(() => {
			query.error = errorByKey[internal.currentKey] as TError | undefined;
		});

		return {
			internal,
			query
		};
	};

	const loadData = async (queryParam: TParam) => {
		const cacheKey = generateKey(key, queryParam).join('__');

		untrack(() => {
			errorByKey[cacheKey] = undefined;
			loadingByKey[cacheKey] = true;
			globalLoading.count++;
		});

		const loadResult = await loadFn(queryParam);
		if (loadResult.success) {
			dataByKey[cacheKey] = loadResult.data;
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

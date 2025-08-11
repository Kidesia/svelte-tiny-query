import { untrack } from 'svelte';

import { generateKey } from './utils.js';
import type { LoadResult } from './loadHelpers.js';
import {
	queryLoaderByKey,
	loadingByKey,
	dataByKey,
	errorByKey,
	loadedTimeStampByKey,
	staleTimeStampByKey,
	activeQueryCounts,
	globalLoading
} from './cache.svelte';

/**
 * Represents the current state of a query.
 * @template TData The type of the data returned by the query.
 * @template TError The type of the error that can occur during the query.
 */
export type BaseQueryState<TData, TError> = {
	/** Indicates if the query is currently loading. */
	loading: boolean;
	/** Any error that occurred during the query, or undefined if no error. */
	error: TError | undefined;
	/** The data returned by the query. This can be `undefined` if `initialData` was not provided and the query hasn't loaded yet. */
	data: TData;
	/** The timestamp when the data was fetched, or `undefined` if the data hasn't been loaded yet. */
	loadedTimeStamp: number | undefined;
	/** The timestamp when the data will be considered stale, or `undefined` if no staleTime is set or data hasn't loaded. */
	staleTimeStamp: number | undefined;
	/** Reload function to manually trigger the query again. */
	reload: () => void;
};

export function fromBaseQuery<TError, TParam = void, TData = unknown>(
	key: string[] | ((queryParam: TParam) => string[]),
	loadFn: (
		queryParam: TParam,
		cacheKey: string,
		mode: string,
		currentData: TData | undefined
	) => Promise<LoadResult<TData, TError>>,
	queryParam: TParam,
	options?: {
		initialData?: TData;
		staleTime?: number;
	}
): {
	load: (mode?: string) => void;
	external: BaseQueryState<TData | undefined, TError>;
} {
	const internalState = $state({
		currentKey: generateKey(key, queryParam).join('__')
	});

	$effect(() => {
		// Reset state and run the query loader when the queryParam changes
		const cacheKey = generateKey(key, queryParam).join('__');

		untrack(() => {
			// Set the new cache key in the internal state
			internalState.currentKey = cacheKey;

			// Increment the active query count for this cache key
			activeQueryCounts[cacheKey] = (activeQueryCounts[cacheKey] ?? 0) + 1;

			// Create and store the query loader if it doesn't exist
			if (!queryLoaderByKey[cacheKey]) {
				const frozenQueryParam = $state.snapshot(queryParam) as TParam;

				const queryLoaderWithParam = async (mode = 'load') => {
					const cacheKey = generateKey(key, queryParam).join('__');

					const alreadyLoading = loadingByKey[cacheKey];
					const alreadyLoaded = !!loadedTimeStampByKey[cacheKey];
					const staleData = staleTimeStampByKey[cacheKey] <= +new Date();

					if (alreadyLoading || (alreadyLoaded && !staleData)) {
						return;
					}

					errorByKey[cacheKey] = undefined;
					loadingByKey[cacheKey] = true;
					globalLoading.count++;

					const loadResult = await loadFn(
						frozenQueryParam,
						cacheKey,
						mode,
						$state.snapshot(dataByKey[cacheKey]) as TData | undefined
					);

					if (loadResult.success) {
						dataByKey[cacheKey] = loadResult.data;
						loadedTimeStampByKey[cacheKey] = +new Date();
						staleTimeStampByKey[cacheKey] =
							+new Date() + (options?.staleTime ?? 0);
					} else {
						errorByKey[cacheKey] = loadResult.error;
					}

					loadingByKey[cacheKey] = false;
					globalLoading.count--;
				};

				queryLoaderByKey[cacheKey] = queryLoaderWithParam;
			}

			// Run the query
			queryLoaderByKey[cacheKey]();
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
		load: (mode?: string) => {
			queryLoaderByKey[internalState.currentKey]?.(mode);
		},
		external: {
			get loading() {
				return !!loadingByKey[internalState.currentKey];
			},
			get data() {
				return (
					(dataByKey[internalState.currentKey] as TData | undefined) ??
					options?.initialData
				);
			},
			get error() {
				return errorByKey[internalState.currentKey] as TError | undefined;
			},
			get loadedTimeStamp() {
				return loadedTimeStampByKey[internalState.currentKey];
			},
			get staleTimeStamp() {
				return staleTimeStampByKey[internalState.currentKey];
			},
			reload: () => {
				queryLoaderByKey[internalState.currentKey]?.('reload');
			}
		}
	};
}

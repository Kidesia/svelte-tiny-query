import { untrack } from 'svelte';

import type { QueryInvokeOptions } from './query.svelte';
import {
	generateCacheKey,
	normalizeParam,
	type QueryLoadMode,
	type QueryParam
} from './utils.js';
import {
	queryLoaderByKey,
	loadingByKey,
	dataByKey,
	errorByKey,
	loadedTimeStampByKey,
	staleTimeStampByKey,
	cursorByKey,
	hasMoreByKey
} from './cache.svelte';
import {
	warnIfTracking,
	trackActiveQueriesCount,
	withLoading
} from './queryHelpers.svelte';

// Types

/**
 * Represents the current state of a sequential query.
 * @template TData The type of the data returned by the query.
 * @template TError The type of the error that can occur during the query.
 */
export type SequentialQueryState<TData, TError> = {
	/** Indicates if the query is currently loading. */
	loading: boolean;
	/** An array of the data returned by the query for each page. Can be `undefined` if `initialData` was not provided and the query hasn't loaded yet. */
	data: TData;
	/** Any error that was returned by the loading function, or undefined if no error. */
	error: TError | undefined;
	/** Indicates if there is more data to load (always undefined while loading). */
	hasMore: boolean | undefined;
	/** The timestamp when the last page was fetched, or `undefined` if no data has been loaded yet. */
	loadedTimeStamp: number | undefined;
	/** The timestamp when the data will be considered stale, or `undefined` if no staleTime is set or data hasn't loaded. */
	staleTimeStamp: number | undefined;
	/** Whether the query is enabled. When `false`, the query will not fetch data. */
	enabled: boolean;
	/** Function to load the next slice of data (if there is more data). */
	loadMore: () => void;
	/** Reload function to manually trigger the query again. Resets the cursor to undefined. */
	reload: () => void;
};

type SequentialLoadSuccess<TData, TCursor> = {
	success: true;
	data: TData;
	cursor: TCursor | undefined;
};
type LoadFailure<TError> = { success: false; error: TError };

export type SequentialLoadResult<TData, TCursor, TError> =
	| SequentialLoadSuccess<TData, TCursor>
	| LoadFailure<TError>;

// Query Constructor

export function createSequentialQuery<
	TError,
	TParam extends QueryParam = void,
	TData = unknown,
	TCursor = unknown
>(
	key: string[] | ((queryParam: TParam) => string[]),
	loadFn: (
		queryParam: TParam,
		cursor?: TCursor
	) => Promise<SequentialLoadResult<TData, TCursor, TError>>,
	options: {
		initialData: TData[];
		staleTime?: number;
	}
): (
	param?: TParam | (() => TParam),
	invokeOptions?: QueryInvokeOptions
) => SequentialQueryState<TData, TError>;

export function createSequentialQuery<
	TError,
	TParam extends QueryParam = void,
	TData = unknown,
	TCursor = unknown
>(
	key: string[] | ((queryParam: TParam) => string[]),
	loadFn: (
		queryParam: TParam,
		cursor?: TCursor
	) => Promise<SequentialLoadResult<TData, TCursor, TError>>,
	options?: {
		initialData?: TData[];
		staleTime?: number;
	}
): (
	param?: TParam | (() => TParam),
	invokeOptions?: QueryInvokeOptions
) => SequentialQueryState<TData[] | undefined, TError>;

export function createSequentialQuery<
	TData,
	TError,
	TParam extends QueryParam = void,
	TCursor = unknown
>(
	key: string[] | ((queryParam: TParam) => string[]),
	loadFn: (
		queryParam: TParam,
		cursor?: TCursor
	) => Promise<SequentialLoadResult<TData, TCursor, TError>>,
	options?: {
		initialData?: TData[];
		staleTime?: number;
	}
): (
	param?: TParam | (() => TParam),
	invokeOptions?: QueryInvokeOptions
) => SequentialQueryState<TData[] | undefined, TError> {
	return (
		paramOrGetter?: TParam | (() => TParam),
		invokeOptions?: QueryInvokeOptions
	) => {
		const getParam = normalizeParam(paramOrGetter);
		const isEnabled = invokeOptions?.enabled ?? (() => true);

		// Helpers
		const loadData = async (
			queryParam: TParam,
			cacheKey: string,
			mode: QueryLoadMode,
			currentData: TData[] | undefined = undefined
		) => {
			const cursor = cursorByKey[cacheKey] as TCursor | undefined;

			const loadResult = await loadFn(
				queryParam,
				mode === 'more' ? cursor : undefined
			);

			if (!loadResult.success) return loadResult;

			cursorByKey[cacheKey] = loadResult.cursor;
			hasMoreByKey[cacheKey] = loadResult.cursor !== undefined;

			let newData = currentData ? [...currentData] : [];

			if (Array.isArray(currentData) && mode === 'more') {
				newData.push(loadResult.data);
			} else {
				newData = [loadResult.data];
			}

			return {
				success: true as const,
				data: newData
			};
		};

		const reloadAllPages = async (queryParam: TParam, cacheKey: string) => {
			const currentData = dataByKey[cacheKey] as TData[] | undefined;
			const numPages = currentData?.length ?? 1;
			let newData = [] as TData[];

			for (let i = 0; i < numPages; i++) {
				const loadResult = await loadData(
					queryParam,
					cacheKey,
					i === 0 ? 'load' : 'more',
					newData
				);
				if (!loadResult.success) return loadResult;
				newData = loadResult.data;
			}

			return {
				success: true as const,
				data: newData
			};
		};

		// State

		const internalState = $state({
			currentKey: generateCacheKey(key, getParam())
		});

		warnIfTracking('createSequentialQuery', internalState.currentKey);

		trackActiveQueriesCount(key, getParam);

		$effect(() => {
			// Track enabled reactively — if disabled, skip loading
			if (!isEnabled()) return;

			// Reset state and run the query loader when the queryParam changes
			const param = getParam();
			const cacheKey = generateCacheKey(key, param);
			const frozenQueryParam = $state.snapshot(param) as TParam;

			untrack(() => {
				// Set the new cache key in the internal state
				internalState.currentKey = cacheKey;

				// Create and store the query loader if it doesn't exist
				if (!queryLoaderByKey[cacheKey]) {
					const queryLoaderWithParam = async (mode?: QueryLoadMode) => {
						withLoading(
							cacheKey,
							() => {
								switch (mode) {
									case 'more':
										return loadData(
											frozenQueryParam,
											cacheKey,
											mode,
											dataByKey[cacheKey] as TData[] | undefined
										);
									case 'reload':
										return loadData(frozenQueryParam, cacheKey, mode);
									default:
										return reloadAllPages(frozenQueryParam, cacheKey);
								}
							},
							options?.staleTime ?? Infinity,
							mode !== undefined
						);
					};

					queryLoaderByKey[cacheKey] = queryLoaderWithParam;
				}

				// Run the query
				queryLoaderByKey[cacheKey]();
			});
		});

		return {
			get loading() {
				if (!isEnabled()) return false;
				const isLoading = loadingByKey[internalState.currentKey];
				return isLoading === undefined ? true : isLoading;
			},
			get data() {
				const currentKey = internalState.currentKey;
				// "in" instead of "??", so that pages of null/undefined data do
				// not fall back to initialData once the query has loaded
				return currentKey in dataByKey
					? (dataByKey[currentKey] as TData[])
					: options?.initialData;
			},
			get hasMore() {
				return loadingByKey[internalState.currentKey]
					? undefined
					: hasMoreByKey[internalState.currentKey];
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
			get enabled() {
				return isEnabled();
			},
			loadMore: () => {
				queryLoaderByKey[internalState.currentKey]?.('more');
			},
			reload: () => {
				queryLoaderByKey[internalState.currentKey]?.('reload');
			}
		};
	};
}

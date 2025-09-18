import { untrack } from 'svelte';

import { generateKey } from './utils.js';
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
import { trackActiveQueriesCount, withLoading } from './queryHelpers.svelte';

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
	TParam = void,
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
): (queryParam: TParam) => SequentialQueryState<TData, TError>;

export function createSequentialQuery<
	TError,
	TParam = void,
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
): (queryParam: TParam) => SequentialQueryState<TData[] | undefined, TError>;

export function createSequentialQuery<
	TData,
	TError,
	TParam = void,
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
): (param: TParam) => SequentialQueryState<TData[] | undefined, TError> {
	return (param: TParam) => {
		// Helpers
		const loadData = async (
			queryParam: TParam,
			cacheKey: string,
			mode: string,
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
			currentKey: generateKey(key, param).join('__')
		});

		trackActiveQueriesCount(internalState.currentKey);

		$effect(() => {
			// Reset state and run the query loader when the queryParam changes
			const cacheKey = generateKey(key, param).join('__');

			untrack(() => {
				// Set the new cache key in the internal state
				internalState.currentKey = cacheKey;

				// Create and store the query loader if it doesn't exist
				if (!queryLoaderByKey[cacheKey]) {
					const frozenQueryParam = $state.snapshot(param) as TParam;

					const queryLoaderWithParam = async (mode: string) => {
						const cacheKey = generateKey(key, param).join('__');

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

					//@ts-expect-error we know that this can have a param
					queryLoaderByKey[cacheKey] = queryLoaderWithParam;
				}

				// Run the query
				queryLoaderByKey[cacheKey]();
			});
		});

		return {
			get loading() {
				const isLoading = loadingByKey[internalState.currentKey];
				return isLoading === undefined ? true : isLoading;
			},
			get data() {
				return (
					(dataByKey[internalState.currentKey] as TData[] | undefined) ??
					options?.initialData
				);
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
			loadMore: () => {
				queryLoaderByKey[internalState.currentKey]?.('more');
			},
			reload: () => {
				queryLoaderByKey[internalState.currentKey]?.('reload');
			}
		};
	};
}

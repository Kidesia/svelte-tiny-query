import { untrack } from 'svelte';
import {
	activeQueryCounts,
	loadingByKey,
	errorByKey,
	loadedTimeStampByKey,
	staleTimeStampByKey,
	dataByKey,
	queryLoaderByKey,
	evictionTimerByKey,
	cursorByKey,
	hasMoreByKey
} from './cache.svelte';
import type { LoadResult } from './loadHelpers.js';
import { generateCacheKey } from './utils.js';

export function warnIfTracking(fnName: string, key: string) {
	if ($effect.tracking()) {
		console.warn(
			`${fnName} (${key}): The returned query function was called inside a reactive context ` +
				'($derived, $effect, .map(), or template expression). ' +
				'This will cause unexpected behavior. ' +
				'Call it at the top level of your component instead, and use a getter for reactive params:\n' +
				'  const query = myQuery(() => param);'
		);
	}
}

export function trackActiveQueriesCount(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	key: string[] | ((p: any) => string[]),
	paramGetter: () => unknown,
	gcTime?: number
) {
	$effect(() => {
		const cacheKey = generateCacheKey(key, paramGetter());

		untrack(() => {
			// Cancel a pending eviction when the query becomes active again
			if (cacheKey in evictionTimerByKey) {
				clearTimeout(evictionTimerByKey[cacheKey]);
				delete evictionTimerByKey[cacheKey];
			}

			// Increment the active query count for this cache key
			activeQueryCounts[cacheKey] = (activeQueryCounts[cacheKey] ?? 0) + 1;
		});

		return () => {
			// Decrement the active query count when the query is destroyed
			const count = (activeQueryCounts[cacheKey] ?? 0) - 1;
			if (count <= 0) {
				delete activeQueryCounts[cacheKey];
				if (gcTime !== undefined && gcTime !== Infinity) {
					scheduleEviction(cacheKey, gcTime);
				}
			} else {
				activeQueryCounts[cacheKey] = count;
			}
		};
	});
}

function scheduleEviction(cacheKey: string, gcTime: number) {
	clearTimeout(evictionTimerByKey[cacheKey]);
	evictionTimerByKey[cacheKey] = setTimeout(() => {
		delete evictionTimerByKey[cacheKey];

		// Skip eviction if the query became active again or is loading
		if (activeQueryCounts[cacheKey] || loadingByKey[cacheKey]) {
			return;
		}

		delete queryLoaderByKey[cacheKey];
		delete loadingByKey[cacheKey];
		delete dataByKey[cacheKey];
		delete errorByKey[cacheKey];
		delete loadedTimeStampByKey[cacheKey];
		delete staleTimeStampByKey[cacheKey];
		delete cursorByKey[cacheKey];
		delete hasMoreByKey[cacheKey];
	}, gcTime);
}

export async function withLoading<TData, TError>(
	key: string,
	loadFn: () => Promise<LoadResult<TData, TError>>,
	staleTime = 0,
	force = false
) {
	// Skip if this query is already loading (loads are never concurrent per
	// key, not even when forced) or if it still has fresh data (unless forced)
	const alreadyLoading = loadingByKey[key];
	const alreadyLoaded = !!loadedTimeStampByKey[key];
	const staleData = staleTimeStampByKey[key] <= Date.now();
	if (alreadyLoading || (!force && alreadyLoaded && !staleData)) {
		return;
	}

	// Reset error and mark as loading
	errorByKey[key] = undefined;
	loadingByKey[key] = true;

	// Run the query function and store results
	const loadResult = await loadFn();
	if (loadResult.success) {
		dataByKey[key] = loadResult.data;
		loadedTimeStampByKey[key] = Date.now();
		staleTimeStampByKey[key] = Date.now() + staleTime;
	} else {
		errorByKey[key] = loadResult.error;
	}

	// Mark the query as no longer loading
	loadingByKey[key] = false;
}

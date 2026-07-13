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
	abortControllerByKey,
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
				if (gcTime !== undefined) {
					scheduleEviction(cacheKey, gcTime, gcTime);
				}
			} else {
				activeQueryCounts[cacheKey] = count;
			}
		};
	});
}

// setTimeout treats delays above 2^31 - 1 as 0, so cap reschedules to
// this and re-check when the timer fires
const MAX_TIMEOUT_DELAY = 2 ** 31 - 1;

function scheduleEviction(cacheKey: string, gcTime: number, delay: number) {
	clearTimeout(evictionTimerByKey[cacheKey]);
	delete evictionTimerByKey[cacheKey];

	// An infinite delay (gcTime or staleTime of Infinity) means the
	// query is never evicted
	if (!Number.isFinite(delay)) return;

	evictionTimerByKey[cacheKey] = setTimeout(
		() => evictIfUnusedAndStale(cacheKey, gcTime),
		Math.min(delay, MAX_TIMEOUT_DELAY)
	);
}

function evictIfUnusedAndStale(cacheKey: string, gcTime: number) {
	delete evictionTimerByKey[cacheKey];

	// The query became active again in the meantime
	if (activeQueryCounts[cacheKey]) return;

	// Wait for an in-flight load to finish before deciding
	if (loadingByKey[cacheKey]) {
		scheduleEviction(cacheKey, gcTime, gcTime);
		return;
	}

	// A query is evicted gcTime after it is both unused and stale, so
	// fresh data is never collected. A query without a stale timestamp
	// (it only ever produced an error) counts as stale.
	const staleTimeStamp = staleTimeStampByKey[cacheKey] ?? 0;
	const remaining = staleTimeStamp + gcTime - Date.now();
	if (remaining > 0) {
		scheduleEviction(cacheKey, gcTime, remaining);
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
}

export async function withLoading<TData, TError>(
	key: string,
	loadFn: (signal: AbortSignal) => Promise<LoadResult<TData, TError>>,
	staleTime = 0,
	force = false,
	retry = 0
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

	// The signal allows cancelLoad to abort this load. A cancelled load
	// discards its result completely and leaves all state untouched (the
	// canceller has already taken care of the loading flag)
	const controller = new AbortController();
	abortControllerByKey[key] = controller;
	const { signal } = controller;

	// Run the query function, retrying failures with exponential backoff.
	// Only the final result is stored: while retrying, the query simply
	// stays in its loading state and intermediate errors are not exposed
	let loadResult = await loadFn(signal);
	for (let attempt = 0; !loadResult.success && attempt < retry; attempt++) {
		if (signal.aborted) return;
		await sleep(Math.min(1000 * 2 ** attempt, 30_000));
		if (signal.aborted) return;
		loadResult = await loadFn(signal);
	}

	if (signal.aborted) return;
	if (abortControllerByKey[key] === controller) {
		delete abortControllerByKey[key];
	}

	// Store the result
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

/**
 * Cancels the in-flight load of a query (if any). The load's result is
 * discarded, so no data, error or timestamps of the cancelled load are
 * ever stored.
 */
export function cancelLoad(key: string) {
	const controller = abortControllerByKey[key];
	if (!controller) return;

	controller.abort();
	delete abortControllerByKey[key];

	// The cancelled load will not touch any state, so the loading flag
	// is reset here (a follow-up load can start right away)
	loadingByKey[key] = false;
}

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

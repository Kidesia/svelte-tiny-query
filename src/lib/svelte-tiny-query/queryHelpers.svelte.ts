import { untrack } from 'svelte';
import {
	activeQueryCounts,
	loadingByKey,
	errorByKey,
	loadedTimeStampByKey,
	staleTimeStampByKey,
	dataByKey
} from './cache.svelte';
import type { LoadResult } from './loadHelpers.js';
import { generateKey } from './utils.js';

export function trackActiveQueriesCount(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	key: string[] | ((p: any) => string[]),
	param: unknown
) {
	$effect(() => {
		const cacheKey = generateKey(key, param).join('__');

		untrack(() => {
			// Increment the active query count for this cache key
			activeQueryCounts[cacheKey] = (activeQueryCounts[cacheKey] ?? 0) + 1;
		});

		return () => {
			// Decrement the active query count when the query is destroyed
			const newCount = Math.max((activeQueryCounts[cacheKey] ?? 0) - 1, 0);
			if (newCount <= 0) {
				delete activeQueryCounts[cacheKey];
				return;
			} else {
				activeQueryCounts[cacheKey] = Math.max(
					(activeQueryCounts[cacheKey] ?? 0) - 1,
					0
				);
			}
		};
	});
}

export async function withLoading<TData, TError>(
	key: string,
	loadFn: () => Promise<LoadResult<TData, TError>>,
	staleTime = 0,
	force = false
) {
	// Check if the query is already loading or still has fresh data
	const alreadyLoading = loadingByKey[key];
	const alreadyLoaded = !!loadedTimeStampByKey[key];
	const staleData = staleTimeStampByKey[key] <= +new Date();
	if (!force && (alreadyLoading || (alreadyLoaded && !staleData))) {
		return;
	}

	// Reset error and mark as loading
	errorByKey[key] = undefined;
	loadingByKey[key] = true;

	// Run the query function and store results
	const loadResult = await loadFn();
	if (loadResult.success) {
		dataByKey[key] = loadResult.data;
		loadedTimeStampByKey[key] = +new Date();
		staleTimeStampByKey[key] = +new Date() + staleTime;
	} else {
		errorByKey[key] = loadResult.error;
	}

	// Mark the query as no longer loading
	loadingByKey[key] = false;
}

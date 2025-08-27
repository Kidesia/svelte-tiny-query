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

export function trackActiveQuery(key: string) {
	$effect(() => {
		untrack(() => {
			// Increment the active query count for this cache key
			activeQueryCounts[key] = (activeQueryCounts[key] ?? 0) + 1;
		});

		return () => {
			// Decrement the active query count when the query is destroyed
			activeQueryCounts[key] = Math.max((activeQueryCounts[key] ?? 0) - 1, 0);
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

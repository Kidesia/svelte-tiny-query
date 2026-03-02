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
import { generateCacheKey } from './utils.js';

export function warnIfTracking(fnName: string) {
	if ($effect.tracking()) {
		console.warn(
			`${fnName}: The returned query function was called inside a reactive context ` +
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
	paramGetter: () => unknown
) {
	$effect(() => {
		const cacheKey = generateCacheKey(key, paramGetter());

		untrack(() => {
			// Increment the active query count for this cache key
			activeQueryCounts[cacheKey] = (activeQueryCounts[cacheKey] ?? 0) + 1;
		});

		return () => {
			// Decrement the active query count when the query is destroyed
			const count = (activeQueryCounts[cacheKey] ?? 0) - 1;
			if (count <= 0) {
				delete activeQueryCounts[cacheKey];
			} else {
				activeQueryCounts[cacheKey] = count;
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

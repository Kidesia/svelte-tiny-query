import {
	queryLoaderByKey,
	loadingByKey,
	dataByKey,
	errorByKey,
	staleTimeStampByKey,
	activeQueryCounts,
	hasMoreByKey,
	cursorByKey
} from './cache.svelte';

/**
 * Invalidates queries based on the provided key.
 * This will cause the matching queries to be reloaded if they are currently active.
 * @param key The key of the query to invalidate.
 * @param options Options for invalidation
 * @param options.force If true, resets the cache data of the matching queries right away.
 * @param options.exact If true, only invalidates queries that match the exact key. Otherwise, it will invalidate all queries that start with the provided key.
 * @returns void
 */
export function invalidateQueries(
	key: string[],
	options?: { force?: boolean; exact?: boolean }
) {
	const cacheKey = key.join('__');

	// Mark all matching queries as stale
	Object.keys(staleTimeStampByKey).forEach((key) => {
		if (options?.exact ? key === cacheKey : key.startsWith(cacheKey)) {
			staleTimeStampByKey[key] = +new Date() - 1;
		}
	});

	if (options?.force) {
		// Reset the cache data of the matching queries if forced
		Object.keys(dataByKey)
			.filter((key) =>
				options?.exact ? key === cacheKey : key.startsWith(cacheKey)
			)
			.forEach((key) => {
				delete loadingByKey[key];
				delete dataByKey[key];
				delete errorByKey[key];
				delete hasMoreByKey[key];
				delete cursorByKey[key];
			});
	}

	// Reload the matching currently active queries right away
	Object.entries(activeQueryCounts)
		.filter(
			([key, usageCount]) =>
				usageCount > 0 &&
				(options?.exact ? key === cacheKey : key.startsWith(cacheKey))
		)
		.forEach(([key]) => {
			queryLoaderByKey[key]?.();
		});
}

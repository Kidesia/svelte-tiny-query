import {
	queriesByKey,
	loadingByKey,
	dataByKey,
	errorByKey,
	staleTimeStampByKey,
	activeQueryCounts
} from './cache.svelte.ts';

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

	// marks all matching queries as stale
	Object.keys(staleTimeStampByKey).forEach((key) => {
		if (options?.exact ? key === cacheKey : key.startsWith(cacheKey)) {
			staleTimeStampByKey[key] = +new Date() - 1;
		}
	});

	// reloads the matching currently active queries right away
	const queriesToInvalidate = Object.entries(activeQueryCounts).filter(
		([key, usageCount]) =>
			usageCount > 0 &&
			(options?.exact ? key === cacheKey : key.startsWith(cacheKey))
	);

	queriesToInvalidate.forEach(([key]) => {
		if (options?.force) {
			loadingByKey[key] = false;
			dataByKey[key] = undefined;
			errorByKey[key] = undefined;
		}

		queriesByKey[key]?.();
	});
}

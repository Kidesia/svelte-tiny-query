import {
	queryLoaderByKey,
	loadingByKey,
	dataByKey,
	errorByKey,
	loadedTimeStampByKey,
	staleTimeStampByKey,
	activeQueryCounts,
	abortControllerByKey,
	hasMoreByKey,
	cursorByKey
} from './cache.svelte';
import { cancelLoad } from './queryHelpers.svelte';
import { KEY_SEPARATOR } from './utils.js';

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
	const cacheKey = key.join(KEY_SEPARATOR);
	const cacheKeyPrefix = cacheKey + KEY_SEPARATOR;

	const matches = (candidate: string) =>
		options?.exact
			? candidate === cacheKey
			: candidate === cacheKey || candidate.startsWith(cacheKeyPrefix);

	// Mark all matching queries as stale
	Object.keys(staleTimeStampByKey).forEach((key) => {
		if (matches(key)) {
			staleTimeStampByKey[key] = Date.now() - 1;
		}
	});

	// Cancel matching in-flight loads: their responses predate the
	// invalidation and must not be stored as fresh data
	Object.keys(abortControllerByKey).forEach((key) => {
		if (matches(key)) {
			cancelLoad(key);
		}
	});

	// Forget all cached state of the matching queries if forced. Each record
	// is cleared separately, so that queries which only ever produced an
	// error (and thus have no data entry) are also fully reset.
	if (options?.force) {
		const records = [
			loadingByKey,
			dataByKey,
			errorByKey,
			loadedTimeStampByKey,
			staleTimeStampByKey,
			hasMoreByKey,
			cursorByKey
		];
		records.forEach((record) => {
			Object.keys(record).forEach((key) => {
				if (matches(key)) {
					delete record[key];
				}
			});
		});
	}

	// Reload the (matching) active queries right away
	Object.entries(activeQueryCounts).forEach(([key, usageCount]) => {
		if (usageCount > 0 && matches(key)) {
			queryLoaderByKey[key]?.();
		}
	});
}

/**
 * Updates the cached data for a specific query key using an updater function.
 * @param key The key of the query to update.
 * @param updater A function that receives the current data and returns the updated data.
 */
export function updateQueryData(
	key: string[],
	updater: (currentData: unknown) => unknown
) {
	const cacheKey = key.join(KEY_SEPARATOR);
	const cacheKeyPrefix = cacheKey + KEY_SEPARATOR;

	Object.keys(activeQueryCounts).forEach((activeKey) => {
		if (
			(activeKey === cacheKey || activeKey.startsWith(cacheKeyPrefix)) &&
			activeQueryCounts[activeKey] > 0
		) {
			dataByKey[activeKey] = updater(dataByKey[activeKey]);
		}
	});
}

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
	cursorByKey,
	metaByKey
} from './cache.svelte';
import { cancelLoad, reportDefect } from './queryHelpers.svelte';
import { KEY_SEPARATOR } from './utils.js';

// The records that hold the cached state of a query
const cachedStateRecords = [
	loadingByKey,
	dataByKey,
	errorByKey,
	loadedTimeStampByKey,
	staleTimeStampByKey,
	hasMoreByKey,
	cursorByKey
];

/** A cached query, as passed to the predicate of `invalidateQueriesWhere`. */
export type QueryEntry = {
	/** The cache key (for array keys, including the serialized parameter). */
	key: string[];
	/** The metadata derived by the query's `meta` option, if it has one. */
	meta: Record<string, unknown> | undefined;
};

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

	invalidateMatching(matches, options?.force);
}

/**
 * Invalidates all queries for which the predicate returns true, e.g. based on
 * the metadata derived by their `meta` option.
 * This will cause the matching queries to be reloaded if they are currently active.
 * @param predicate Decides whether a cached query is invalidated. It is called once per cache entry, before anything is invalidated. If it throws, the entry is not invalidated.
 * @param options Options for invalidation
 * @param options.force If true, resets the cache data of the matching queries right away.
 * @returns void
 */
export function invalidateQueriesWhere(
	predicate: (entry: QueryEntry) => boolean,
	options?: { force?: boolean }
) {
	const cacheKeys = new Set(
		[...cachedStateRecords, abortControllerByKey, activeQueryCounts].flatMap(
			(record) => Object.keys(record)
		)
	);

	// Decide for all entries first, so that the cache is left untouched while
	// the predicate runs
	const matchingKeys = new Set<string>();
	let defectReported = false;
	cacheKeys.forEach((cacheKey) => {
		try {
			const entry = {
				key: cacheKey.split(KEY_SEPARATOR),
				meta: metaByKey[cacheKey]
			};
			if (predicate(entry)) {
				matchingKeys.add(cacheKey);
			}
		} catch (defect) {
			// A throwing predicate is a defect: the entry is not invalidated,
			// and the first exception of the call is reported
			if (!defectReported) {
				defectReported = true;
				console.error(
					`svelte-tiny-query (${cacheKey}): the predicate of ` +
						'invalidateQueriesWhere threw. Entries for which it throws ' +
						'are not invalidated.'
				);
				reportDefect(defect);
			}
		}
	});

	invalidateMatching((cacheKey) => matchingKeys.has(cacheKey), options?.force);
}

function invalidateMatching(
	matches: (cacheKey: string) => boolean,
	force?: boolean
) {
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
	if (force) {
		cachedStateRecords.forEach((record) => {
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

// ASCII Unit Separator — designed for separating fields in data.
// Cannot appear in any reasonable user key string, making split() safe.
export const KEY_SEPARATOR = '\x1F';

// Types

export type QueryLoadMode = 'more' | 'reload' | 'load';

// Key Helpers

/**
 * Serializes a query parameter into a deterministic string representation.
 * Uses JSON.stringify with sorted keys to ensure consistent key generation
 * regardless of property insertion order.
 */
export function serializeParam(param: unknown): string {
	if (param === null || param === undefined) return '';
	if (typeof param !== 'object') return JSON.stringify(param);
	return JSON.stringify(deepSortKeys(param));
}

/**
 * Recursively sorts object keys for deterministic serialization.
 * Arrays are traversed but their order is preserved.
 */
function deepSortKeys(value: unknown): unknown {
	if (value === null || value === undefined || typeof value !== 'object') {
		return value;
	}
	if (Array.isArray(value)) {
		return value.map(deepSortKeys);
	}
	const sorted: Record<string, unknown> = {};
	for (const key of Object.keys(value as Record<string, unknown>).sort()) {
		sorted[key] = deepSortKeys((value as Record<string, unknown>)[key]);
	}
	return sorted;
}

/**
 * Normalizes a param that can be either a direct value or a getter function
 * into a consistent getter function.
 */
export function normalizeParam<TParam>(
	paramOrGetter?: TParam | (() => TParam)
): () => TParam {
	if (paramOrGetter === undefined) return () => undefined as TParam;
	if (typeof paramOrGetter === 'function') return paramOrGetter as () => TParam;
	return () => paramOrGetter;
}

export function generateCacheKey<T>(
	baseKey: string[] | ((params: T) => string[]),
	queryParam: T
): string {
	if (typeof baseKey === 'function') {
		return baseKey(queryParam).join(KEY_SEPARATOR);
	}

	const serialized = serializeParam(queryParam);
	const segments = serialized ? [...baseKey, serialized] : baseKey;
	return segments.join(KEY_SEPARATOR);
}

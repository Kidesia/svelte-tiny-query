// ASCII Unit Separator — designed for separating fields in data.
// Cannot appear in any reasonable user key string, making split() safe.
export const KEY_SEPARATOR = '\x1F';

// Types

export type QueryLoadMode = 'more' | 'reload' | 'load';

/** Values that are valid as query parameters (i.e. serializable for cache keys). */
export type QueryParam =
	| void
	| string
	| number
	| boolean
	| bigint
	| symbol
	| null
	| undefined
	| Date
	| RegExp
	| QueryParam[]
	| { [key: string]: QueryParam };

// Key Helpers

/**
 * Serializes a query parameter into a deterministic string representation.
 * Uses JSON.stringify with sorted keys to ensure consistent key generation
 * regardless of property insertion order.
 */
export function serializeParam(param: QueryParam): string {
	if (param === null || param === undefined) return '';

	switch (typeof param) {
		case 'bigint':
			return `${param}n`;
		case 'symbol':
			return `@@${param.description ?? ''}`;
		case 'object':
			break;
		default:
			return JSON.stringify(param);
	}

	// Non-plain objects: give them a distinct, non-colliding representation
	if (param instanceof Date) return `Date:${param.toISOString()}`;
	if (param instanceof RegExp) return `RegExp:${param.toString()}`;

	return JSON.stringify(deepSortKeys(param));
}

/**
 * Returns true if the value is a plain object (created by `{}`, `new Object()`,
 * or `Object.create(null)`).
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
	if (typeof value !== 'object' || value === null) return false;
	const proto = Object.getPrototypeOf(value);
	return proto === Object.prototype || proto === null;
}

/**
 * Recursively sorts object keys for deterministic serialization.
 * Arrays are traversed but their order is preserved.
 * Only plain objects have their keys sorted; non-plain objects are
 * serialized via serializeParam to avoid producing empty/colliding keys.
 */
function deepSortKeys(value: QueryParam): unknown {
	if (value === null || value === undefined) return value;
	// Primitives that JSON.stringify can't handle natively
	if (typeof value === 'bigint' || typeof value === 'symbol') {
		return serializeParam(value);
	}
	if (typeof value !== 'object') {
		return value;
	}
	if (Array.isArray(value)) {
		return value.map(deepSortKeys);
	}
	if (!isPlainObject(value)) {
		// Return a distinguishable string so JSON.stringify doesn't lose it
		return serializeParam(value as QueryParam);
	}
	const sorted: Record<string, unknown> = {};
	for (const key of Object.keys(value).sort()) {
		sorted[key] = deepSortKeys(value[key]);
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

export function generateCacheKey<T extends QueryParam>(
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

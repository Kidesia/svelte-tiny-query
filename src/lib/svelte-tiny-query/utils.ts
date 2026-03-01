// Key Helpers

/**
 * Serializes a query parameter into a deterministic string representation.
 * Uses JSON.stringify with sorted keys to ensure consistent key generation
 * regardless of property insertion order.
 */
export function serializeParam(param: unknown): string {
	if (param === null || param === undefined) return '';
	if (typeof param !== 'object') return JSON.stringify(param);
	if (Array.isArray(param)) return JSON.stringify(param);

	// Sort keys for deterministic output
	const sorted: Record<string, unknown> = {};
	for (const key of Object.keys(param as Record<string, unknown>).sort()) {
		sorted[key] = (param as Record<string, unknown>)[key];
	}
	return JSON.stringify(sorted);
}

export function generateKey<T>(
	baseKey: string[] | ((params: T) => string[]),
	queryParam: T
) {
	if (typeof baseKey === 'function') {
		return baseKey(queryParam);
	}

	const serialized = serializeParam(queryParam);
	return serialized ? [...baseKey, serialized] : baseKey;
}

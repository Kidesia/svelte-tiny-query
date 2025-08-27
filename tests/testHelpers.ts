export function captureState(
	queryObject: Record<string, unknown>
): Record<string, unknown> {
	const snapshot = {} as Record<string, unknown>;
	for (const key in queryObject) {
		if (typeof queryObject[key] !== 'function') {
			snapshot[key] = queryObject[key];
		}
	}
	return snapshot;
}

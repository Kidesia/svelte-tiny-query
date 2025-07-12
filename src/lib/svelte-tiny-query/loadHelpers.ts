// Load Helpers

type LoadSuccess<TData> = { success: true; data: TData };
type LoadFailure<TError> = { success: false; error: TError };

export type LoadResult<TData, TError> =
	| LoadSuccess<TData>
	| LoadFailure<TError>;

/**
 * Constructs a LoadSuccess object.
 * @param data The data to be represented.
 * @returns A LoadSuccess object containing the data.
 */
export function succeed<TData>(data: TData): LoadSuccess<TData> {
	return { success: true, data };
}

/**
 * Constructs a LoadFailure object.
 * @param error The error to be represented.
 * @returns A LoadFailure object containing the error.
 */
export function fail<TError>(error: TError): LoadFailure<TError> {
	return { success: false, error };
}

// Types

type LoadSuccess<T> = {
	success: true;
	data: T;
};

type LoadFailure<E> = {
	success: false;
	error: E;
};

export type LoadResult<T, E> = LoadSuccess<T> | LoadFailure<E>;

// constructors

export function succeed<T>(data: T): LoadSuccess<T> {
	return { success: true, data };
}

export function fail<E>(error: E): LoadFailure<E> {
	return { success: false, error };
}

import type { LoadResult } from './query.svelte.ts';

/**
 * Creates a mutation function that can be used to load data.
 * @param mutateFn Function to mutate the data
 * @returns Object with result and mutation function to use in Svelte components
 */
export function createMutation<E, P = void, T = unknown>(
	mutateFn: (queryParam: P) => Promise<LoadResult<T, E>>
) {
	const result = $state<{
		loading: boolean;
		error: E | undefined;
		data: T | undefined;
	}>({ loading: false, error: undefined, data: undefined });

	async function mutate(variables: P) {
		result.loading = true;
		result.error = undefined;
		try {
			const res = await mutateFn(variables);
			if (res.success) {
				result.data = res.data;
			} else {
				result.data = undefined;
				result.error = res.error;
			}
		} catch (err: any) {
			result.data = undefined;
			result.error = err;
		} finally {
			result.loading = false;
		}
		return result;
	}

	return {
		result,
		mutate
	};
}

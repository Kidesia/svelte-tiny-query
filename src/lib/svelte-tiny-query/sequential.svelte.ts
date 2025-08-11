import { fromBaseQuery, type BaseQueryState } from './baseQuery.svelte.ts';
import { loadingByKey } from './cache.svelte.ts';
import { generateKey } from './utils.ts';

// Types

type SequentialLoadSuccess<TData, TCursor> = {
	success: true;
	data: TData;
	cursor: TCursor | undefined;
};
type LoadFailure<TError> = { success: false; error: TError };

export type SequentialLoadResult<TData, TCursor, TError> =
	| SequentialLoadSuccess<TData, TCursor>
	| LoadFailure<TError>;

type SequentialQueryState<TData, TError> = BaseQueryState<TData, TError> & {
	hasMore: boolean | undefined;
	loadMore: () => void;
};

// States

const cursorByKey: Record<string, unknown> = $state({});
const hasMoreByKey: Record<string, boolean | undefined> = $state({});

export function createSequentialQuery<
	TError,
	TParam = void,
	TData = unknown,
	TCursor = unknown
>(
	key: string[] | ((queryParam: TParam) => string[]),
	loadFn: (
		queryParam: TParam,
		cursor?: TCursor
	) => Promise<SequentialLoadResult<TData, TCursor, TError>>,
	options: {
		initialData: TData[];
		staleTime?: number;
	}
): (queryParam: TParam) => SequentialQueryState<TData, TError>;

export function createSequentialQuery<
	TError,
	TParam = void,
	TData = unknown,
	TCursor = unknown
>(
	key: string[] | ((queryParam: TParam) => string[]),
	loadFn: (
		queryParam: TParam,
		cursor?: TCursor
	) => Promise<SequentialLoadResult<TData, TCursor, TError>>,
	options?: {
		initialData?: TData[];
		staleTime?: number;
	}
): (queryParam: TParam) => SequentialQueryState<TData[] | undefined, TError>;

export function createSequentialQuery<
	TError,
	TParam = void,
	TData = unknown,
	TCursor = unknown
>(
	key: string[] | ((queryParam: TParam) => string[]),
	loadFn: (
		queryParam: TParam,
		cursor?: TCursor
	) => Promise<SequentialLoadResult<TData, TCursor, TError>>,
	options?: {
		initialData?: TData[];
		staleTime?: number;
	}
): (queryParam: TParam) => SequentialQueryState<TData[] | undefined, TError> {
	return (queryParam: TParam) => {
		const loadData = async (
			queryParam: TParam,
			cacheKey: string,
			mode: string,
			currentData: TData[] | undefined
		) => {
			const cursor = cursorByKey[cacheKey] as TCursor | undefined;

			const loadResult = await loadFn(
				queryParam,
				mode === 'more' ? cursor : undefined
			);

			if (!loadResult.success) return loadResult;

			cursorByKey[cacheKey] = loadResult.cursor;
			hasMoreByKey[cacheKey] = loadResult.cursor !== undefined;

			let newData = currentData ? [...currentData] : [];

			if (Array.isArray(currentData) && mode === 'more') {
				newData.push(loadResult.data);
			} else {
				newData = [loadResult.data];
			}

			return {
				success: true as const,
				data: newData
			};
		};

		const reloadAllPages = async (
			queryParam: TParam,
			cacheKey: string,
			currentData: TData[] | undefined
		) => {
			const numPages = currentData?.length ?? 1;
			let newData = [] as TData[];

			for (let i = 0; i < numPages; i++) {
				const loadResult = await loadData(
					queryParam,
					cacheKey,
					i === 0 ? 'load' : 'more',
					newData
				);
				if (!loadResult.success) return loadResult;
				newData = loadResult.data;
			}

			return {
				success: true as const,
				data: newData
			};
		};

		const dispatchLoadData = async (
			queryParam: TParam,
			cacheKey: string,
			mode: string,
			currentData: TData[] | undefined
		) => {
			if (mode === 'load') {
				// When the query is mounted or invalidated
				return reloadAllPages(queryParam, cacheKey, currentData);
			} else {
				// When loadMore is called
				return loadData(queryParam, cacheKey, mode, currentData);
			}
		};

		const baseQuery = fromBaseQuery(key, dispatchLoadData, queryParam, options);

		const sequentialQuery = Object.create(baseQuery.external);

		Object.defineProperties(sequentialQuery, {
			hasMore: {
				get() {
					const cacheKey = generateKey(key, queryParam).join('__');
					return loadingByKey[cacheKey] ? undefined : hasMoreByKey[cacheKey];
				},
				enumerable: true,
				configurable: true
			},
			loadMore: {
				value: function () {
					baseQuery.load('more');
				},
				writable: true,
				enumerable: true,
				configurable: true
			}
		});

		return sequentialQuery;
	};
}

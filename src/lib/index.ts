import {
	activeQueryCounts,
	loadingByKey,
	dataByKey
} from './svelte-tiny-query/cache.svelte';

export * from './svelte-tiny-query/query.svelte';
export * from './svelte-tiny-query/sequential.svelte';
export * from './svelte-tiny-query/invalidate.svelte';
export * from './svelte-tiny-query/loadHelpers.js';

export const queryInfos = {
	get isLoading() {
		return Object.entries(loadingByKey).some(([, isLoading]) => isLoading);
	},
	get loadingQueries() {
		return Object.entries(loadingByKey)
			.filter(([, isLoading]) => isLoading)
			.map(([key]) => key.split('__'));
	},
	get activeQueries() {
		return Object.keys(activeQueryCounts).map((key) => key.split('__'));
	},
	get cachedQueries() {
		return Object.keys(dataByKey).map((key) => key.split('__'));
	}
};

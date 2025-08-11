export const queryLoaderByKey = $state(
	{} as Record<string, (mode?: string) => Promise<void>>
);
export const loadingByKey = $state({} as Record<string, boolean>);
export const dataByKey = $state({} as Record<string, unknown>);
export const errorByKey = $state({} as Record<string, unknown>);
export const loadedTimeStampByKey = $state({} as Record<string, number>);
export const staleTimeStampByKey = $state({} as Record<string, number>);
export const activeQueryCounts = $state({} as Record<string, number>);
export const globalLoading = $state({ count: 0 });

export const queryInfos = {
	get activeQueries() {
		return Object.keys(activeQueryCounts).map((key) => key.split('__'));
	},
	get cachedQueries() {
		return Object.keys(dataByKey).map((key) => key.split('__'));
	}
};

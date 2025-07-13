export const queryLoaderByKey = $state({} as Record<string, () => void>);
export const loadingByKey = $state({} as Record<string, boolean>);
export const dataByKey = $state({} as Record<string, unknown>);
export const errorByKey = $state({} as Record<string, unknown>);
export const staleTimeStampByKey = $state({} as Record<string, number>);
export const activeQueryCounts = $state({} as Record<string, number>);
export const globalLoading = $state({ count: 0 });

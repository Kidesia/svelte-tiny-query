import type { QueryLoadMode } from './utils.js';

// Non-Reactive State

export const queryLoaderByKey = {} as Record<
	string,
	(mode?: QueryLoadMode) => Promise<void>
>;

export const evictionTimerByKey = {} as Record<
	string,
	ReturnType<typeof setTimeout>
>;

// Query State

export const loadingByKey = $state({} as Record<string, boolean>);
export const dataByKey = $state({} as Record<string, unknown>);
export const errorByKey = $state({} as Record<string, unknown>);
export const loadedTimeStampByKey = $state({} as Record<string, number>);
export const staleTimeStampByKey = $state({} as Record<string, number>);
export const activeQueryCounts = $state({} as Record<string, number>);

// Sequential Query State

export const cursorByKey = $state({} as Record<string, unknown>);
export const hasMoreByKey = $state({} as Record<string, boolean>);

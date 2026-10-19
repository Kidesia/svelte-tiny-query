import { afterEach, describe, expect, test, vi } from 'vitest';
import { render, waitFor } from '@testing-library/svelte/svelte5';

import { invalidateQueriesWhere } from '../../src/lib/svelte-tiny-query/invalidate.svelte';
import {
	activeQueryCounts,
	dataByKey,
	metaByKey,
	staleTimeStampByKey
} from '../../src/lib/svelte-tiny-query/cache.svelte';
import NoParam from '../createQuery/NoParam.svelte';
import WithParam from '../createQuery/WithParam.svelte';
import SequentialWithParam from '../createSequentialQuery/WithParam.svelte';

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('invalidateQueriesWhere', () => {
	test('invalidates only the queries whose meta matches', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2025, 5, 11, 12, 0, 0));

		let teamACallCount = 0;
		let teamBCallCount = 0;

		const teamAStates = $state({ value: [] });
		const teamBStates = $state({ value: [] });

		const renderedTeamA = render(WithParam, {
			props: {
				states: teamAStates,
				key: ['where-team-a'],
				loadingFn: async () => ({
					success: true,
					data: `a-${++teamACallCount}`
				}),
				queryOptions: { meta: () => ({ team: 'a' }) }
			}
		});

		const renderedTeamB = render(WithParam, {
			props: {
				states: teamBStates,
				key: ['where-team-b'],
				loadingFn: async () => ({
					success: true,
					data: `b-${++teamBCallCount}`
				}),
				queryOptions: { meta: () => ({ team: 'b' }) }
			}
		});

		await waitFor(() => {
			expect(renderedTeamA.queryByText('Data: a-1')).toBeInTheDocument();
			expect(renderedTeamB.queryByText('Data: b-1')).toBeInTheDocument();
		});

		vi.advanceTimersByTime(1000);
		invalidateQueriesWhere((entry) => entry.meta?.team === 'a');

		await waitFor(() => {
			expect(renderedTeamA.queryByText('Data: a-2')).toBeInTheDocument();
		});

		expect(teamBCallCount).toBe(1);
		expect(renderedTeamB.queryByText('Data: b-1')).toBeInTheDocument();
	});

	test('derives the meta from the param of each cache entry', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2025, 5, 11, 12, 0, 0));

		let callCount = 0;
		const states = $state({ value: [] });

		const rendered = render(WithParam, {
			props: {
				states,
				key: ['where-param'],
				loadingFn: async (param: { id: number }) => ({
					success: true,
					data: `id${param.id}-${++callCount}`
				}),
				queryOptions: {
					staleTime: Infinity,
					meta: (param: { id: number }) => ({ id: param.id })
				}
			}
		});

		await waitFor(() => {
			expect(rendered.queryByText('Data: id1-1')).toBeInTheDocument();
		});

		rendered.queryByText('Increment')?.click();

		await waitFor(() => {
			expect(rendered.queryByText('Data: id2-2')).toBeInTheDocument();
		});

		vi.advanceTimersByTime(1000);
		invalidateQueriesWhere((entry) => entry.meta?.id === 1);

		// The active entry (id 2) does not match, so nothing reloads
		expect(callCount).toBe(2);

		// The inactive entry (id 1) was marked stale, so it reloads when used
		// again (despite the infinite staleTime)
		rendered.queryByText('Decrement')?.click();

		await waitFor(() => {
			expect(rendered.queryByText('Data: id1-3')).toBeInTheDocument();
		});
	});

	test('passes the key and an undefined meta for queries without meta, once per entry', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2025, 5, 11, 12, 0, 0));

		let callCount = 0;
		const states = $state({ value: [] });

		const rendered = render(NoParam, {
			props: {
				states,
				key: ['where-no-meta'],
				loadingFn: async () => ({
					success: true,
					data: `data-${++callCount}`
				})
			}
		});

		await waitFor(() => {
			expect(rendered.queryByText('Data: data-1')).toBeInTheDocument();
		});

		vi.advanceTimersByTime(1000);

		const seenKeys: string[][] = [];
		invalidateQueriesWhere((entry) => {
			seenKeys.push(entry.key);
			return entry.key[0] === 'where-no-meta' && entry.meta === undefined;
		});

		await waitFor(() => {
			expect(rendered.queryByText('Data: data-2')).toBeInTheDocument();
		});

		expect(seenKeys.filter((key) => key[0] === 'where-no-meta')).toEqual([
			['where-no-meta']
		]);

		const serializedKeys = seenKeys.map((key) => key.join('/'));
		expect(new Set(serializedKeys).size).toBe(serializedKeys.length);
	});

	test('clears the cached data of matching queries with force', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2025, 5, 11, 12, 0, 0));

		const states = $state({ value: [] });
		const rendered = render(NoParam, {
			props: {
				states,
				key: ['where-force'],
				loadingFn: async () => ({ success: true, data: 'cached' }),
				queryOptions: { meta: () => ({ force: true }) }
			}
		});

		await waitFor(() => {
			expect(rendered.queryByText('Data: cached')).toBeInTheDocument();
		});

		// Unmount, so that force-invalidation does not trigger a reload
		rendered.unmount();

		invalidateQueriesWhere((entry) => entry.meta?.force === true, {
			force: true
		});

		expect('where-force' in dataByKey).toBe(false);
	});

	test('invalidates sequential queries via their meta', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2025, 5, 11, 12, 0, 0));

		let callCount = 0;
		const states = $state({ value: [] });

		const rendered = render(SequentialWithParam, {
			props: {
				states,
				key: ['where-sequential'],
				loadingFn: async () => ({
					success: true,
					data: `page-${++callCount}`,
					cursor: undefined
				}),
				queryOptions: { meta: () => ({ kind: 'sequential' }) }
			}
		});

		await waitFor(() => {
			expect(rendered.queryByText('Data: ["page-1"]')).toBeInTheDocument();
		});

		vi.advanceTimersByTime(1000);
		invalidateQueriesWhere((entry) => entry.meta?.kind === 'sequential');

		await waitFor(() => {
			expect(rendered.queryByText('Data: ["page-2"]')).toBeInTheDocument();
		});
	});

	test('forgets the meta when the query is evicted', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2025, 5, 11, 12, 0, 0));

		const states = $state({ value: [] });
		const rendered = render(NoParam, {
			props: {
				states,
				key: ['where-eviction'],
				loadingFn: async () => ({ success: true, data: 'payload' }),
				queryOptions: { gcTime: 5000, meta: () => ({ evictable: true }) }
			}
		});

		await waitFor(() => {
			expect(rendered.queryByText('Data: payload')).toBeInTheDocument();
		});
		expect(metaByKey['where-eviction']).toEqual({ evictable: true });

		rendered.unmount();
		vi.advanceTimersByTime(5000);

		expect('where-eviction' in metaByKey).toBe(false);
	});

	test('derives the meta from the same param as the loader', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2025, 5, 11, 12, 0, 0));

		const states = $state({ value: [] });
		const rendered = render(WithParam, {
			props: {
				states,
				// The key ignores the param, so all params share one cache entry
				key: () => ['where-shared-key'],
				loadingFn: async (param: { id: number }) => ({
					success: true,
					data: `id${param.id}`
				}),
				queryOptions: { meta: (param: { id: number }) => ({ id: param.id }) }
			}
		});

		await waitFor(() => {
			expect(rendered.queryByText('Data: id1')).toBeInTheDocument();
		});

		rendered.queryByText('Increment')?.click();
		await waitFor(() => {
			expect(rendered.queryByText('Loading: false')).toBeInTheDocument();
		});

		// The cached data still belongs to the first param, and so does the meta
		expect(rendered.queryByText('Data: id1')).toBeInTheDocument();
		expect(metaByKey['where-shared-key']).toEqual({ id: 1 });
	});

	test('caches a query without meta if its meta function throws', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2025, 5, 11, 12, 0, 0));

		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const reportSpy = vi.fn();
		vi.stubGlobal('reportError', reportSpy);

		const defect = new Error('meta boom');
		const states = $state({ value: [] });
		const rendered = render(NoParam, {
			props: {
				states,
				key: ['where-meta-throws'],
				loadingFn: async () => ({ success: true, data: 'loaded' }),
				queryOptions: {
					meta: () => {
						throw defect;
					}
				}
			}
		});

		await waitFor(() => {
			expect(rendered.queryByText('Data: loaded')).toBeInTheDocument();
		});

		expect('where-meta-throws' in metaByKey).toBe(false);
		expect(activeQueryCounts['where-meta-throws']).toBe(1);
		expect(errorSpy).toHaveBeenCalledWith(
			expect.stringContaining('the meta function threw')
		);
		expect(reportSpy).toHaveBeenCalledWith(defect);
	});

	test('does not invalidate entries for which the predicate throws', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2025, 5, 11, 12, 0, 0));

		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const reportSpy = vi.fn();
		vi.stubGlobal('reportError', reportSpy);

		let withMetaCallCount = 0;
		let withoutMetaCallCount = 0;

		const withMetaStates = $state({ value: [] });
		const withoutMetaStates = $state({ value: [] });

		const renderedWithMeta = render(NoParam, {
			props: {
				states: withMetaStates,
				key: ['where-throw-with-meta'],
				loadingFn: async () => ({
					success: true,
					data: `with-${++withMetaCallCount}`
				}),
				queryOptions: { meta: () => ({ live: true }) }
			}
		});

		const renderedWithoutMeta = render(NoParam, {
			props: {
				states: withoutMetaStates,
				key: ['where-throw-without-meta'],
				loadingFn: async () => ({
					success: true,
					data: `without-${++withoutMetaCallCount}`
				})
			}
		});

		await waitFor(() => {
			expect(renderedWithMeta.queryByText('Data: with-1')).toBeInTheDocument();
			expect(
				renderedWithoutMeta.queryByText('Data: without-1')
			).toBeInTheDocument();
		});

		vi.advanceTimersByTime(1000);

		const defect = new Error('predicate boom');
		invalidateQueriesWhere((entry) => {
			if (!entry.meta) throw defect;
			return entry.meta.live === true;
		});

		await waitFor(() => {
			expect(renderedWithMeta.queryByText('Data: with-2')).toBeInTheDocument();
		});

		expect(withoutMetaCallCount).toBe(1);
		expect(errorSpy).toHaveBeenCalledTimes(1);
		expect(reportSpy).toHaveBeenCalledTimes(1);
		expect(reportSpy).toHaveBeenCalledWith(defect);
	});

	test('leaves the cache untouched while the predicate runs', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2025, 5, 11, 12, 0, 0));

		let callCount = 0;
		const firstStates = $state({ value: [] });
		const secondStates = $state({ value: [] });

		const renderedFirst = render(NoParam, {
			props: {
				states: firstStates,
				key: ['where-upfront-first'],
				loadingFn: async () => ({
					success: true,
					data: `first-${++callCount}`
				}),
				queryOptions: { meta: () => ({ upfront: true }) }
			}
		});

		const renderedSecond = render(NoParam, {
			props: {
				states: secondStates,
				key: ['where-upfront-second'],
				loadingFn: async () => ({
					success: true,
					data: `second-${++callCount}`
				}),
				queryOptions: { meta: () => ({ upfront: true }) }
			}
		});

		await waitFor(() => {
			expect(renderedFirst.queryByText('Data: first-1')).toBeInTheDocument();
			expect(renderedSecond.queryByText('Data: second-2')).toBeInTheDocument();
		});

		vi.advanceTimersByTime(1000);

		const staleBefore = { ...staleTimeStampByKey };
		let cacheChanged = false;
		invalidateQueriesWhere((entry) => {
			cacheChanged ||= Object.keys(staleBefore).some(
				(key) => staleTimeStampByKey[key] !== staleBefore[key]
			);
			return entry.meta?.upfront === true;
		});

		expect(cacheChanged).toBe(false);

		await waitFor(() => {
			expect(renderedFirst.queryByText('Data: first-3')).toBeInTheDocument();
			expect(renderedSecond.queryByText('Data: second-4')).toBeInTheDocument();
		});
	});

	test('does not resolve inherited object members as meta', () => {
		expect(metaByKey['constructor']).toBeUndefined();
		expect(metaByKey['toString']).toBeUndefined();
	});
});

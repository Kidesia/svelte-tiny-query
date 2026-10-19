import { describe, expect, test, vi } from 'vitest';
import { render, waitFor } from '@testing-library/svelte/svelte5';

import { invalidateQueriesWhere } from '../../src/lib/svelte-tiny-query/invalidate.svelte';
import {
	dataByKey,
	metaByKey
} from '../../src/lib/svelte-tiny-query/cache.svelte';
import NoParam from '../createQuery/NoParam.svelte';
import WithParam from '../createQuery/WithParam.svelte';
import SequentialWithParam from '../createSequentialQuery/WithParam.svelte';

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
		invalidateQueriesWhere(
			(entry) => (entry.meta as { team: string } | undefined)?.team === 'a'
		);

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
		invalidateQueriesWhere(
			(entry) => (entry.meta as { id: number } | undefined)?.id === 1
		);

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
				queryOptions: { meta: () => 'force-me' }
			}
		});

		await waitFor(() => {
			expect(rendered.queryByText('Data: cached')).toBeInTheDocument();
		});

		// Unmount, so that force-invalidation does not trigger a reload
		rendered.unmount();

		invalidateQueriesWhere((entry) => entry.meta === 'force-me', {
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
				queryOptions: { meta: () => 'sequential' }
			}
		});

		await waitFor(() => {
			expect(rendered.queryByText('Data: ["page-1"]')).toBeInTheDocument();
		});

		vi.advanceTimersByTime(1000);
		invalidateQueriesWhere((entry) => entry.meta === 'sequential');

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

		vi.useRealTimers();
	});
});

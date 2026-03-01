import { describe, expect, test, vi } from 'vitest';
import { render, waitFor } from '@testing-library/svelte/svelte5';

import { queryInfos } from '../../src/lib/index.ts';
import WithParam from './WithParam.svelte';
import NoParam from '../createQuery/NoParam.svelte';

describe('Query Infos', () => {
	test('activeQueries reflects mounted query', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2025, 5, 11, 12, 0, 0));

		const states = $state({ value: [] });
		const activeQueries = $state({ value: [] });
		const rendered = render(WithParam, {
			props: {
				states,
				activeQueries,
				key: ['active-queries-param-test'],
				loadingFn: async (param: { id: number }) => ({
					success: true,
					data: `id is ${param.id}`
				})
			}
		});

		await waitFor(() => {
			expect(rendered.queryByText('Data: id is 1')).toBeInTheDocument();
		});

		// queryInfos.activeQueries should contain this query's key
		expect(queryInfos.activeQueries).toContainEqual([
			'active-queries-param-test',
			'{"id":1}'
		]);

		// Change param
		vi.advanceTimersByTime(1000);
		rendered.queryByText('Increment')?.click();
		await waitFor(() => {
			expect(rendered.queryByText('Data: id is 2')).toBeInTheDocument();
		});

		// activeQueries should now reflect the new param
		expect(queryInfos.activeQueries).toContainEqual([
			'active-queries-param-test',
			'{"id":2}'
		]);
	});

	test('isLoading is true while a query is loading', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2025, 5, 11, 12, 0, 0));

		let resolver: () => void;
		const loadingFn = () =>
			new Promise<{ success: true; data: string }>((resolve) => {
				resolver = () => resolve({ success: true, data: 'done' });
			});

		const states = $state({ value: [] });
		render(NoParam, {
			props: {
				states,
				key: ['is-loading-test'],
				loadingFn
			}
		});

		// While loading, isLoading should be true
		await waitFor(() => {
			expect(queryInfos.isLoading).toBe(true);
		});

		// Resolve the query
		resolver!();
		await waitFor(() => {
			expect(queryInfos.isLoading).toBe(false);
		});
	});

	test('loadingQueries contains keys of currently loading queries', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2025, 5, 11, 12, 0, 0));

		let resolver: () => void;
		const loadingFn = () =>
			new Promise<{ success: true; data: string }>((resolve) => {
				resolver = () => resolve({ success: true, data: 'done' });
			});

		const states = $state({ value: [] });
		render(NoParam, {
			props: {
				states,
				key: ['loading-queries-test'],
				loadingFn
			}
		});

		await waitFor(() => {
			const loading = queryInfos.loadingQueries;
			expect(loading).toContainEqual(['loading-queries-test']);
		});

		resolver!();
		await waitFor(() => {
			const loading = queryInfos.loadingQueries;
			expect(loading).not.toContainEqual(['loading-queries-test']);
		});
	});

	test('cachedQueries contains keys of queries with cached data', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2025, 5, 11, 12, 0, 0));

		const states = $state({ value: [] });
		render(NoParam, {
			props: {
				states,
				key: ['cached-queries-test'],
				loadingFn: async () => ({ success: true, data: 'cached-data' })
			}
		});

		await waitFor(() => {
			const cached = queryInfos.cachedQueries;
			expect(cached).toContainEqual(['cached-queries-test']);
		});
	});
});

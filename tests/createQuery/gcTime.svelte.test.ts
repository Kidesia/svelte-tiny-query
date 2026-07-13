import { describe, expect, test, vi } from 'vitest';
import { render, waitFor } from '@testing-library/svelte/svelte5';

import {
	dataByKey,
	errorByKey,
	loadedTimeStampByKey,
	queryLoaderByKey
} from '../../src/lib/svelte-tiny-query/cache.svelte';
import NoParam from './NoParam.svelte';

describe('Normal Query - gcTime Option', () => {
	test('Evicts all cached state after gcTime when inactive', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2025, 5, 11, 12, 0, 0));

		const mockLoadingFn = vi.fn(async () => ({
			success: true as const,
			data: 'payload'
		}));

		const states = $state({ value: [] });
		const rendered = render(NoParam, {
			props: {
				states,
				key: ['gc-eviction-test'],
				loadingFn: mockLoadingFn,
				queryOptions: { staleTime: Infinity, gcTime: 5000 }
			}
		});

		await waitFor(() => {
			expect(rendered.queryByText('Data: payload')).toBeInTheDocument();
		});
		expect(dataByKey['gc-eviction-test']).toBe('payload');

		// While inactive but before gcTime, the cache is kept
		rendered.unmount();
		vi.advanceTimersByTime(4999);
		expect(dataByKey['gc-eviction-test']).toBe('payload');

		// After gcTime, all cached state is evicted
		vi.advanceTimersByTime(1);
		expect('gc-eviction-test' in dataByKey).toBe(false);
		expect('gc-eviction-test' in errorByKey).toBe(false);
		expect('gc-eviction-test' in loadedTimeStampByKey).toBe(false);
		expect('gc-eviction-test' in queryLoaderByKey).toBe(false);

		// Using the query again loads fresh data
		const states2 = $state({ value: [] });
		const rendered2 = render(NoParam, {
			props: {
				states: states2,
				key: ['gc-eviction-test'],
				loadingFn: mockLoadingFn,
				queryOptions: { staleTime: Infinity, gcTime: 5000 }
			}
		});

		await waitFor(() => {
			expect(rendered2.queryByText('Data: payload')).toBeInTheDocument();
		});
		expect(mockLoadingFn).toHaveBeenCalledTimes(2);

		rendered2.unmount();
		vi.useRealTimers();
	});

	test('Becoming active again within gcTime cancels the eviction', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2025, 5, 11, 12, 0, 0));

		const mockLoadingFn = vi.fn(async () => ({
			success: true as const,
			data: 'payload'
		}));

		const states = $state({ value: [] });
		const rendered = render(NoParam, {
			props: {
				states,
				key: ['gc-cancel-test'],
				loadingFn: mockLoadingFn,
				queryOptions: { staleTime: Infinity, gcTime: 5000 }
			}
		});

		await waitFor(() => {
			expect(rendered.queryByText('Data: payload')).toBeInTheDocument();
		});

		// Unmount and remount before gcTime elapses
		rendered.unmount();
		vi.advanceTimersByTime(2000);

		const states2 = $state({ value: [] });
		const rendered2 = render(NoParam, {
			props: {
				states: states2,
				key: ['gc-cancel-test'],
				loadingFn: mockLoadingFn,
				queryOptions: { staleTime: Infinity, gcTime: 5000 }
			}
		});

		await waitFor(() => {
			expect(rendered2.queryByText('Data: payload')).toBeInTheDocument();
		});

		// The eviction was cancelled, the cache stays warm indefinitely
		// while the query is active
		vi.advanceTimersByTime(60000);
		expect(dataByKey['gc-cancel-test']).toBe('payload');

		// Data came from the cache, no second load happened
		expect(mockLoadingFn).toHaveBeenCalledTimes(1);

		rendered2.unmount();
		vi.useRealTimers();
	});

	test('Without gcTime, the cache is kept indefinitely', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2025, 5, 11, 12, 0, 0));

		const states = $state({ value: [] });
		const rendered = render(NoParam, {
			props: {
				states,
				key: ['gc-none-test'],
				loadingFn: async () => ({ success: true, data: 'payload' })
			}
		});

		await waitFor(() => {
			expect(rendered.queryByText('Data: payload')).toBeInTheDocument();
		});

		rendered.unmount();
		vi.advanceTimersByTime(1000 * 60 * 60 * 24);
		expect(dataByKey['gc-none-test']).toBe('payload');

		vi.useRealTimers();
	});
});

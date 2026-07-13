import { describe, expect, test, vi } from 'vitest';
import { render, waitFor } from '@testing-library/svelte/svelte5';

import NoParam from './NoParam.svelte';
import { invalidateQueries } from '$lib/index.ts';

describe('Sequential Query - No Parameter', () => {
	test('Loads first page', async () => {
		vi.useFakeTimers();
		const mockDate = new Date(2025, 5, 11, 12, 0, 0);
		vi.setSystemTime(mockDate);

		const states = $state({ value: [] });
		const rendered = render(NoParam, {
			props: {
				states,
				key: ['successful-test'],
				loadingFn: async () => ({
					success: true,
					data: 'payload',
					cursor: undefined
				})
			}
		});

		await waitFor(() => {
			expect(rendered.queryByText('Data: ["payload"]')).toBeInTheDocument();
		});

		expect(states.value).toEqual([
			// Initial state
			{
				data: undefined,
				error: undefined,
				loading: true,
				hasMore: undefined,
				loadedTimeStamp: undefined,
				staleTimeStamp: undefined,
				enabled: true
			},
			// After loading there is no more data (cursor was undefined)
			{
				data: ['payload'],
				error: undefined,
				loading: false,
				hasMore: false,
				loadedTimeStamp: mockDate.getTime(),
				staleTimeStamp: Infinity,
				enabled: true
			}
		]);
	});

	test('Error loading first load', async () => {
		vi.useFakeTimers();
		const mockDate = new Date(2025, 5, 11, 12, 0, 0);
		vi.setSystemTime(mockDate);

		const states = $state({ value: [] });
		const rendered = render(NoParam, {
			props: {
				states,
				key: ['error-test'],
				loadingFn: async () => ({
					success: false,
					error: 'Error loading data',
					data: undefined
				})
			}
		});

		await waitFor(() => {
			expect(
				rendered.queryByText('Error: Error loading data')
			).toBeInTheDocument();
		});

		expect(states.value).toEqual([
			// Initial state
			{
				data: undefined,
				error: undefined,
				loading: true,
				hasMore: undefined,
				loadedTimeStamp: undefined,
				staleTimeStamp: undefined,
				enabled: true
			},
			// After error
			{
				data: undefined,
				error: 'Error loading data',
				loading: false,
				hasMore: undefined,
				loadedTimeStamp: undefined,
				staleTimeStamp: undefined,
				enabled: true
			}
		]);
	});

	test('Loads more data', async () => {
		vi.useFakeTimers();
		const mockDate = new Date(2025, 5, 11, 12, 0, 0);
		vi.setSystemTime(mockDate);

		const states = $state({ value: [] });
		const rendered = render(NoParam, {
			props: {
				states,
				key: ['load-more-test'],
				loadingFn: async (_, cursor = 0) => ({
					success: true,
					data: [cursor, cursor + 1, cursor + 2],
					cursor: cursor < 20 ? cursor + 10 : undefined
				})
			}
		});

		await waitFor(() => {
			expect(rendered.queryByText('Data: [[0,1,2]]')).toBeInTheDocument();
			expect(rendered.queryByText('Has More: Yes')).toBeInTheDocument();
		});

		vi.advanceTimersByTime(1000);
		rendered.queryByText('Load More')?.click();
		await waitFor(() => {
			expect(
				rendered.queryByText('Data: [[0,1,2],[10,11,12]]')
			).toBeInTheDocument();
			expect(rendered.queryByText('Has More: Yes')).toBeInTheDocument();
		});

		vi.advanceTimersByTime(1000);
		rendered.queryByText('Load More')?.click();
		await waitFor(() => {
			expect(
				rendered.queryByText('Data: [[0,1,2],[10,11,12],[20,21,22]]')
			).toBeInTheDocument();
			expect(rendered.queryByText('Has More: No')).toBeInTheDocument();
		});

		// this should not trigger another load (as there is no more data)
		rendered.queryByText('Load More')?.click();

		expect(states.value).toEqual([
			// Initial state
			{
				data: undefined,
				error: undefined,
				loading: true,
				hasMore: undefined,
				loadedTimeStamp: undefined,
				staleTimeStamp: undefined,
				enabled: true
			},
			// After loading first page
			{
				data: [[0, 1, 2]],
				error: undefined,
				loading: false,
				hasMore: true,
				loadedTimeStamp: mockDate.getTime(),
				staleTimeStamp: Infinity,
				enabled: true
			},
			// Loading more data
			{
				data: [[0, 1, 2]],
				error: undefined,
				loading: true,
				hasMore: undefined,
				loadedTimeStamp: mockDate.getTime(),
				staleTimeStamp: Infinity,
				enabled: true
			},
			// After loading second page
			{
				data: [
					[0, 1, 2],
					[10, 11, 12]
				],
				error: undefined,
				loading: false,
				hasMore: true,
				loadedTimeStamp: mockDate.getTime() + 1000,
				staleTimeStamp: Infinity,
				enabled: true
			},
			// Loading more data again
			{
				data: [
					[0, 1, 2],
					[10, 11, 12]
				],
				error: undefined,
				loading: true,
				hasMore: undefined,
				loadedTimeStamp: mockDate.getTime() + 1000,
				staleTimeStamp: Infinity,
				enabled: true
			},
			// After loading third page
			{
				data: [
					[0, 1, 2],
					[10, 11, 12],
					[20, 21, 22]
				],
				error: undefined,
				loading: false,
				hasMore: false,
				loadedTimeStamp: mockDate.getTime() + 2000,
				staleTimeStamp: Infinity,
				enabled: true
			}
			// No additional state change after clicking "Load More" again
		]);
	});

	test('Error while loading more data', async () => {
		vi.useFakeTimers();
		const mockDate = new Date(2025, 5, 11, 12, 0, 0);
		vi.setSystemTime(mockDate);

		const states = $state({ value: [] });
		const rendered = render(NoParam, {
			props: {
				states,
				key: ['load-more-error-test'],
				loadingFn: async (_, cursor = 0) => {
					if (cursor === 0) {
						return {
							success: true,
							data: [cursor, cursor + 1, cursor + 2],
							cursor: 10
						};
					} else {
						return {
							success: false,
							error: 'Error loading more data'
						};
					}
				}
			}
		});

		await waitFor(() => {
			expect(rendered.queryByText('Data: [[0,1,2]]')).toBeInTheDocument();
			expect(rendered.queryByText('Has More: Yes')).toBeInTheDocument();
		});

		vi.advanceTimersByTime(1000);
		rendered.queryByText('Load More')?.click();
		await waitFor(() => {
			expect(
				rendered.queryByText('Error: Error loading more data')
			).toBeInTheDocument();
		});

		expect(states.value).toEqual([
			// Initial state
			{
				data: undefined,
				error: undefined,
				loading: true,
				hasMore: undefined,
				loadedTimeStamp: undefined,
				staleTimeStamp: undefined,
				enabled: true
			},
			// After loading first page
			{
				data: [[0, 1, 2]],
				error: undefined,
				loading: false,
				hasMore: true,
				loadedTimeStamp: mockDate.getTime(),
				staleTimeStamp: Infinity,
				enabled: true
			},
			// Loading more data
			{
				data: [[0, 1, 2]],
				error: undefined,
				loading: true,
				hasMore: undefined,
				loadedTimeStamp: mockDate.getTime(),
				staleTimeStamp: Infinity,
				enabled: true
			},
			// After error in load more
			{
				data: [[0, 1, 2]],
				error: 'Error loading more data',
				loading: false,
				hasMore: true,
				loadedTimeStamp: mockDate.getTime(),
				staleTimeStamp: Infinity,
				enabled: true
			}
			// No additional state change after clicking "Load More" again
		]);
	});

	test('Reloading after multiple pages loaded returns to initial page', async () => {
		vi.useFakeTimers();
		const mockDate = new Date(2025, 5, 11, 12, 0, 0);
		vi.setSystemTime(mockDate);

		const states = $state({ value: [] });
		const rendered = render(NoParam, {
			props: {
				states,
				key: ['load-more-reload-test'],
				loadingFn: async (_, cursor = 0) => ({
					success: true,
					data: [cursor, cursor + 1, cursor + 2],
					cursor: cursor + 10
				})
			}
		});

		await waitFor(() => {
			expect(rendered.queryByText('Data: [[0,1,2]]')).toBeInTheDocument();
			expect(rendered.queryByText('Has More: Yes')).toBeInTheDocument();
		});

		vi.advanceTimersByTime(1000);
		rendered.queryByText('Load More')?.click();
		await waitFor(() => {
			expect(
				rendered.queryByText('Data: [[0,1,2],[10,11,12]]')
			).toBeInTheDocument();
			expect(rendered.queryByText('Has More: Yes')).toBeInTheDocument();
		});

		vi.advanceTimersByTime(1000);
		rendered.queryByText('Reload')?.click();
		await waitFor(() => {
			expect(rendered.queryByText('Data: [[0,1,2]]')).toBeInTheDocument();
			expect(rendered.queryByText('Has More: Yes')).toBeInTheDocument();
		});

		expect(states.value).toEqual([
			// Initial state
			{
				data: undefined,
				error: undefined,
				loading: true,
				hasMore: undefined,
				loadedTimeStamp: undefined,
				staleTimeStamp: undefined,
				enabled: true
			},
			// After loading first page
			{
				data: [[0, 1, 2]],
				error: undefined,
				loading: false,
				hasMore: true,
				loadedTimeStamp: mockDate.getTime(),
				staleTimeStamp: Infinity, // mockDate.getTime()
				enabled: true
			},
			// Loading more data
			{
				data: [[0, 1, 2]],
				error: undefined,
				loading: true,
				hasMore: undefined,
				loadedTimeStamp: mockDate.getTime(),
				staleTimeStamp: Infinity, // mockDate.getTime()
				enabled: true
			},
			// After loading second page
			{
				data: [
					[0, 1, 2],
					[10, 11, 12]
				],
				error: undefined,
				loading: false,
				hasMore: true,
				loadedTimeStamp: mockDate.getTime() + 1000,
				staleTimeStamp: Infinity, // mockDate.getTime() + 1000
				enabled: true
			},
			// Reloading data
			{
				data: [
					[0, 1, 2],
					[10, 11, 12]
				],
				error: undefined,
				loading: true,
				hasMore: undefined,
				loadedTimeStamp: mockDate.getTime() + 1000,
				staleTimeStamp: Infinity, // mockDate.getTime() + 1000
				enabled: true
			},
			// After reloading data
			{
				data: [[0, 1, 2]],
				error: undefined,
				loading: false,
				hasMore: true,
				loadedTimeStamp: mockDate.getTime() + 2000,
				staleTimeStamp: Infinity, // mockDate.getTime() + 2000
				enabled: true
			}
		]);
	});

	test('Error while reloading', async () => {
		vi.useFakeTimers();
		const mockDate = new Date(2025, 5, 11, 12, 0, 0);
		vi.setSystemTime(mockDate);

		let i = $state(0);
		const states = $state({ value: [] });
		const rendered = render(NoParam, {
			props: {
				states,
				key: ['load-more-reload-error-test'],
				loadingFn: async (_, cursor = 0) => {
					if (i < 2) {
						i = i + 1;
						return {
							success: true,
							data: [cursor, cursor + 1, cursor + 2],
							cursor: cursor + 10
						};
					} else {
						return {
							success: false,
							error: 'Error reloading data'
						};
					}
				}
			}
		});

		await waitFor(() => {
			expect(rendered.queryByText('Data: [[0,1,2]]')).toBeInTheDocument();
			expect(rendered.queryByText('Has More: Yes')).toBeInTheDocument();
		});

		vi.advanceTimersByTime(1000);
		rendered.queryByText('Load More')?.click();
		await waitFor(() => {
			expect(
				rendered.queryByText('Data: [[0,1,2],[10,11,12]]')
			).toBeInTheDocument();
			expect(rendered.queryByText('Has More: Yes')).toBeInTheDocument();
		});

		vi.advanceTimersByTime(1000);
		rendered.queryByText('Reload')?.click();
		await waitFor(() => {
			expect(
				rendered.queryByText('Error: Error reloading data')
			).toBeInTheDocument();
		});

		expect(states.value).toEqual([
			// Initial state
			{
				data: undefined,
				error: undefined,
				loading: true,
				hasMore: undefined,
				loadedTimeStamp: undefined,
				staleTimeStamp: undefined,
				enabled: true
			},
			// After loading first page
			{
				data: [[0, 1, 2]],
				error: undefined,
				loading: false,
				hasMore: true,
				loadedTimeStamp: mockDate.getTime(),
				staleTimeStamp: Infinity,
				enabled: true
			},
			// Loading more data
			{
				data: [[0, 1, 2]],
				error: undefined,
				loading: true,
				hasMore: undefined,
				loadedTimeStamp: mockDate.getTime(),
				staleTimeStamp: Infinity,
				enabled: true
			},
			// After loading second page
			{
				data: [
					[0, 1, 2],
					[10, 11, 12]
				],
				error: undefined,
				loading: false,
				hasMore: true,
				loadedTimeStamp: mockDate.getTime() + 1000,
				staleTimeStamp: Infinity,
				enabled: true
			},
			// Reloading data
			{
				data: [
					[0, 1, 2],
					[10, 11, 12]
				],
				error: undefined,
				loading: true,
				hasMore: undefined,
				loadedTimeStamp: mockDate.getTime() + 1000,
				staleTimeStamp: Infinity,
				enabled: true
			},
			// After error in reload
			{
				data: [
					[0, 1, 2],
					[10, 11, 12]
				],
				error: 'Error reloading data',
				loading: false,
				hasMore: true,
				loadedTimeStamp: mockDate.getTime() + 1000,
				staleTimeStamp: Infinity,
				enabled: true
			}
		]);
	});

	test('Reloads data from all pages when invalidated', async () => {
		vi.useFakeTimers();
		const mockDate = new Date(2025, 5, 11, 12, 0, 0);
		vi.setSystemTime(mockDate);

		let i = $state(0);
		const states = $state({ value: [] });
		const mockLoadingFn = vi.fn(async (_, cursor = 0) => {
			i = i + 1;
			if (i <= 3) {
				// 3 "normal" requests
				return {
					success: true as const,
					data: [cursor, cursor + 1, cursor + 2],
					cursor: cursor + 10
				};
			} else {
				// 3 "invalidated" requests
				return {
					success: true as const,
					data: [cursor + 3, cursor + 4, cursor + 5],
					cursor: cursor + 10
				};
			}
		});

		const rendered = render(NoParam, {
			props: {
				states: states,
				key: ['sequential-invalidate-test'],
				loadingFn: mockLoadingFn,
				queryOptions: {
					staleTime: 0
				}
			}
		});

		await waitFor(() => {
			expect(rendered.queryByText('Data: [[0,1,2]]')).toBeInTheDocument();
			expect(rendered.queryByText('Has More: Yes')).toBeInTheDocument();
		});

		vi.advanceTimersByTime(1000);
		rendered.queryByText('Load More')?.click();
		await waitFor(() => {
			expect(
				rendered.queryByText('Data: [[0,1,2],[10,11,12]]')
			).toBeInTheDocument();
			expect(rendered.queryByText('Has More: Yes')).toBeInTheDocument();
		});

		vi.advanceTimersByTime(1000);
		rendered.queryByText('Load More')?.click();
		await waitFor(() => {
			expect(
				rendered.queryByText('Data: [[0,1,2],[10,11,12],[20,21,22]]')
			).toBeInTheDocument();
			expect(rendered.queryByText('Has More: Yes')).toBeInTheDocument();
		});

		vi.advanceTimersByTime(1000);
		invalidateQueries(['sequential-invalidate-test']);
		await waitFor(() => {
			expect(rendered.queryByText('Loading: true')).toBeInTheDocument();
		});
		await waitFor(() => {
			expect(rendered.queryByText('Loading: false')).toBeInTheDocument();
		});

		expect(states.value).toEqual([
			// Initial state
			{
				data: undefined,
				error: undefined,
				loading: true,
				hasMore: undefined,
				loadedTimeStamp: undefined,
				staleTimeStamp: undefined,
				enabled: true
			},
			// After loading first page
			{
				data: [[0, 1, 2]],
				error: undefined,
				loading: false,
				hasMore: true,
				loadedTimeStamp: mockDate.getTime(),
				staleTimeStamp: mockDate.getTime(),
				enabled: true
			},
			// Loading more data
			{
				data: [[0, 1, 2]],
				error: undefined,
				loading: true,
				hasMore: undefined,
				loadedTimeStamp: mockDate.getTime(),
				staleTimeStamp: mockDate.getTime(),
				enabled: true
			},
			// After loading second page
			{
				data: [
					[0, 1, 2],
					[10, 11, 12]
				],
				error: undefined,
				loading: false,
				hasMore: true,
				loadedTimeStamp: mockDate.getTime() + 1000,
				staleTimeStamp: mockDate.getTime() + 1000,
				enabled: true
			},
			// Loading more data
			{
				data: [
					[0, 1, 2],
					[10, 11, 12]
				],
				error: undefined,
				loading: true,
				hasMore: undefined,
				loadedTimeStamp: mockDate.getTime() + 1000,
				staleTimeStamp: mockDate.getTime() + 1000,
				enabled: true
			},
			// After loading second page
			{
				data: [
					[0, 1, 2],
					[10, 11, 12],
					[20, 21, 22]
				],
				error: undefined,
				loading: false,
				hasMore: true,
				loadedTimeStamp: mockDate.getTime() + 2000,
				staleTimeStamp: mockDate.getTime() + 2000,
				enabled: true
			},
			// Invalidating data (at +3000 time)
			{
				data: [
					[0, 1, 2],
					[10, 11, 12],
					[20, 21, 22]
				],
				error: undefined,
				loading: true,
				hasMore: undefined,
				loadedTimeStamp: mockDate.getTime() + 2000,
				staleTimeStamp: mockDate.getTime() + 2999,
				enabled: true
			},
			// After reloading data from all pages
			{
				data: [
					[3, 4, 5],
					[13, 14, 15],
					[23, 24, 25]
				],
				error: undefined,
				loading: false,
				hasMore: true,
				loadedTimeStamp: mockDate.getTime() + 3000,
				staleTimeStamp: mockDate.getTime() + 3000,
				enabled: true
			}
		]);
	});
});

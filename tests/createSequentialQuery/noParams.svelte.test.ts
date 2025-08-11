import { describe, expect, test, vi } from 'vitest';
import { render, waitFor } from '@testing-library/svelte/svelte5';

import NoParam from './NoParam.svelte';

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
				staleTimeStamp: undefined
			},
			// After loading there is no more data (cursor was undefined)
			{
				data: ['payload'],
				error: undefined,
				loading: false,
				hasMore: false,
				loadedTimeStamp: mockDate.getTime(),
				staleTimeStamp: mockDate.getTime()
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
				staleTimeStamp: undefined
			},
			// After error
			{
				data: undefined,
				error: 'Error loading data',
				loading: false,
				hasMore: undefined,
				loadedTimeStamp: undefined,
				staleTimeStamp: undefined
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
				staleTimeStamp: undefined
			},
			// After loading first page
			{
				data: [[0, 1, 2]],
				error: undefined,
				loading: false,
				hasMore: true,
				loadedTimeStamp: mockDate.getTime(),
				staleTimeStamp: mockDate.getTime()
			},
			// Loading more data
			{
				data: [[0, 1, 2]],
				error: undefined,
				loading: true,
				hasMore: undefined,
				loadedTimeStamp: mockDate.getTime(),
				staleTimeStamp: mockDate.getTime()
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
				staleTimeStamp: mockDate.getTime() + 1000
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
				staleTimeStamp: mockDate.getTime() + 1000
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
				staleTimeStamp: mockDate.getTime() + 2000
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
				staleTimeStamp: undefined
			},
			// After loading first page
			{
				data: [[0, 1, 2]],
				error: undefined,
				loading: false,
				hasMore: true,
				loadedTimeStamp: mockDate.getTime(),
				staleTimeStamp: mockDate.getTime()
			},
			// Loading more data
			{
				data: [[0, 1, 2]],
				error: undefined,
				loading: true,
				hasMore: undefined,
				loadedTimeStamp: mockDate.getTime(),
				staleTimeStamp: mockDate.getTime()
			},
			// After error in load more
			{
				data: [[0, 1, 2]],
				error: 'Error loading more data',
				loading: false,
				hasMore: true,
				loadedTimeStamp: mockDate.getTime(),
				staleTimeStamp: mockDate.getTime()
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
				staleTimeStamp: undefined
			},
			// After loading first page
			{
				data: [[0, 1, 2]],
				error: undefined,
				loading: false,
				hasMore: true,
				loadedTimeStamp: mockDate.getTime(),
				staleTimeStamp: mockDate.getTime()
			},
			// Loading more data
			{
				data: [[0, 1, 2]],
				error: undefined,
				loading: true,
				hasMore: undefined,
				loadedTimeStamp: mockDate.getTime(),
				staleTimeStamp: mockDate.getTime()
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
				staleTimeStamp: mockDate.getTime() + 1000
			},
			// Reloading data (TODO: should this reset the data by default?)
			{
				data: [
					[0, 1, 2],
					[10, 11, 12]
				],
				error: undefined,
				loading: true,
				hasMore: undefined,
				loadedTimeStamp: mockDate.getTime() + 1000,
				staleTimeStamp: mockDate.getTime() + 1000
			},
			// After reloading data
			{
				data: [[0, 1, 2]],
				error: undefined,
				loading: false,
				hasMore: true,
				loadedTimeStamp: mockDate.getTime() + 2000,
				staleTimeStamp: mockDate.getTime() + 2000
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
				staleTimeStamp: undefined
			},
			// After loading first page
			{
				data: [[0, 1, 2]],
				error: undefined,
				loading: false,
				hasMore: true,
				loadedTimeStamp: mockDate.getTime(),
				staleTimeStamp: mockDate.getTime()
			},
			// Loading more data
			{
				data: [[0, 1, 2]],
				error: undefined,
				loading: true,
				hasMore: undefined,
				loadedTimeStamp: mockDate.getTime(),
				staleTimeStamp: mockDate.getTime()
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
				staleTimeStamp: mockDate.getTime() + 1000
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
				staleTimeStamp: mockDate.getTime() + 1000
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
				staleTimeStamp: mockDate.getTime() + 1000
			}
		]);
	});
});

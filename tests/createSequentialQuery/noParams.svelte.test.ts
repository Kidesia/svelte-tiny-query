import { describe, expect, test, vi } from 'vitest';
import { render, waitFor } from '@testing-library/svelte/svelte5';

import NoParam from './NoParam.svelte';
// import WithParam from './WithParam.svelte';
// import MultipleWithParams from './MultipleWithParams.svelte';

describe('Sequential Query - No Parameter', () => {
	test('Loads data successfully', async () => {
		vi.useFakeTimers();
		const mockDate = new Date(2025, 5, 11, 12, 0, 0);
		vi.setSystemTime(mockDate);

		const states = $state({ value: [] });
		const rendered = render(NoParam, {
			props: {
				states,
				key: ['simple-successful-test'],
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

	test('Loads more data successfully', async () => {
		vi.useFakeTimers();
		const mockDate = new Date(2025, 5, 11, 12, 0, 0);
		vi.setSystemTime(mockDate);

		const states = $state({ value: [] });
		const rendered = render(NoParam, {
			props: {
				states,
				key: ['simple-load-more-test'],
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
				hasMore: true,
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
				hasMore: true,
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
});

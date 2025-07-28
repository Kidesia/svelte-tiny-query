import { describe, expect, test, vi } from 'vitest';
import { render, waitFor } from '@testing-library/svelte/svelte5';

import WithParam from './WithParam.svelte';
import MultipleWithParams from './MultipleWithParams.svelte';

describe('Normal Query - With Parameter', () => {
	test('Resets and reloads itself on parameter/key change', async () => {
		vi.useFakeTimers();
		const mockDate = new Date(2025, 5, 11, 12, 0, 0);
		vi.setSystemTime(mockDate);

		const states = $state({ value: [] });
		const rendered = render(WithParam, {
			props: {
				states,
				key: ['reactive-param-example'],
				loadingFn: async (param: { id: number }) => ({
					success: true,
					data: `id is ${param.id}`
				})
			}
		});

		await waitFor(() => {
			expect(rendered.queryByText('Data: id is 1')).toBeInTheDocument();
		});

		vi.advanceTimersByTime(1000);

		rendered.queryByText('Increment')?.click();

		await waitFor(() => {
			expect(rendered.queryByText('Data: id is 2')).toBeInTheDocument();
		});

		vi.advanceTimersByTime(1000);

		rendered.queryByText('Decrement')?.click();

		await waitFor(() => {
			expect(rendered.queryByText('Data: id is 1')).toBeInTheDocument();
		});

		expect(states.value).toEqual([
			// Initial state
			{
				data: undefined,
				error: undefined,
				loading: true,
				loadedTimeStamp: undefined,
				staleTimeStamp: undefined
			},
			{
				data: 'id is 1',
				error: undefined,
				loading: false,
				loadedTimeStamp: mockDate.getTime(),
				staleTimeStamp: mockDate.getTime()
			},
			// incrementing to id 2
			{
				data: undefined,
				error: undefined,
				loading: true,
				loadedTimeStamp: undefined,
				staleTimeStamp: undefined
			},
			{
				data: 'id is 2',
				error: undefined,
				loading: false,
				loadedTimeStamp: mockDate.getTime() + 1000,
				staleTimeStamp: mockDate.getTime() + 1000
			},
			// decrementing back to id 1
			{
				data: 'id is 1',
				error: undefined,
				loading: true,
				loadedTimeStamp: mockDate.getTime(),
				staleTimeStamp: mockDate.getTime()
			},
			{
				data: 'id is 1',
				error: undefined,
				loading: false,
				loadedTimeStamp: mockDate.getTime() + 2000,
				staleTimeStamp: mockDate.getTime() + 2000
			}
		]);
	});

	test('Is not auto-reloaded when not stale on parameter change', async () => {
		vi.useFakeTimers();
		const mockDate = new Date(2025, 5, 11, 12, 0, 0);
		vi.setSystemTime(mockDate);
		const expectedStaleTime = mockDate.getTime() + 3000;

		const states = $state({ value: [] });
		const rendered = render(WithParam, {
			props: {
				states,
				key: ['staletime-example'],
				loadingFn: async (param: { id: number }) => ({
					success: true,
					data: `id is ${param.id}`
				}),
				queryOptions: {
					staleTime: 3000
				}
			}
		});

		await waitFor(() => {
			expect(rendered.queryByText('Data: id is 1')).toBeInTheDocument();
		});

		vi.advanceTimersByTime(1000);
		rendered.queryByText('Increment')?.click();

		await waitFor(() => {
			expect(rendered.queryByText('Data: id is 2')).toBeInTheDocument();
		});

		vi.advanceTimersByTime(1000);
		rendered.queryByText('Decrement')?.click();

		await waitFor(() => {
			expect(rendered.queryByText('Data: id is 1')).toBeInTheDocument();
		});

		vi.advanceTimersByTime(1000);
		rendered.queryByText('Increment')?.click();

		await waitFor(() => {
			expect(rendered.queryByText('Data: id is 2')).toBeInTheDocument();
		});

		vi.advanceTimersByTime(1000);
		rendered.queryByText('Decrement')?.click();

		await waitFor(() => {
			expect(rendered.queryByText('Data: id is 1')).toBeInTheDocument();
		});

		expect(states.value).toEqual([
			// Initial state
			{
				data: undefined,
				error: undefined,
				loading: true,
				loadedTimeStamp: undefined,
				staleTimeStamp: undefined
			},
			{
				data: 'id is 1',
				error: undefined,
				loading: false,
				loadedTimeStamp: mockDate.getTime(),
				staleTimeStamp: expectedStaleTime
			},
			// incrementing to id 2
			{
				data: undefined,
				error: undefined,
				loading: true,
				loadedTimeStamp: undefined,
				staleTimeStamp: undefined
			},
			{
				data: 'id is 2',
				error: undefined,
				loading: false,
				loadedTimeStamp: mockDate.getTime() + 1000,
				staleTimeStamp: expectedStaleTime + 1000
			},
			// decrementing back to id 1 (not stale yet)
			{
				data: 'id is 1',
				error: undefined,
				loading: false,
				loadedTimeStamp: mockDate.getTime(),
				staleTimeStamp: expectedStaleTime
			},
			// incrementing to id 2 (not stale yet)
			{
				data: 'id is 2',
				error: undefined,
				loading: false,
				loadedTimeStamp: mockDate.getTime() + 1000,
				staleTimeStamp: expectedStaleTime + 1000
			},
			// decrementing back to id 1 (now stale!)
			{
				data: 'id is 1',
				error: undefined,
				loading: true,
				loadedTimeStamp: mockDate.getTime(),
				staleTimeStamp: expectedStaleTime
			},
			{
				data: 'id is 1',
				error: undefined,
				loading: false,
				loadedTimeStamp: mockDate.getTime() + 4000,
				staleTimeStamp: expectedStaleTime + 4000
			}
		]);
	});

	test('Multiple same queries with staletime', async () => {
		vi.useFakeTimers();
		const mockDate = new Date(2025, 5, 11, 12, 0, 0);
		vi.setSystemTime(mockDate);

		const mockLoadingFn = vi.fn(async (param: { id: number }) => ({
			success: true as const,
			data: `id is ${param.id}`
		}));

		const states1 = $state({ value: [] });
		const states2 = $state({ value: [] });
		const rendered = render(MultipleWithParams, {
			props: {
				states1,
				states2,
				key: ['multiple-queries-example'],
				loadingFn: mockLoadingFn,
				queryOptions: {
					staleTime: 2000
				}
			}
		});

		await waitFor(() => {
			expect(rendered.queryByText('Data 1: id is 1')).toBeInTheDocument();
		});

		// even though there are two queries, the function will only be called once
		expect(mockLoadingFn).toHaveBeenCalledTimes(1);

		vi.advanceTimersByTime(1000);
		rendered.queryByText('Increment 1')?.click();

		await waitFor(() => {
			expect(rendered.queryByText('Data 1: id is 2')).toBeInTheDocument();
		});

		vi.advanceTimersByTime(1000);
		rendered.queryByText('Increment 2')?.click();

		await waitFor(() => {
			expect(rendered.queryByText('Data 2: id is 2')).toBeInTheDocument();
		});

		// even though both queries switched to param 2, the function will only be called once more
		expect(mockLoadingFn).toHaveBeenCalledTimes(2);

		expect(states1.value).toEqual([
			// Initial state
			{
				data: undefined,
				error: undefined,
				loading: true,
				loadedTimeStamp: undefined,
				staleTimeStamp: undefined
			},
			{
				data: 'id is 1',
				error: undefined,
				loading: false,
				loadedTimeStamp: mockDate.getTime(),
				staleTimeStamp: mockDate.getTime() + 2000
			},
			// incrementing to id 2
			{
				data: undefined,
				error: undefined,
				loading: true,
				loadedTimeStamp: undefined,
				staleTimeStamp: undefined
			},
			{
				data: 'id is 2',
				error: undefined,
				loading: false,
				loadedTimeStamp: mockDate.getTime() + 1000,
				staleTimeStamp: mockDate.getTime() + 3000
			}
		]);

		expect(states2.value).toEqual([
			// Initial state (already loading from query1)
			{
				data: undefined,
				error: undefined,
				loading: true,
				loadedTimeStamp: undefined,
				staleTimeStamp: undefined
			},
			{
				data: 'id is 1',
				error: undefined,
				loading: false,
				loadedTimeStamp: mockDate.getTime(),
				staleTimeStamp: mockDate.getTime() + 2000
			},
			// incrementing to id 2 (from cache)
			{
				data: 'id is 2',
				error: undefined,
				loading: false,
				loadedTimeStamp: mockDate.getTime() + 1000,
				staleTimeStamp: mockDate.getTime() + 3000
			}
		]);
	});
});

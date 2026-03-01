import { describe, expect, test, vi } from 'vitest';
import { render, waitFor } from '@testing-library/svelte/svelte5';

import WithPrimitiveParam from './WithPrimitiveParam.svelte';

describe('Normal Query - Primitive Parameter', () => {
	test('Works with a number param', async () => {
		vi.useFakeTimers();
		const mockDate = new Date(2025, 5, 11, 12, 0, 0);
		vi.setSystemTime(mockDate);

		const states = $state({ value: [] });
		const rendered = render(WithPrimitiveParam, {
			props: {
				states,
				key: ['primitive-number-test'],
				loadingFn: async (param: number) => ({
					success: true,
					data: `item-${param}`
				})
			}
		});

		// Initial param is 1
		await waitFor(() => {
			expect(rendered.queryByText('Data: item-1')).toBeInTheDocument();
		});

		vi.advanceTimersByTime(1000);
		rendered.queryByText('Increment')?.click();
		await waitFor(() => {
			expect(rendered.queryByText('Data: item-2')).toBeInTheDocument();
		});

		vi.advanceTimersByTime(1000);
		rendered.queryByText('Decrement')?.click();
		await waitFor(() => {
			expect(rendered.queryByText('Data: item-1')).toBeInTheDocument();
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
			// Loaded param=1
			{
				data: 'item-1',
				error: undefined,
				loading: false,
				loadedTimeStamp: mockDate.getTime(),
				staleTimeStamp: mockDate.getTime()
			},
			// Switching to param=2
			{
				data: undefined,
				error: undefined,
				loading: true,
				loadedTimeStamp: undefined,
				staleTimeStamp: undefined
			},
			// Loaded param=2
			{
				data: 'item-2',
				error: undefined,
				loading: false,
				loadedTimeStamp: mockDate.getTime() + 1000,
				staleTimeStamp: mockDate.getTime() + 1000
			},
			// Switching back to param=1 (cached)
			{
				data: 'item-1',
				error: undefined,
				loading: true,
				loadedTimeStamp: mockDate.getTime(),
				staleTimeStamp: mockDate.getTime()
			},
			// Reloaded param=1
			{
				data: 'item-1',
				error: undefined,
				loading: false,
				loadedTimeStamp: mockDate.getTime() + 2000,
				staleTimeStamp: mockDate.getTime() + 2000
			}
		]);
	});
});

describe('Normal Query - Dynamic Key Function', () => {
	test('Uses key function to generate cache key from param', async () => {
		vi.useFakeTimers();
		const mockDate = new Date(2025, 5, 11, 12, 0, 0);
		vi.setSystemTime(mockDate);

		const mockLoadingFn = vi.fn(async (param: number) => ({
			success: true as const,
			data: `page-${param}`
		}));

		const states = $state({ value: [] });
		const rendered = render(WithPrimitiveParam, {
			props: {
				states,
				keyFn: (param: number) => ['pages', `page-${param}`],
				loadingFn: mockLoadingFn
			}
		});

		await waitFor(() => {
			expect(rendered.queryByText('Data: page-1')).toBeInTheDocument();
		});

		vi.advanceTimersByTime(1000);
		rendered.queryByText('Increment')?.click();
		await waitFor(() => {
			expect(rendered.queryByText('Data: page-2')).toBeInTheDocument();
		});

		expect(mockLoadingFn).toHaveBeenCalledTimes(2);
		expect(mockLoadingFn).toHaveBeenCalledWith(1);
		expect(mockLoadingFn).toHaveBeenCalledWith(2);
	});
});


import { describe, expect, test, vi } from 'vitest';
import { render, waitFor } from '@testing-library/svelte/svelte5';

import NoParam from './NoParam.svelte';

describe('Normal Query - Retry Option', () => {
	test('Retries failed loads with exponential backoff until success', async () => {
		vi.useFakeTimers();
		const mockDate = new Date(2025, 5, 11, 12, 0, 0);
		vi.setSystemTime(mockDate);

		let i = 0;
		const mockLoadingFn = vi.fn(async () => {
			i++;
			return i < 3
				? { success: false as const, error: `fail ${i}` }
				: { success: true as const, data: 'finally' };
		});

		const states = $state({ value: [] });
		const rendered = render(NoParam, {
			props: {
				states,
				key: ['retry-success-test'],
				loadingFn: mockLoadingFn,
				queryOptions: { retry: 2 }
			}
		});

		// The initial load fails right away
		await vi.advanceTimersByTimeAsync(0);
		expect(mockLoadingFn).toHaveBeenCalledTimes(1);

		// First retry happens after 1s of backoff, not before
		await vi.advanceTimersByTimeAsync(999);
		expect(mockLoadingFn).toHaveBeenCalledTimes(1);
		await vi.advanceTimersByTimeAsync(1);
		expect(mockLoadingFn).toHaveBeenCalledTimes(2);

		// Second retry happens after 2s more of backoff and succeeds
		await vi.advanceTimersByTimeAsync(2000);
		expect(mockLoadingFn).toHaveBeenCalledTimes(3);

		await waitFor(() => {
			expect(rendered.queryByText('Data: finally')).toBeInTheDocument();
		});

		// The query stayed in its loading state throughout the retries:
		// no intermediate error was ever exposed
		expect(states.value).toEqual([
			// Initial state (loading through all attempts)
			{
				data: undefined,
				error: undefined,
				loading: true,
				loadedTimeStamp: undefined,
				staleTimeStamp: undefined,
				enabled: true
			},
			// After the successful third attempt
			{
				data: 'finally',
				error: undefined,
				loading: false,
				loadedTimeStamp: mockDate.getTime() + 3000,
				staleTimeStamp: mockDate.getTime() + 3000,
				enabled: true
			}
		]);

		rendered.unmount();
		vi.useRealTimers();
	});

	test('Exposes the error only after all retries failed', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2025, 5, 11, 12, 0, 0));

		let i = 0;
		const mockLoadingFn = vi.fn(async () => {
			i++;
			return { success: false as const, error: `fail ${i}` };
		});

		const states = $state({ value: [] });
		const rendered = render(NoParam, {
			props: {
				states,
				key: ['retry-exhausted-test'],
				loadingFn: mockLoadingFn,
				queryOptions: { retry: 2 }
			}
		});

		// Initial attempt plus two retries (1s + 2s backoff)
		await vi.advanceTimersByTimeAsync(3000);
		expect(mockLoadingFn).toHaveBeenCalledTimes(3);

		await waitFor(() => {
			expect(rendered.queryByText('Error: fail 3')).toBeInTheDocument();
		});

		// Only the final error was exposed, no intermediate states
		expect(states.value).toEqual([
			{
				data: undefined,
				error: undefined,
				loading: true,
				loadedTimeStamp: undefined,
				staleTimeStamp: undefined,
				enabled: true
			},
			{
				data: undefined,
				error: 'fail 3',
				loading: false,
				loadedTimeStamp: undefined,
				staleTimeStamp: undefined,
				enabled: true
			}
		]);

		rendered.unmount();
		vi.useRealTimers();
	});

	test('Does not retry by default', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2025, 5, 11, 12, 0, 0));

		const mockLoadingFn = vi.fn(async () => ({
			success: false as const,
			error: 'oopsie'
		}));

		const states = $state({ value: [] });
		const rendered = render(NoParam, {
			props: {
				states,
				key: ['retry-default-test'],
				loadingFn: mockLoadingFn
			}
		});

		await waitFor(() => {
			expect(rendered.queryByText('Error: oopsie')).toBeInTheDocument();
		});

		// Even after generous backoff time, no retry happened
		await vi.advanceTimersByTimeAsync(10000);
		expect(mockLoadingFn).toHaveBeenCalledTimes(1);

		rendered.unmount();
		vi.useRealTimers();
	});
});

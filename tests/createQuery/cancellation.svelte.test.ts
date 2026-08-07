import { describe, expect, test, vi } from 'vitest';
import { render, waitFor } from '@testing-library/svelte/svelte5';

import { invalidateQueries } from '../../src/lib/svelte-tiny-query/invalidate.svelte';
import NoParam from './NoParam.svelte';

type Result =
	| { success: true; data: string }
	| { success: false; error: string };

describe('Normal Query - Cancellation', () => {
	test('Invalidation during an in-flight load discards its result and reloads', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2025, 5, 11, 12, 0, 0));

		const resolvers: ((result: Result) => void)[] = [];
		const mockLoadingFn = vi.fn(
			() =>
				new Promise<Result>((resolve) => {
					resolvers.push(resolve);
				})
		);

		const states = $state({ value: [] });
		const rendered = render(NoParam, {
			props: {
				states,
				key: ['cancel-invalidate-test'],
				loadingFn: mockLoadingFn
			}
		});

		// The initial load is in flight
		await vi.advanceTimersByTimeAsync(0);
		expect(mockLoadingFn).toHaveBeenCalledTimes(1);

		// Invalidating cancels the in-flight load and starts a new one
		invalidateQueries(['cancel-invalidate-test']);
		await vi.advanceTimersByTimeAsync(0);
		expect(mockLoadingFn).toHaveBeenCalledTimes(2);

		// The first (pre-invalidation) response arrives — it must be discarded
		resolvers[0]({ success: true, data: 'pre-mutation data' });
		await vi.advanceTimersByTimeAsync(0);
		expect(
			rendered.queryByText('Data: pre-mutation data')
		).not.toBeInTheDocument();
		expect(rendered.queryByText('Loading: true')).toBeInTheDocument();

		// The second (post-invalidation) response arrives and is stored
		resolvers[1]({ success: true, data: 'post-mutation data' });
		await waitFor(() => {
			expect(
				rendered.queryByText('Data: post-mutation data')
			).toBeInTheDocument();
		});

		// The discarded data never appeared in any observed state
		expect(
			states.value.some(
				(state) => (state as { data: unknown }).data === 'pre-mutation data'
			)
		).toBe(false);

		rendered.unmount();
		vi.useRealTimers();
	});

	test('The loading function receives a signal that aborts on invalidation', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2025, 5, 11, 12, 0, 0));

		const signals: AbortSignal[] = [];
		const resolvers: ((result: Result) => void)[] = [];
		const mockLoadingFn = vi.fn(
			(_: void, signal: AbortSignal) =>
				new Promise<Result>((resolve) => {
					signals.push(signal);
					resolvers.push(resolve);
				})
		);

		const states = $state({ value: [] });
		const rendered = render(NoParam, {
			props: {
				states,
				key: ['cancel-signal-test'],
				loadingFn: mockLoadingFn
			}
		});

		await vi.advanceTimersByTimeAsync(0);
		expect(signals.length).toBe(1);
		expect(signals[0].aborted).toBe(false);

		invalidateQueries(['cancel-signal-test']);
		await vi.advanceTimersByTimeAsync(0);

		// The first load's signal is aborted, the replacement's is not
		expect(signals[0].aborted).toBe(true);
		expect(signals.length).toBe(2);
		expect(signals[1].aborted).toBe(false);

		resolvers[1]({ success: true, data: 'data' });
		await waitFor(() => {
			expect(rendered.queryByText('Data: data')).toBeInTheDocument();
		});

		rendered.unmount();
		vi.useRealTimers();
	});

	test('Cancellation stops a running retry loop', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2025, 5, 11, 12, 0, 0));

		let i = 0;
		const mockLoadingFn = vi.fn(async () => {
			i++;
			return i === 1
				? { success: false as const, error: 'first attempt fails' }
				: { success: true as const, data: 'recovered' };
		});

		const states = $state({ value: [] });
		const rendered = render(NoParam, {
			props: {
				states,
				key: ['cancel-retry-test'],
				loadingFn: mockLoadingFn,
				queryOptions: { retry: 5 }
			}
		});

		// The first attempt fails, the retry loop is now in its 1s backoff
		await vi.advanceTimersByTimeAsync(0);
		expect(mockLoadingFn).toHaveBeenCalledTimes(1);

		// Invalidating mid-backoff cancels the retry loop and starts a
		// fresh load, which succeeds right away
		await vi.advanceTimersByTimeAsync(500);
		invalidateQueries(['cancel-retry-test']);
		await vi.advanceTimersByTimeAsync(0);
		expect(mockLoadingFn).toHaveBeenCalledTimes(2);

		await waitFor(() => {
			expect(rendered.queryByText('Data: recovered')).toBeInTheDocument();
		});

		// The cancelled retry loop never fires again, even after its
		// backoff (and several more) would have elapsed
		await vi.advanceTimersByTimeAsync(60000);
		expect(mockLoadingFn).toHaveBeenCalledTimes(2);
		expect(rendered.queryByText('Data: recovered')).toBeInTheDocument();

		rendered.unmount();
		vi.useRealTimers();
	});
});

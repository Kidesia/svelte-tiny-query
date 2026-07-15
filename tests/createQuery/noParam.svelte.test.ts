import { describe, expect, test, vi } from 'vitest';
import { render, waitFor } from '@testing-library/svelte/svelte5';

import { invalidateQueries } from '../../src/lib/svelte-tiny-query/invalidate.svelte';
import { activeQueryCounts } from '../../src/lib/svelte-tiny-query/cache.svelte';
import NoParam from './NoParam.svelte';
import MultipleNoParam from './MultipleNoParam.svelte';
import TripleNoParam from './TripleNoParam.svelte';
import MisusedInDerived from './MisusedInDerived.svelte';
import WithEnabled from './WithEnabled.svelte';

describe('Normal Query - No Parameter', () => {
	test('Loads data', async () => {
		vi.useFakeTimers();
		const mockDate = new Date(2025, 5, 11, 12, 0, 0);
		vi.setSystemTime(mockDate);

		const states = $state({ value: [] });
		const rendered = render(NoParam, {
			props: {
				states,
				key: ['successful-test'],
				loadingFn: async () => ({ success: true, data: 'payload' })
			}
		});

		await waitFor(() => {
			expect(rendered.queryByText('Data: payload')).toBeInTheDocument();
		});

		expect(states.value).toEqual([
			// Initial state
			{
				data: undefined,
				error: undefined,
				loading: true,
				loadedTimeStamp: undefined,
				staleTimeStamp: undefined,
				enabled: true
			},
			// After loading
			{
				data: 'payload',
				error: undefined,
				loading: false,
				loadedTimeStamp: mockDate.getTime(),
				staleTimeStamp: mockDate.getTime(),
				enabled: true
			}
		]);
	});

	test('Error while loading data', async () => {
		vi.useFakeTimers();
		const mockDate = new Date(2025, 5, 11, 12, 0, 0);
		vi.setSystemTime(mockDate);

		const states = $state({ value: [] });
		const rendered = render(NoParam, {
			props: {
				states,
				key: ['failed-test'],
				loadingFn: async () => ({ success: false, error: 'oopsie' })
			}
		});

		await waitFor(() => {
			expect(rendered.queryByText('Error: oopsie')).toBeInTheDocument();
		});

		expect(states.value).toEqual([
			// Initial state
			{
				data: undefined,
				error: undefined,
				loading: true,
				loadedTimeStamp: undefined,
				staleTimeStamp: undefined,
				enabled: true
			},
			// After loading
			{
				data: undefined,
				error: 'oopsie',
				loading: false,
				loadedTimeStamp: undefined,
				staleTimeStamp: undefined,
				enabled: true
			}
		]);
	});

	test('Reloads data', async () => {
		vi.useFakeTimers();
		const mockDate = new Date(2025, 5, 11, 12, 0, 0);
		vi.setSystemTime(mockDate);

		let i = $state(0);
		const states = $state({ value: [] });
		const rendered = render(NoParam, {
			props: {
				states,
				key: ['reload-test'],
				loadingFn: async () => {
					i++;
					return { success: true, data: `payload ${i}` };
				}
			}
		});

		await waitFor(() => {
			expect(rendered.queryByText('Data: payload 1')).toBeInTheDocument();
		});

		vi.advanceTimersByTime(1000);
		rendered.queryByText('Reload')?.click();
		await waitFor(() => {
			expect(rendered.queryByText('Data: payload 2')).toBeInTheDocument();
		});

		expect(states.value).toEqual([
			// Initial state
			{
				data: undefined,
				error: undefined,
				loading: true,
				loadedTimeStamp: undefined,
				staleTimeStamp: undefined,
				enabled: true
			},
			// After loading
			{
				data: 'payload 1',
				error: undefined,
				loading: false,
				loadedTimeStamp: mockDate.getTime(),
				staleTimeStamp: mockDate.getTime(),
				enabled: true
			},
			// Reloading
			{
				data: 'payload 1',
				error: undefined,
				loading: true,
				loadedTimeStamp: mockDate.getTime(),
				staleTimeStamp: mockDate.getTime(),
				enabled: true
			},
			// After reload
			{
				data: 'payload 2',
				error: undefined,
				loading: false,
				loadedTimeStamp: mockDate.getTime() + 1000,
				staleTimeStamp: mockDate.getTime() + 1000,
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
				key: ['error-after-reload'],
				loadingFn: async () => {
					i++;
					return i % 2 === 1
						? { success: true, data: 'lucky you' }
						: { success: false, error: 'oopsie' };
				}
			}
		});

		await waitFor(() => {
			expect(rendered.queryByText('Data: lucky you')).toBeInTheDocument();
		});

		vi.advanceTimersByTime(1000);
		await waitFor(() => {
			expect(rendered.queryByText('Reload')).toBeInTheDocument();
		});
		rendered.queryByText('Reload')?.click();

		await waitFor(() => {
			expect(rendered.queryByText('Error: oopsie')).toBeInTheDocument();
		});

		expect(states.value).toEqual([
			// Initial state
			{
				data: undefined,
				error: undefined,
				loading: true,
				loadedTimeStamp: undefined,
				staleTimeStamp: undefined,
				enabled: true
			},
			// After loading
			{
				data: 'lucky you',
				error: undefined,
				loading: false,
				loadedTimeStamp: mockDate.getTime(),
				staleTimeStamp: mockDate.getTime(),
				enabled: true
			},
			// Refetching
			{
				data: 'lucky you',
				error: undefined,
				loading: true,
				loadedTimeStamp: mockDate.getTime(),
				staleTimeStamp: mockDate.getTime(),
				enabled: true
			},
			// After error (still has previous data)
			{
				data: 'lucky you',
				error: 'oopsie',
				loading: false,
				loadedTimeStamp: mockDate.getTime(),
				staleTimeStamp: mockDate.getTime(),
				enabled: true
			}
		]);
	});

	test('Initial data is available immediately', async () => {
		vi.useFakeTimers();
		const mockDate = new Date(2025, 5, 11, 12, 0, 0);
		vi.setSystemTime(mockDate);

		const states = $state({ value: [] });
		const rendered = render(NoParam, {
			props: {
				states,
				key: ['initial-data-test'],
				loadingFn: async () => ({ success: true, data: 'updated data' }),
				queryOptions: {
					initialData: 'initial data'
				}
			}
		});

		await waitFor(() => {
			expect(rendered.queryByText('Data: updated data')).toBeInTheDocument();
		});

		expect(states.value).toEqual([
			// Initial state
			{
				data: 'initial data',
				error: undefined,
				loading: true,
				loadedTimeStamp: undefined,
				staleTimeStamp: undefined,
				enabled: true
			},
			// After loading
			{
				data: 'updated data',
				error: undefined,
				loading: false,
				loadedTimeStamp: mockDate.getTime(),
				staleTimeStamp: mockDate.getTime(),
				enabled: true
			}
		]);
	});

	test('Loaded null data does not fall back to initialData', async () => {
		vi.useFakeTimers();
		const mockDate = new Date(2025, 5, 11, 12, 0, 0);
		vi.setSystemTime(mockDate);

		const states = $state({ value: [] });
		const rendered = render(NoParam, {
			props: {
				states,
				key: ['null-data-test'],
				loadingFn: async () => ({ success: true, data: null }),
				queryOptions: {
					initialData: 'initial data'
				}
			}
		});

		await waitFor(() => {
			expect(rendered.queryByText('Loading: false')).toBeInTheDocument();
		});

		expect(states.value).toEqual([
			// Initial state (initialData is used before the first load)
			{
				data: 'initial data',
				error: undefined,
				loading: true,
				loadedTimeStamp: undefined,
				staleTimeStamp: undefined,
				enabled: true
			},
			// After loading (null is the loaded data, not initialData)
			{
				data: null,
				error: undefined,
				loading: false,
				loadedTimeStamp: mockDate.getTime(),
				staleTimeStamp: mockDate.getTime(),
				enabled: true
			}
		]);
	});

	test('Reloads data when the query is mounted', async () => {
		vi.useFakeTimers();
		const mockDate = new Date(2025, 5, 11, 12, 0, 0);
		vi.setSystemTime(mockDate);

		let i = $state(0);
		const states1 = $state({ value: [] });
		const states2 = $state({ value: [] });

		const rendered = render(MultipleNoParam, {
			props: {
				states1: states1,
				states2: states2,
				key: ['remount-test'],
				loadingFn: async () => ({
					success: true,
					data: i++ === 0 ? 'shared data' : 'updated data'
				})
			}
		});

		await waitFor(() => {
			expect(rendered.queryByText('Data 1: shared data')).toBeInTheDocument();
			expect(rendered.queryByText('Data 2: shared data')).toBeInTheDocument();
		});

		vi.advanceTimersByTime(1000);
		rendered.queryByText('Hide 1')?.click();
		await waitFor(() => {
			expect(
				rendered.queryByText('Data 1: shared data')
			).not.toBeInTheDocument();
		});

		vi.advanceTimersByTime(1000);
		rendered.queryByText('Show 1')?.click();
		await waitFor(() => {
			expect(rendered.queryByText('Data 1: updated data')).toBeInTheDocument();
		});

		[states1.value, states2.value].forEach((states) => {
			expect(states).toEqual([
				// Initial state
				{
					data: undefined,
					error: undefined,
					loading: true,
					loadedTimeStamp: undefined,
					staleTimeStamp: undefined,
					enabled: true
				},
				// After loading
				{
					data: 'shared data',
					error: undefined,
					loading: false,
					loadedTimeStamp: mockDate.getTime(),
					staleTimeStamp: mockDate.getTime(),
					enabled: true
				},
				// Hiding (nothing happens)
				// Showing again (reloads data)
				{
					data: 'shared data',
					error: undefined,
					loading: true,
					loadedTimeStamp: mockDate.getTime(),
					staleTimeStamp: mockDate.getTime(),
					enabled: true
				},
				// After reload
				{
					data: 'updated data',
					error: undefined,
					loading: false,
					loadedTimeStamp: mockDate.getTime() + 2000,
					staleTimeStamp: mockDate.getTime() + 2000,
					enabled: true
				}
			]);
		});
	});

	test('Is not auto-reloaded when not stale', async () => {
		vi.useFakeTimers();
		const mockDate = new Date(2025, 5, 11, 12, 0, 0);
		vi.setSystemTime(mockDate);

		let i = $state(0);
		const states1 = $state({ value: [] });
		const states2 = $state({ value: [] });

		const mockLoadingFn = vi.fn(async () => ({
			success: true as const,
			data: i++ === 0 ? 'data' : 'updated data'
		}));

		const rendered = render(MultipleNoParam, {
			props: {
				states1: states1,
				states2: states2,
				key: ['remount-staletime-test'],
				loadingFn: mockLoadingFn,
				queryOptions: {
					staleTime: 3000
				}
			}
		});

		await waitFor(() => {
			expect(rendered.queryByText('Data 1: data')).toBeInTheDocument();
		});

		vi.advanceTimersByTime(1000);
		rendered.queryByText('Hide 1')?.click();
		await waitFor(() => {
			expect(rendered.queryByText('Data 1: data')).not.toBeInTheDocument();
		});

		vi.advanceTimersByTime(1000);
		rendered.queryByText('Show 1')?.click();
		await waitFor(() => {
			expect(rendered.queryByText('Data 1: data')).toBeInTheDocument();
		});

		vi.advanceTimersByTime(1000);
		rendered.queryByText('Hide 1')?.click();
		await waitFor(() => {
			expect(rendered.queryByText('Data 1: data')).not.toBeInTheDocument();
		});

		expect(mockLoadingFn).toHaveBeenCalledTimes(1);

		vi.advanceTimersByTime(1000);
		rendered.queryByText('Show 1')?.click();
		await waitFor(() => {
			expect(rendered.queryByText('Data 1: updated data')).toBeInTheDocument();
		});

		expect(mockLoadingFn).toHaveBeenCalledTimes(2);

		expect(states1.value).toEqual([
			// Initial state
			{
				data: undefined,
				error: undefined,
				loading: true,
				loadedTimeStamp: undefined,
				staleTimeStamp: undefined,
				enabled: true
			},
			// After loading
			{
				data: 'data',
				error: undefined,
				loading: false,
				loadedTimeStamp: mockDate.getTime(),
				staleTimeStamp: mockDate.getTime() + 3000,
				enabled: true
			},
			// Hiding (nothing happens)
			// Showing again (not stale, no reload, but old data is newly initialized)
			{
				data: 'data',
				error: undefined,
				loading: false,
				loadedTimeStamp: mockDate.getTime(),
				staleTimeStamp: mockDate.getTime() + 3000,
				enabled: true
			},
			// Hiding again (nothing happens)
			// Showing again (now stale, reloads data)
			{
				data: 'data',
				error: undefined,
				loading: true,
				loadedTimeStamp: mockDate.getTime(),
				staleTimeStamp: mockDate.getTime() + 3000,
				enabled: true
			},
			// After reload
			{
				data: 'updated data',
				error: undefined,
				loading: false,
				loadedTimeStamp: mockDate.getTime() + 4000,
				staleTimeStamp: mockDate.getTime() + 7000,
				enabled: true
			}
		]);

		expect(states2.value).toEqual([
			// Initial state
			{
				data: undefined,
				error: undefined,
				loading: true,
				loadedTimeStamp: undefined,
				staleTimeStamp: undefined,
				enabled: true
			},
			// After loading
			{
				data: 'data',
				error: undefined,
				loading: false,
				loadedTimeStamp: mockDate.getTime(),
				staleTimeStamp: mockDate.getTime() + 3000,
				enabled: true
			},
			// Hiding (nothing happens)
			// Showing again (not stale, no reload, no need to newly initialize)
			// Hiding again (nothing happens)
			// Showing again (now stale, reloads data)
			{
				data: 'data',
				error: undefined,
				loading: true,
				loadedTimeStamp: mockDate.getTime(),
				staleTimeStamp: mockDate.getTime() + 3000,
				enabled: true
			},
			// After reload
			{
				data: 'updated data',
				error: undefined,
				loading: false,
				loadedTimeStamp: mockDate.getTime() + 4000,
				staleTimeStamp: mockDate.getTime() + 7000,
				enabled: true
			}
		]);
	});

	test('Shares state between multiple instances', async () => {
		vi.useFakeTimers();
		const mockDate = new Date(2025, 5, 11, 12, 0, 0);
		vi.setSystemTime(mockDate);

		const mockLoadingFn = vi.fn(async () => ({
			success: true as const,
			data: i++ === 0 ? 'shared data' : 'updated data'
		}));

		let i = $state(0);
		const states1 = $state({ value: [] });
		const states2 = $state({ value: [] });
		const rendered1 = render(NoParam, {
			props: {
				suffix: ' 1',
				states: states1,
				key: ['shared-data-test'],
				loadingFn: mockLoadingFn
			}
		});
		const rendered2 = render(NoParam, {
			props: {
				suffix: ' 2',
				states: states2,
				key: ['shared-data-test'],
				loadingFn: mockLoadingFn
			}
		});

		await waitFor(() => {
			expect(rendered1.queryByText('Data 1: shared data')).toBeInTheDocument();
			expect(rendered2.queryByText('Data 2: shared data')).toBeInTheDocument();
		});

		// Even though both instances loaded, the loading function was called only once
		expect(mockLoadingFn).toHaveBeenCalledTimes(1);

		vi.advanceTimersByTime(1000);
		rendered1.queryByText('Reload 1')?.click();
		await waitFor(() => {
			expect(rendered1.queryByText('Data 1: updated data')).toBeInTheDocument();
			expect(rendered2.queryByText('Data 2: updated data')).toBeInTheDocument();
		});

		// Reloading triggers the loading function again
		expect(mockLoadingFn).toHaveBeenCalledTimes(2);

		[states1.value, states2.value].forEach((states) => {
			expect(states).toEqual([
				// Initial state
				{
					data: undefined,
					error: undefined,
					loading: true,
					loadedTimeStamp: undefined,
					staleTimeStamp: undefined,
					enabled: true
				},
				// After loading
				{
					data: 'shared data',
					error: undefined,
					loading: false,
					loadedTimeStamp: mockDate.getTime(),
					staleTimeStamp: mockDate.getTime(),
					enabled: true
				},
				// Reloading
				{
					data: 'shared data',
					error: undefined,
					loading: true,
					loadedTimeStamp: mockDate.getTime(),
					staleTimeStamp: mockDate.getTime(),
					enabled: true
				},
				// After reload
				{
					data: 'updated data',
					error: undefined,
					loading: false,
					loadedTimeStamp: mockDate.getTime() + 1000,
					staleTimeStamp: mockDate.getTime() + 1000,
					enabled: true
				}
			]);
		});
	});

	test('Reloads data when invalidated', async () => {
		vi.useFakeTimers();
		const mockDate = new Date(2025, 5, 11, 12, 0, 0);
		vi.setSystemTime(mockDate);

		let i = $state(0);
		const states = $state({ value: [] });
		const mockLoadingFn = vi.fn(async () => ({
			success: true as const,
			data: i++ === 0 ? 'data' : 'updated data'
		}));

		const rendered = render(NoParam, {
			props: {
				states: states,
				key: ['simple-invalidate-test'],
				loadingFn: mockLoadingFn
			}
		});

		await waitFor(() => {
			expect(rendered.queryByText('Data: data')).toBeInTheDocument();
		});

		expect(mockLoadingFn).toHaveBeenCalledTimes(1);

		vi.advanceTimersByTime(1000);
		invalidateQueries(['simple-invalidate-test']);

		await waitFor(() => {
			expect(rendered.queryByText('Data: updated data')).toBeInTheDocument();
		});

		expect(mockLoadingFn).toHaveBeenCalledTimes(2);

		expect(states.value).toEqual([
			// Initial state
			{
				data: undefined,
				error: undefined,
				loading: true,
				loadedTimeStamp: undefined,
				staleTimeStamp: undefined,
				enabled: true
			},
			// After loading
			{
				data: 'data',
				error: undefined,
				loading: false,
				loadedTimeStamp: mockDate.getTime(),
				staleTimeStamp: mockDate.getTime(),
				enabled: true
			},
			// Invalidating (reloads data)
			{
				data: 'data',
				error: undefined,
				loading: true,
				loadedTimeStamp: mockDate.getTime(),
				// invalidating sets the stale time to now - 1
				staleTimeStamp: mockDate.getTime() + 1000 - 1,
				enabled: true
			},
			// After reload
			{
				data: 'updated data',
				error: undefined,
				loading: false,
				loadedTimeStamp: mockDate.getTime() + 1000,
				staleTimeStamp: mockDate.getTime() + 1000,
				enabled: true
			}
		]);
	});

	test('Immediately forgets cached data when force-invalidated', async () => {
		vi.useFakeTimers();
		const mockDate = new Date(2025, 5, 11, 12, 0, 0);
		vi.setSystemTime(mockDate);

		let i = $state(0);
		const states = $state({ value: [] });
		const mockLoadingFn = vi.fn(async () => ({
			success: true as const,
			data: i++ === 0 ? 'data' : 'updated data'
		}));

		const rendered = render(NoParam, {
			props: {
				states: states,
				key: ['force-invalidate-test'],
				loadingFn: mockLoadingFn
			}
		});

		await waitFor(() => {
			expect(rendered.queryByText('Data: data')).toBeInTheDocument();
		});

		expect(mockLoadingFn).toHaveBeenCalledTimes(1);

		vi.advanceTimersByTime(1000);
		invalidateQueries(['force-invalidate-test'], { force: true });

		await waitFor(() => {
			expect(rendered.queryByText('Data: updated data')).toBeInTheDocument();
		});

		expect(mockLoadingFn).toHaveBeenCalledTimes(2);

		expect(states.value).toEqual([
			// Initial state
			{
				data: undefined,
				error: undefined,
				loading: true,
				loadedTimeStamp: undefined,
				staleTimeStamp: undefined,
				enabled: true
			},
			// After loading
			{
				data: 'data',
				error: undefined,
				loading: false,
				loadedTimeStamp: mockDate.getTime(),
				staleTimeStamp: mockDate.getTime(),
				enabled: true
			},
			// Force-invalidating (forgets all cached state and reloads)
			{
				data: undefined,
				error: undefined,
				loading: true,
				loadedTimeStamp: undefined,
				staleTimeStamp: undefined,
				enabled: true
			},
			// After reload
			{
				data: 'updated data',
				error: undefined,
				loading: false,
				loadedTimeStamp: mockDate.getTime() + 1000,
				staleTimeStamp: mockDate.getTime() + 1000,
				enabled: true
			}
		]);
	});

	test('Recovers from error on reload', async () => {
		vi.useFakeTimers();
		const mockDate = new Date(2025, 5, 11, 12, 0, 0);
		vi.setSystemTime(mockDate);

		let i = $state(0);
		const states = $state({ value: [] });
		const rendered = render(NoParam, {
			props: {
				states,
				key: ['error-recovery-test'],
				loadingFn: async () => {
					i++;
					return i === 1
						? { success: false, error: 'failed' }
						: { success: true, data: 'recovered' };
				}
			}
		});

		await waitFor(() => {
			expect(rendered.queryByText('Error: failed')).toBeInTheDocument();
		});

		vi.advanceTimersByTime(1000);
		rendered.queryByText('Reload')?.click();

		await waitFor(() => {
			expect(rendered.queryByText('Data: recovered')).toBeInTheDocument();
		});

		expect(states.value).toEqual([
			// Initial state
			{
				data: undefined,
				error: undefined,
				loading: true,
				loadedTimeStamp: undefined,
				staleTimeStamp: undefined,
				enabled: true
			},
			// After error
			{
				data: undefined,
				error: 'failed',
				loading: false,
				loadedTimeStamp: undefined,
				staleTimeStamp: undefined,
				enabled: true
			},
			// Reloading (error is cleared when reload starts)
			{
				data: undefined,
				error: undefined,
				loading: true,
				loadedTimeStamp: undefined,
				staleTimeStamp: undefined,
				enabled: true
			},
			// After recovery
			{
				data: 'recovered',
				error: undefined,
				loading: false,
				loadedTimeStamp: mockDate.getTime() + 1000,
				staleTimeStamp: mockDate.getTime() + 1000,
				enabled: true
			}
		]);
	});

	test('activeQueryCounts correctly decrements from 3 (double-decrement bug)', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2025, 5, 11, 12, 0, 0));

		const states1 = $state({ value: [] });
		const states2 = $state({ value: [] });
		const states3 = $state({ value: [] });
		const rendered = render(TripleNoParam, {
			props: {
				states1,
				states2,
				states3,
				key: ['triple-decrement-test'],
				loadingFn: async () => ({ success: true, data: 'data' })
			}
		});

		await waitFor(() => {
			expect(rendered.queryByText('Data 1: data')).toBeInTheDocument();
			expect(rendered.queryByText('Data 2: data')).toBeInTheDocument();
			expect(rendered.queryByText('Data 3: data')).toBeInTheDocument();
		});

		// All 3 components active, count should be 3
		expect(activeQueryCounts['triple-decrement-test']).toBe(3);

		// Hide component 1 — count should go from 3 to 2, NOT 3 to 1
		rendered.queryByText('Hide 1')?.click();
		await waitFor(() => {
			expect(rendered.queryByText('Component 1 is hidden')).toBeInTheDocument();
		});

		// BUG: double-decrement causes this to be 1 instead of 2
		expect(activeQueryCounts['triple-decrement-test']).toBe(2);

		// Hide component 2 — count should go from 2 to 1
		rendered.queryByText('Hide 2')?.click();
		await waitFor(() => {
			expect(rendered.queryByText('Component 2 is hidden')).toBeInTheDocument();
		});

		expect(activeQueryCounts['triple-decrement-test']).toBe(1);

		// Hide component 3 — count should be removed
		rendered.queryByText('Hide 3')?.click();
		await waitFor(() => {
			expect(rendered.queryByText('Component 3 is hidden')).toBeInTheDocument();
		});

		expect(activeQueryCounts['triple-decrement-test']).toBeUndefined();
	});

	test('activeQueryCounts decrements when component is destroyed', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2025, 5, 11, 12, 0, 0));

		const states1 = $state({ value: [] });
		const states2 = $state({ value: [] });
		const rendered = render(MultipleNoParam, {
			props: {
				states1,
				states2,
				key: ['unmount-cleanup-test'],
				loadingFn: async () => ({ success: true, data: 'data' })
			}
		});

		await waitFor(() => {
			expect(rendered.queryByText('Data 1: data')).toBeInTheDocument();
			expect(rendered.queryByText('Data 2: data')).toBeInTheDocument();
		});

		// Both components are active, count should be 2
		expect(activeQueryCounts['unmount-cleanup-test']).toBe(2);

		// Hide component 1
		rendered.queryByText('Hide 1')?.click();
		await waitFor(() => {
			expect(rendered.queryByText('Component 1 is hidden')).toBeInTheDocument();
		});

		// Count should decrement to 1
		expect(activeQueryCounts['unmount-cleanup-test']).toBe(1);

		// Hide component 2
		rendered.queryByText('Hide 2')?.click();
		await waitFor(() => {
			expect(rendered.queryByText('Component 2 is hidden')).toBeInTheDocument();
		});

		// Count should be removed (deleted when 0)
		expect(activeQueryCounts['unmount-cleanup-test']).toBeUndefined();
	});

	test('Recovers from a throwing loading function (defect)', async () => {
		vi.useFakeTimers();
		const mockDate = new Date(2025, 5, 11, 12, 0, 0);
		vi.setSystemTime(mockDate);

		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const reportSpy = vi.fn();
		vi.stubGlobal('reportError', reportSpy);

		const defect = new Error('boom');
		let call = 0;
		const states = $state({ value: [] });
		const rendered = render(NoParam, {
			props: {
				states,
				key: ['defect-test'],
				loadingFn: async () => {
					call++;
					if (call === 1) throw defect;
					return { success: true, data: 'recovered' };
				}
			}
		});

		// The defect resets loading, but touches neither data nor error
		await waitFor(() => {
			expect(rendered.queryByText('Loading: false')).toBeInTheDocument();
		});
		expect(rendered.queryByText('Error:')).toBeInTheDocument();
		expect(rendered.queryByText('Data:')).toBeInTheDocument();

		// The defect was reported to the console and the global handlers
		expect(errorSpy).toHaveBeenCalledWith(
			expect.stringContaining('threw instead of returning a failure')
		);
		expect(reportSpy).toHaveBeenCalledWith(defect);

		// The query is not stuck: reloading works again
		rendered.queryByText('Reload')?.click();
		await waitFor(() => {
			expect(rendered.queryByText('Data: recovered')).toBeInTheDocument();
		});

		vi.unstubAllGlobals();
		errorSpy.mockRestore();
		rendered.unmount();
		vi.useRealTimers();
	});

	test('Warns when query function is called inside $derived', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2025, 5, 11, 12, 0, 0));

		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

		render(MisusedInDerived, {
			props: {
				key: ['derived-warning-test'],
				loadingFn: async () => ({ success: true, data: 'data' })
			}
		});

		await waitFor(() => {
			expect(warnSpy).toHaveBeenCalledWith(
				expect.stringContaining('was called inside a reactive context')
			);
		});

		warnSpy.mockRestore();
	});
});

describe('Normal Query - Enabled Option', () => {
	test('Does not load when enabled is initially false', async () => {
		vi.useFakeTimers();
		const mockDate = new Date(2025, 5, 11, 12, 0, 0);
		vi.setSystemTime(mockDate);

		const mockLoadingFn = vi.fn(async () => ({
			success: true as const,
			data: 'payload'
		}));

		const states = $state({ value: [] });
		const rendered = render(WithEnabled, {
			props: {
				states,
				key: ['enabled-false-test'],
				loadingFn: mockLoadingFn,
				initialEnabled: false
			}
		});

		// Wait a tick to let effects settle
		await vi.advanceTimersByTimeAsync(100);

		expect(mockLoadingFn).not.toHaveBeenCalled();
		expect(states.value).toEqual([
			{
				data: undefined,
				error: undefined,
				loading: false,
				loadedTimeStamp: undefined,
				staleTimeStamp: undefined,
				enabled: false
			}
		]);

		rendered.unmount();
		vi.useRealTimers();
	});

	test('Starts loading when enabled flips from false to true', async () => {
		vi.useFakeTimers();
		const mockDate = new Date(2025, 5, 11, 12, 0, 0);
		vi.setSystemTime(mockDate);

		const mockLoadingFn = vi.fn(async () => ({
			success: true as const,
			data: 'payload'
		}));

		const states = $state({ value: [] });
		const rendered = render(WithEnabled, {
			props: {
				states,
				key: ['enabled-toggle-test'],
				loadingFn: mockLoadingFn,
				initialEnabled: false
			}
		});

		await vi.advanceTimersByTimeAsync(100);
		expect(mockLoadingFn).not.toHaveBeenCalled();

		// Toggle enabled to true
		rendered.queryByText('Toggle Enabled')?.click();

		await waitFor(() => {
			expect(rendered.queryByText('Data: payload')).toBeInTheDocument();
		});

		expect(mockLoadingFn).toHaveBeenCalledTimes(1);

		expect(states.value).toEqual([
			// Initially disabled
			{
				data: undefined,
				error: undefined,
				loading: false,
				loadedTimeStamp: undefined,
				staleTimeStamp: undefined,
				enabled: false
			},
			// After enabling — loading starts
			{
				data: undefined,
				error: undefined,
				loading: true,
				loadedTimeStamp: undefined,
				staleTimeStamp: undefined,
				enabled: true
			},
			// After loading completes
			{
				data: 'payload',
				error: undefined,
				loading: false,
				loadedTimeStamp: mockDate.getTime() + 100,
				staleTimeStamp: mockDate.getTime() + 100,
				enabled: true
			}
		]);

		rendered.unmount();
		vi.useRealTimers();
	});

	test('Enabled state is reactive on the returned query object', async () => {
		vi.useFakeTimers();
		const mockDate = new Date(2025, 5, 11, 12, 0, 0);
		vi.setSystemTime(mockDate);

		const states = $state({ value: [] });
		const rendered = render(WithEnabled, {
			props: {
				states,
				key: ['enabled-reactive-test'],
				loadingFn: async () => ({ success: true, data: 'data' }),
				initialEnabled: false
			}
		});

		await vi.advanceTimersByTimeAsync(100);

		// Check that enabled: false is reflected in the DOM
		expect(rendered.queryByText('Enabled: false')).toBeInTheDocument();

		// Toggle enabled
		rendered.queryByText('Toggle Enabled')?.click();

		await waitFor(() => {
			expect(rendered.queryByText('Enabled: true')).toBeInTheDocument();
		});

		rendered.unmount();
		vi.useRealTimers();
	});

	test('Reload does nothing after the query becomes disabled', async () => {
		vi.useFakeTimers();
		const mockDate = new Date(2025, 5, 11, 12, 0, 0);
		vi.setSystemTime(mockDate);

		const mockLoadingFn = vi.fn(async () => ({
			success: true as const,
			data: 'payload'
		}));

		const states = $state({ value: [] });
		const rendered = render(WithEnabled, {
			props: {
				states,
				key: ['enabled-then-disabled-reload-test'],
				loadingFn: mockLoadingFn,
				initialEnabled: true
			}
		});

		// The enabled query loads normally (the loader now exists)
		await waitFor(() => {
			expect(rendered.queryByText('Data: payload')).toBeInTheDocument();
		});
		expect(mockLoadingFn).toHaveBeenCalledTimes(1);

		// Disable the query
		rendered.queryByText('Toggle Enabled')?.click();
		await waitFor(() => {
			expect(rendered.queryByText('Enabled: false')).toBeInTheDocument();
		});

		// Reload must not trigger the (existing) loader while disabled
		vi.advanceTimersByTime(1000);
		rendered.queryByText('Reload')?.click();
		await vi.advanceTimersByTimeAsync(100);

		expect(mockLoadingFn).toHaveBeenCalledTimes(1);

		rendered.unmount();
		vi.useRealTimers();
	});

	test('Reload does nothing while disabled', async () => {
		vi.useFakeTimers();
		const mockDate = new Date(2025, 5, 11, 12, 0, 0);
		vi.setSystemTime(mockDate);

		const mockLoadingFn = vi.fn(async () => ({
			success: true as const,
			data: 'payload'
		}));

		const states = $state({ value: [] });
		const rendered = render(WithEnabled, {
			props: {
				states,
				key: ['enabled-reload-test'],
				loadingFn: mockLoadingFn,
				initialEnabled: false
			}
		});

		await vi.advanceTimersByTimeAsync(100);
		expect(mockLoadingFn).not.toHaveBeenCalled();

		// Try to reload while disabled
		rendered.queryByText('Reload')?.click();
		await vi.advanceTimersByTimeAsync(100);

		// loadingFn should still not have been called
		expect(mockLoadingFn).not.toHaveBeenCalled();

		rendered.unmount();
		vi.useRealTimers();
	});
});

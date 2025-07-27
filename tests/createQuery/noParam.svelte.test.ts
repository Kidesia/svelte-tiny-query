import { describe, expect, test, vi } from 'vitest';
import { render, waitFor } from '@testing-library/svelte/svelte5';

import NoParam from './NoParam.svelte';
import MultipleNoParam from './MultipleNoParam.svelte';

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
				staleTimeStamp: undefined
			},
			// After loading
			{
				data: 'payload',
				error: undefined,
				loading: false,
				loadedTimeStamp: mockDate.getTime(),
				staleTimeStamp: mockDate.getTime()
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
				staleTimeStamp: undefined
			},
			// After loading
			{
				data: undefined,
				error: 'oopsie',
				loading: false,
				loadedTimeStamp: undefined,
				staleTimeStamp: undefined
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
				staleTimeStamp: undefined
			},
			// After loading
			{
				data: 'payload 1',
				error: undefined,
				loading: false,
				loadedTimeStamp: mockDate.getTime(),
				staleTimeStamp: mockDate.getTime()
			},
			// Reloading
			{
				data: 'payload 1',
				error: undefined,
				loading: true,
				loadedTimeStamp: mockDate.getTime(),
				staleTimeStamp: mockDate.getTime()
			},
			// After reload
			{
				data: 'payload 2',
				error: undefined,
				loading: false,
				loadedTimeStamp: mockDate.getTime() + 1000,
				staleTimeStamp: mockDate.getTime() + 1000
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
				staleTimeStamp: undefined
			},
			// After loading
			{
				data: 'lucky you',
				error: undefined,
				loading: false,
				loadedTimeStamp: mockDate.getTime(),
				staleTimeStamp: mockDate.getTime()
			},
			// Refetching
			{
				data: 'lucky you',
				error: undefined,
				loading: true,
				loadedTimeStamp: mockDate.getTime(),
				staleTimeStamp: mockDate.getTime()
			},
			// After error (still has previous data)
			{
				data: 'lucky you',
				error: 'oopsie',
				loading: false,
				loadedTimeStamp: mockDate.getTime(),
				staleTimeStamp: mockDate.getTime()
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
				staleTimeStamp: undefined
			},
			// After loading
			{
				data: 'updated data',
				error: undefined,
				loading: false,
				loadedTimeStamp: mockDate.getTime(),
				staleTimeStamp: mockDate.getTime()
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

		expect(states1.value).toEqual([
			// Initial state
			{
				data: undefined,
				error: undefined,
				loading: true,
				loadedTimeStamp: undefined,
				staleTimeStamp: undefined
			},
			// After loading
			{
				data: 'shared data',
				error: undefined,
				loading: false,
				loadedTimeStamp: mockDate.getTime(),
				staleTimeStamp: mockDate.getTime()
			},
			// Hiding (nothing happens)
			// Showing again (reloads data)
			{
				data: 'shared data',
				error: undefined,
				loading: true,
				loadedTimeStamp: mockDate.getTime(),
				staleTimeStamp: mockDate.getTime()
			},
			// After reload
			{
				data: 'updated data',
				error: undefined,
				loading: false,
				loadedTimeStamp: mockDate.getTime() + 2000,
				staleTimeStamp: mockDate.getTime() + 2000
			}
		]);

		expect(states1.value).toEqual(states2.value);
	});

	test('Shares state between multiple instances', async () => {
		vi.useFakeTimers();
		const mockDate = new Date(2025, 5, 11, 12, 0, 0);
		vi.setSystemTime(mockDate);

		let i = $state(0);
		const states1 = $state({ value: [] });
		const states2 = $state({ value: [] });
		const rendered1 = render(NoParam, {
			props: {
				suffix: ' 1',
				states: states1,
				key: ['shared-data-test'],
				loadingFn: async () => ({
					success: true,
					data: i++ === 0 ? 'shared data' : 'updated data'
				})
			}
		});
		const rendered2 = render(NoParam, {
			props: {
				suffix: ' 2',
				states: states2,
				key: ['shared-data-test'],
				loadingFn: async () => ({
					success: true,
					data: i++ === 0 ? 'shared data' : 'updated data'
				})
			}
		});

		await waitFor(() => {
			expect(rendered1.queryByText('Data 1: shared data')).toBeInTheDocument();
			expect(rendered2.queryByText('Data 2: shared data')).toBeInTheDocument();
		});

		vi.advanceTimersByTime(1000);
		rendered1.queryByText('Reload 1')?.click();
		await waitFor(() => {
			expect(rendered1.queryByText('Data 1: updated data')).toBeInTheDocument();
			expect(rendered2.queryByText('Data 2: updated data')).toBeInTheDocument();
		});

		expect(states1.value).toEqual([
			// Initial state
			{
				data: undefined,
				error: undefined,
				loading: true,
				loadedTimeStamp: undefined,
				staleTimeStamp: undefined
			},
			// After loading
			{
				data: 'shared data',
				error: undefined,
				loading: false,
				loadedTimeStamp: mockDate.getTime(),
				staleTimeStamp: mockDate.getTime()
			},
			// Reloading
			{
				data: 'shared data',
				error: undefined,
				loading: true,
				loadedTimeStamp: mockDate.getTime(),
				staleTimeStamp: mockDate.getTime()
			},
			// After reload
			{
				data: 'updated data',
				error: undefined,
				loading: false,
				loadedTimeStamp: mockDate.getTime() + 1000,
				staleTimeStamp: mockDate.getTime() + 1000
			}
		]);

		// The second instance has the same states (even if it was not reloaded)
		expect(states1.value).toEqual(states2.value);
	});
});

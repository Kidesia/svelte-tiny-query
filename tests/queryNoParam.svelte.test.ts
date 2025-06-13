import { expect, test, vi } from 'vitest';
import { render } from '@testing-library/svelte/svelte5';

import TestContainerNoParam from './TestContainerNoParam.svelte';

test('Works (happy path)', async () => {
	vi.useFakeTimers();
	const mockDate = new Date(2025, 5, 11, 12, 0, 0);
	vi.setSystemTime(mockDate);

	const states = $state({ value: [] });
	const rendered = render(TestContainerNoParam, {
		props: {
			states,
			key: ['successful-test'],
			loadingFn: async () => ({ success: true, data: 'payload' })
		}
	});

	await expect
		.poll(() => rendered.queryByText('Data: payload'))
		.toBeInTheDocument();

	expect(states.value).toEqual([
		// Initial state
		{
			data: undefined,
			error: undefined,
			loading: false,
			staleTimeStamp: undefined
		},
		{
			data: undefined,
			error: undefined,
			loading: true,
			staleTimeStamp: undefined
		},
		// After loading
		{
			data: 'payload',
			error: undefined,
			loading: false,
			staleTimeStamp: mockDate.getTime()
		}
	]);
});

test('Shows initial data immediately if provided', async () => {
	vi.useFakeTimers();
	const mockDate = new Date(2025, 5, 11, 12, 0, 0);
	vi.setSystemTime(mockDate);

	const states = $state({ value: [] });
	const rendered = render(TestContainerNoParam, {
		props: {
			states,
			key: ['initial-data-test'],
			loadingFn: async () => ({ success: true, data: 'updated data' }),
			queryOptions: {
				initialData: 'initial data'
			}
		}
	});

	await expect
		.poll(() => rendered.queryByText('Data: updated data'))
		.toBeInTheDocument();

	expect(states.value).toEqual([
		// Initial state (from initialData)
		{
			data: 'initial data',
			error: undefined,
			loading: false,
			staleTimeStamp: undefined
		},
		{
			data: 'initial data',
			error: undefined,
			loading: true,
			staleTimeStamp: undefined
		},
		// After loading
		{
			data: 'updated data',
			error: undefined,
			loading: false,
			staleTimeStamp: mockDate.getTime()
		}
	]);
});

test('Shows error', async () => {
	vi.useFakeTimers();
	const mockDate = new Date(2025, 5, 11, 12, 0, 0);
	vi.setSystemTime(mockDate);

	const states = $state({ value: [] });
	const rendered = render(TestContainerNoParam, {
		props: {
			states,
			key: ['failed-test'],
			loadingFn: async () => ({ success: false, error: 'oopsie' })
		}
	});

	await expect
		.poll(() => rendered.queryByText('Error: oopsie'))
		.toBeInTheDocument();

	expect(states.value).toEqual([
		// Initial state
		{
			data: undefined,
			error: undefined,
			loading: false,
			staleTimeStamp: undefined
		},
		{
			data: undefined,
			error: undefined,
			loading: true,
			staleTimeStamp: undefined
		},
		// After loading
		{
			data: undefined,
			error: 'oopsie',
			loading: false,
			staleTimeStamp: undefined
		}
	]);
});

test('Reloads the data using the reload function', async () => {
	vi.useFakeTimers();
	const mockDate = new Date(2025, 5, 11, 12, 0, 0);
	vi.setSystemTime(mockDate);

	let i = 0;
	const states = $state({ value: [] });
	const rendered = render(TestContainerNoParam, {
		props: {
			states,
			key: ['no-param-reload'],
			loadingFn: async () => {
				i++;
				return i % 2 === 1
					? { success: true, data: 'i am not changing' }
					: { success: true, data: 'just kidding' };
			}
		}
	});

	await expect
		.poll(() => rendered.queryByText('Data: i am not changing'))
		.toBeInTheDocument();

	vi.advanceTimersByTime(1000);
	rendered.queryByText('Reload')?.click();

	await expect
		.poll(() => rendered.queryByText('Data: just kidding'))
		.toBeInTheDocument();

	expect(states.value).toEqual([
		// Initial state
		{
			data: undefined,
			error: undefined,
			loading: false,
			staleTimeStamp: undefined
		},
		{
			data: undefined,
			error: undefined,
			loading: true,
			staleTimeStamp: undefined
		},
		// After loading
		{
			data: 'i am not changing',
			error: undefined,
			loading: false,
			staleTimeStamp: mockDate.getTime()
		},
		// Refetching
		{
			data: 'i am not changing',
			error: undefined,
			loading: true,
			staleTimeStamp: mockDate.getTime()
		},
		// After error (still has previous data)
		{
			data: 'just kidding',
			error: undefined,
			loading: false,
			staleTimeStamp: mockDate.getTime() + 1000
		}
	]);
});

test('Shows error after reloading', async () => {
	vi.useFakeTimers();
	const mockDate = new Date(2025, 5, 11, 12, 0, 0);
	vi.setSystemTime(mockDate);

	let i = 0;
	const states = $state({ value: [] });
	const rendered = render(TestContainerNoParam, {
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

	await expect
		.poll(() => rendered.queryByText('Data: lucky you'))
		.toBeInTheDocument();

	vi.advanceTimersByTime(1000);
	rendered.queryByText('Reload')?.click();

	await expect
		.poll(() => rendered.queryByText('Error: oopsie'))
		.toBeInTheDocument();

	expect(states.value).toEqual([
		// Initial state
		{
			data: undefined,
			error: undefined,
			loading: false,
			staleTimeStamp: undefined
		},
		{
			data: undefined,
			error: undefined,
			loading: true,
			staleTimeStamp: undefined
		},
		// After loading
		{
			data: 'lucky you',
			error: undefined,
			loading: false,
			staleTimeStamp: mockDate.getTime()
		},
		// Refetching
		{
			data: 'lucky you',
			error: undefined,
			loading: true,
			staleTimeStamp: mockDate.getTime()
		},
		// After error (still has previous data)
		{
			data: 'lucky you',
			error: 'oopsie',
			loading: false,
			staleTimeStamp: mockDate.getTime()
		}
	]);
});

test('Shows data from cache on re-mount and reloads data', async () => {
	const mockDate = new Date(2025, 5, 11, 12, 0, 0);
	vi.useFakeTimers();
	vi.setSystemTime(mockDate);

	const mockLoadingFn = vi.fn(async () => ({
		success: true as const,
		data: `p-${new Date().getTime()}`
	}));

	const states = $state({ value: [] });
	const rendered = render(TestContainerNoParam, {
		props: {
			states,
			key: ['caches-data-remount'],
			loadingFn: mockLoadingFn
		}
	});

	// Wait for the initial data to load
	await expect
		.poll(() => rendered.queryByText(`Data: p-${mockDate.getTime()}`))
		.toBeInTheDocument();

	// Click on "hide" to unmount the query
	rendered.queryByText('Hide')?.click();
	await expect
		.poll(() => rendered.queryByText('Nothing to see here'))
		.toBeInTheDocument();

	// Show again after 1 second (component with query is re-mounting)
	vi.advanceTimersByTime(1000);
	rendered.queryByText('Show again')?.click();

	// When mounted, it shows the cached data and reloads in the background
	await expect
		.poll(() => rendered.queryByText(`Data: p-${mockDate.getTime()}`))
		.toBeInTheDocument();

	// When the query has reloaded, it shows the new data
	await expect
		.poll(() => rendered.queryByText(`Data: p-${mockDate.getTime() + 1000}`))
		.toBeInTheDocument();

	// The loading function was called on every mount
	expect(mockLoadingFn).toHaveBeenCalledTimes(2);

	expect(states.value).toEqual([
		// Initial state
		{
			data: undefined,
			error: undefined,
			loading: false,
			staleTimeStamp: undefined
		},
		{
			data: undefined,
			error: undefined,
			loading: true,
			staleTimeStamp: undefined
		},
		{
			data: `p-${mockDate.getTime()}`,
			error: undefined,
			loading: false,
			staleTimeStamp: mockDate.getTime()
		},
		// Re-mount (loading in background)
		{
			data: `p-${mockDate.getTime()}`,
			error: undefined,
			loading: false,
			staleTimeStamp: mockDate.getTime()
		},
		{
			data: `p-${mockDate.getTime()}`,
			error: undefined,
			loading: true,
			staleTimeStamp: mockDate.getTime()
		},
		{
			data: `p-${mockDate.getTime() + 1000}`,
			error: undefined,
			loading: false,
			staleTimeStamp: mockDate.getTime() + 1000
		}
	]);
});

test('Does not reload data unless the cache is stale', async () => {
	const mockDate = new Date(2025, 5, 11, 12, 0, 0);
	const expectedStaleTime = mockDate.getTime() + 3000;

	vi.useFakeTimers();
	vi.setSystemTime(mockDate);

	const mockLoadingFn = vi.fn(async () => ({
		success: true as const,
		data: `p-${new Date().getTime()}`
	}));

	const states = $state({ value: [] });
	const rendered = render(TestContainerNoParam, {
		props: {
			states,
			key: ['staletime-example'],
			loadingFn: mockLoadingFn,
			queryOptions: {
				staleTime: 3000
			}
		}
	});

	// Wait for the initial data to load
	await expect
		.poll(() => rendered.queryByText(`Data: p-${mockDate.getTime()}`))
		.toBeInTheDocument();

	// Click on "hide" to unmount the query
	vi.advanceTimersByTime(1000);
	rendered.queryByText('Hide')?.click();
	await expect
		.poll(() => rendered.queryByText('Nothing to see here'))
		.toBeInTheDocument();

	// Show again after 1 second. This does not trigger loading, as the data is still fresh
	vi.advanceTimersByTime(1000);
	rendered.queryByText('Show again')?.click();
	await expect
		.poll(() => rendered.queryByText(`Data: p-${mockDate.getTime()}`))
		.toBeInTheDocument();

	// Click on "hide" to unmount the query again
	vi.advanceTimersByTime(1000);
	rendered.queryByText('Hide')?.click();
	await expect
		.poll(() => rendered.queryByText('Nothing to see here'))
		.toBeInTheDocument();

	// Show again after 1 second. This time it triggers loading, as the data is stale
	vi.advanceTimersByTime(1000);
	rendered.queryByText('Show again')?.click();
	await expect
		.poll(() => rendered.queryByText(`Data: p-${mockDate.getTime()}`))
		.toBeInTheDocument();

	// After initially showing the cached data, it updates to the new data
	await expect
		.poll(() => rendered.queryByText(`Data: p-${mockDate.getTime() + 4000}`))
		.toBeInTheDocument();

	// The loading function has been called initially, and the second time the query was mounted
	expect(mockLoadingFn).toHaveBeenCalledTimes(2);

	expect(states.value).toEqual([
		// Initial state
		{
			data: undefined,
			error: undefined,
			loading: false,
			staleTimeStamp: undefined
		},
		{
			data: undefined,
			error: undefined,
			loading: true,
			staleTimeStamp: undefined
		},
		{
			data: `p-${mockDate.getTime()}`,
			error: undefined,
			loading: false,
			staleTimeStamp: expectedStaleTime
		},
		// First re-mount (not loading, as the data is still fresh)
		// TODO: why twice here?
		{
			data: `p-${mockDate.getTime()}`,
			error: undefined,
			loading: false,
			staleTimeStamp: expectedStaleTime
		},
		{
			data: `p-${mockDate.getTime()}`,
			error: undefined,
			loading: false,
			staleTimeStamp: expectedStaleTime
		},
		// Second re-mount (loading, as the data is stale)
		{
			data: `p-${mockDate.getTime()}`,
			error: undefined,
			loading: true,
			staleTimeStamp: expectedStaleTime
		},
		{
			data: `p-${mockDate.getTime() + 4000}`,
			error: undefined,
			loading: false,
			staleTimeStamp: expectedStaleTime + 4000
		}
	]);
});

// test('Multiple instances of same queries share their state', async () => {
// 	vi.useFakeTimers();
// 	const mockDate = new Date(2025, 5, 11, 12, 0, 0);
// 	vi.setSystemTime(mockDate);

// 	const mockLoadingFn = vi.fn(async () => ({
// 		success: true as const,
// 		data: `d-${new Date().getTime()}`
// 	}));

// 	const states1 = $state({ value: [] });
// 	const states2 = $state({ value: [] });
// 	const rendered = render(TestContainerNoParamMulti, {
// 		props: {
// 			states1,
// 			states2,
// 			key: ['multiple-queries-example'],
// 			loadingFn: mockLoadingFn
// 		}
// 	});

// 	// Wait for the initial data to load
// 	await expect
// 		.poll(() => rendered.queryByText(`Data 1: d-${mockDate.getTime()}`))
// 		.toBeInTheDocument();
// 	await expect
// 		.poll(() => rendered.queryByText(`Data 2: d-${mockDate.getTime()}`))
// 		.toBeInTheDocument();

// 	// After 1 second, ide one of the queries (unmounting it)
// 	vi.advanceTimersByTime(1000);
// 	rendered.queryByText('Hide 1')?.click();
// 	await expect
// 		.poll(() => rendered.queryByText('Nothing to see here 1'))
// 		.toBeInTheDocument();

// 	// Show again after 1 second (component with query is re-mounting)
// 	//
// 	vi.advanceTimersByTime(1000);
// 	rendered.queryByText('Increment 2')?.click();

// 	await expect
// 		.poll(() => rendered.queryByText('Data 2: id is 2'))
// 		.toBeInTheDocument();

// 	// even though both queries switched to param 2, the function will only be called once more
// 	expect(mockLoadingFn).toHaveBeenCalledTimes(2);

// 	expect(states1.value).toEqual([
// 		// Initial state
// 		{
// 			data: undefined,
// 			error: undefined,
// 			loading: false,
// 			staleTimeStamp: undefined
// 		},
// 		{
// 			data: undefined,
// 			error: undefined,
// 			loading: true,
// 			staleTimeStamp: undefined
// 		},
// 		{
// 			data: 'id is 1',
// 			error: undefined,
// 			loading: false,
// 			staleTimeStamp: mockDate.getTime() + 2000
// 		},
// 		// incrementing to id 2
// 		{
// 			data: undefined,
// 			error: undefined,
// 			loading: true,
// 			staleTimeStamp: undefined
// 		},
// 		{
// 			data: 'id is 2',
// 			error: undefined,
// 			loading: false,
// 			staleTimeStamp: mockDate.getTime() + 3000
// 		}
// 	]);

// 	expect(states2.value).toEqual([
// 		// Initial state (already loading from query1)
// 		{
// 			data: undefined,
// 			error: undefined,
// 			loading: true,
// 			staleTimeStamp: undefined
// 		},
// 		{
// 			data: 'id is 1',
// 			error: undefined,
// 			loading: false,
// 			staleTimeStamp: mockDate.getTime() + 2000
// 		},
// 		// incrementing to id 2 (from cache)
// 		{
// 			data: 'id is 2',
// 			error: undefined,
// 			loading: false,
// 			staleTimeStamp: mockDate.getTime() + 3000
// 		}
// 	]);
// });

import { expect, test, vi } from 'vitest';
import { render } from '@testing-library/svelte/svelte5';

import TestContainerWithParam from './TestContainerWithParam.svelte';
import TestContainerMultipleWithParams from './TestContainerMultipleWithParams.svelte';

// test('Initial data', async () => {
// 	vi.useFakeTimers();
// 	const mockDate = new Date(2025, 5, 11, 12, 0, 0);
// 	vi.setSystemTime(mockDate);

// 	const states = $state({ value: [] });
// 	const rendered = render(TestContainerNoParam, {
// 		props: {
// 			states,
// 			key: ['initial-data-test'],
// 			loadingFn: async () => ({ success: true, data: 'updated data' }),
// 			queryOptions: {
// 				initialData: 'initial data'
// 			}
// 		}
// 	});

// 	await expect
// 		.poll(() => rendered.queryByText('Data: updated data'))
// 		.toBeInTheDocument();

// 	expect(states.value).toEqual([
// 		// Initial state (from initialData)
// 		{
// 			data: 'initial data',
// 			error: undefined,
// 			loading: false,
// 			staleTimeStamp: undefined
// 		},
// 		{
// 			data: 'initial data',
// 			error: undefined,
// 			loading: true,
// 			staleTimeStamp: undefined
// 		},
// 		// After loading
// 		{
// 			data: 'updated data',
// 			error: undefined,
// 			loading: false,
// 			staleTimeStamp: mockDate.getTime()
// 		}
// 	]);
// });

// test('Error', async () => {
// 	vi.useFakeTimers();
// 	const mockDate = new Date(2025, 5, 11, 12, 0, 0);
// 	vi.setSystemTime(mockDate);

// 	const states = $state({ value: [] });
// 	const rendered = render(TestContainerNoParam, {
// 		props: {
// 			states,
// 			key: ['failed-test'],
// 			loadingFn: async () => ({ success: false, error: 'oopsie' })
// 		}
// 	});

// 	await expect
// 		.poll(() => rendered.queryByText('Error: oopsie'))
// 		.toBeInTheDocument();

// 	expect(states.value).toEqual([
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
// 		// After loading
// 		{
// 			data: undefined,
// 			error: 'oopsie',
// 			loading: false,
// 			staleTimeStamp: undefined
// 		}
// 	]);
// });

// test('Reload', async () => {
// 	vi.useFakeTimers();
// 	const mockDate = new Date(2025, 5, 11, 12, 0, 0);
// 	vi.setSystemTime(mockDate);

// 	let i = 0;
// 	const states = $state({ value: [] });
// 	const rendered = render(TestContainerNoParam, {
// 		props: {
// 			states,
// 			key: ['no-param-reload'],
// 			loadingFn: async () => {
// 				i++;
// 				return i % 2 === 1
// 					? { success: true, data: 'i am not changing' }
// 					: { success: true, data: 'just kidding' };
// 			}
// 		}
// 	});

// 	await expect
// 		.poll(() => rendered.queryByText('Data: i am not changing'))
// 		.toBeInTheDocument();

// 	vi.advanceTimersByTime(1000);
// 	rendered.queryByText('Reload')?.click();

// 	await expect
// 		.poll(() => rendered.queryByText('Data: just kidding'))
// 		.toBeInTheDocument();

// 	expect(states.value).toEqual([
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
// 		// After loading
// 		{
// 			data: 'i am not changing',
// 			error: undefined,
// 			loading: false,
// 			staleTimeStamp: mockDate.getTime()
// 		},
// 		// Refetching
// 		{
// 			data: 'i am not changing',
// 			error: undefined,
// 			loading: true,
// 			staleTimeStamp: mockDate.getTime()
// 		},
// 		// After error (still has previous data)
// 		{
// 			data: 'just kidding',
// 			error: undefined,
// 			loading: false,
// 			staleTimeStamp: mockDate.getTime() + 1000
// 		}
// 	]);
// });

// test('Error after reload', async () => {
// 	vi.useFakeTimers();
// 	const mockDate = new Date(2025, 5, 11, 12, 0, 0);
// 	vi.setSystemTime(mockDate);

// 	let i = 0;
// 	const states = $state({ value: [] });
// 	const rendered = render(TestContainerNoParam, {
// 		props: {
// 			states,
// 			key: ['error-after-reload'],
// 			loadingFn: async () => {
// 				i++;
// 				return i % 2 === 1
// 					? { success: true, data: 'lucky you' }
// 					: { success: false, error: 'oopsie' };
// 			}
// 		}
// 	});

// 	await expect
// 		.poll(() => rendered.queryByText('Data: lucky you'))
// 		.toBeInTheDocument();

// 	vi.advanceTimersByTime(1000);
// 	rendered.queryByText('Reload')?.click();

// 	await expect
// 		.poll(() => rendered.queryByText('Error: oopsie'))
// 		.toBeInTheDocument();

// 	expect(states.value).toEqual([
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
// 		// After loading
// 		{
// 			data: 'lucky you',
// 			error: undefined,
// 			loading: false,
// 			staleTimeStamp: mockDate.getTime()
// 		},
// 		// Refetching
// 		{
// 			data: 'lucky you',
// 			error: undefined,
// 			loading: true,
// 			staleTimeStamp: mockDate.getTime()
// 		},
// 		// After error (still has previous data)
// 		{
// 			data: 'lucky you',
// 			error: 'oopsie',
// 			loading: false,
// 			staleTimeStamp: mockDate.getTime()
// 		}
// 	]);
// });

test('Success', async () => {
	vi.useFakeTimers();
	const mockDate = new Date(2025, 5, 11, 12, 0, 0);
	vi.setSystemTime(mockDate);

	const states = $state({ value: [] });
	const rendered = render(TestContainerWithParam, {
		props: {
			states,
			key: ['reactive-param-example'],
			loadingFn: async (param: { id: number }) => ({
				success: true,
				data: `id is ${param.id}`
			})
		}
	});

	await expect
		.poll(() => rendered.queryByText('Data: id is 1'))
		.toBeInTheDocument();

	vi.advanceTimersByTime(1000);

	rendered.queryByText('Increment')?.click();

	await expect
		.poll(() => rendered.queryByText('Data: id is 2'))
		.toBeInTheDocument();

	vi.advanceTimersByTime(1000);

	rendered.queryByText('Decrement')?.click();

	await expect
		.poll(() => rendered.queryByText('Data: id is 1'))
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
		{
			data: 'id is 1',
			error: undefined,
			loading: false,
			staleTimeStamp: mockDate.getTime()
		},
		// incrementing to id 2
		{
			data: undefined,
			error: undefined,
			loading: true,
			staleTimeStamp: undefined
		},
		{
			data: 'id is 2',
			error: undefined,
			loading: false,
			staleTimeStamp: mockDate.getTime() + 1000
		},
		// decrementing back to id 1
		{
			data: 'id is 1',
			error: undefined,
			loading: true,
			staleTimeStamp: mockDate.getTime()
		},
		{
			data: 'id is 1',
			error: undefined,
			loading: false,
			staleTimeStamp: mockDate.getTime() + 2000
		}
	]);
});

test('Staletime', async () => {
	vi.useFakeTimers();
	const mockDate = new Date(2025, 5, 11, 12, 0, 0);
	vi.setSystemTime(mockDate);
	const expectedStaleTime = mockDate.getTime() + 3000;

	const states = $state({ value: [] });
	const rendered = render(TestContainerWithParam, {
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

	await expect
		.poll(() => rendered.queryByText('Data: id is 1'))
		.toBeInTheDocument();

	vi.advanceTimersByTime(1000);
	rendered.queryByText('Increment')?.click();

	await expect
		.poll(() => rendered.queryByText('Data: id is 2'))
		.toBeInTheDocument();

	vi.advanceTimersByTime(1000);
	rendered.queryByText('Decrement')?.click();

	await expect
		.poll(() => rendered.queryByText('Data: id is 1'))
		.toBeInTheDocument();

	vi.advanceTimersByTime(1000);
	rendered.queryByText('Increment')?.click();

	await expect
		.poll(() => rendered.queryByText('Data: id is 2'))
		.toBeInTheDocument();

	vi.advanceTimersByTime(1000);
	rendered.queryByText('Decrement')?.click();

	await expect
		.poll(() => rendered.queryByText('Data: id is 1'))
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
		{
			data: 'id is 1',
			error: undefined,
			loading: false,
			staleTimeStamp: expectedStaleTime
		},
		// incrementing to id 2
		{
			data: undefined,
			error: undefined,
			loading: true,
			staleTimeStamp: undefined
		},
		{
			data: 'id is 2',
			error: undefined,
			loading: false,
			staleTimeStamp: expectedStaleTime + 1000
		},
		// decrementing back to id 1 (not stale yet)
		{
			data: 'id is 1',
			error: undefined,
			loading: false,
			staleTimeStamp: expectedStaleTime
		},
		// incrementing to id 2 (not stale yet)
		{
			data: 'id is 2',
			error: undefined,
			loading: false,
			staleTimeStamp: expectedStaleTime + 1000
		},
		// decrementing back to id 1 (now stale!)
		{
			data: 'id is 1',
			error: undefined,
			loading: true,
			staleTimeStamp: expectedStaleTime
		},
		{
			data: 'id is 1',
			error: undefined,
			loading: false,
			staleTimeStamp: expectedStaleTime + 4000
		}
	]);
});

test('Multiple instances, Staletime', async () => {
	vi.useFakeTimers();
	const mockDate = new Date(2025, 5, 11, 12, 0, 0);
	vi.setSystemTime(mockDate);

	const mockLoadingFn = vi.fn(async (param: { id: number }) => ({
		success: true as const,
		data: `id is ${param.id}`
	}));

	const states1 = $state({ value: [] });
	const states2 = $state({ value: [] });
	const rendered = render(TestContainerMultipleWithParams, {
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

	await expect
		.poll(() => rendered.queryByText('Data 1: id is 1'))
		.toBeInTheDocument();

	// even though the query is being used twice, the function will only be called once
	expect(mockLoadingFn).toHaveBeenCalledTimes(1);

	vi.advanceTimersByTime(1000);
	rendered.queryByText('Increment 1')?.click();

	await expect
		.poll(() => rendered.queryByText('Data 1: id is 2'))
		.toBeInTheDocument();

	vi.advanceTimersByTime(1000);
	rendered.queryByText('Increment 2')?.click();

	await expect
		.poll(() => rendered.queryByText('Data 2: id is 2'))
		.toBeInTheDocument();

	// even though both queries switched to param 2, the function will only be called once more
	expect(mockLoadingFn).toHaveBeenCalledTimes(2);

	expect(states1.value).toEqual([
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
			data: 'id is 1',
			error: undefined,
			loading: false,
			staleTimeStamp: mockDate.getTime() + 2000
		},
		// incrementing to id 2
		{
			data: undefined,
			error: undefined,
			loading: true,
			staleTimeStamp: undefined
		},
		{
			data: 'id is 2',
			error: undefined,
			loading: false,
			staleTimeStamp: mockDate.getTime() + 3000
		}
	]);

	expect(states2.value).toEqual([
		// Initial state (already loading from query1)
		{
			data: undefined,
			error: undefined,
			loading: true,
			staleTimeStamp: undefined
		},
		{
			data: 'id is 1',
			error: undefined,
			loading: false,
			staleTimeStamp: mockDate.getTime() + 2000
		},
		// incrementing to id 2 (from cache)
		{
			data: 'id is 2',
			error: undefined,
			loading: false,
			staleTimeStamp: mockDate.getTime() + 3000
		}
	]);
});

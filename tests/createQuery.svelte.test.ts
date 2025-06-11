import { describe, expect, test, vi } from 'vitest';
import { render, waitFor } from '@testing-library/svelte/svelte5';

import TestContainerNoParam from './BaseExample.svelte';
import TestContainerWithParam from './ControlsExample.svelte';

describe('createQuery', () => {
	test('No param', async () => {
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

		await waitFor(() => {
			expect(rendered.queryByText('Data: payload')).toBeInTheDocument();
		});

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

	test('Error', async () => {
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

		await waitFor(() => {
			expect(rendered.queryByText('Error: oopsie')).toBeInTheDocument();
		});

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

	test('Reactive param', async () => {
		vi.useFakeTimers();
		const mockDate = new Date(2025, 5, 11, 12, 0, 0);
		vi.setSystemTime(mockDate);

		const states = $state({ value: [] });
		const rendered = render(TestContainerWithParam, {
			props: {
				states,
				key: ['basic-cache-example'],
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

	test('With initial data', async () => {
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

		await waitFor(() => {
			expect(rendered.queryByText('Data: updated data')).toBeInTheDocument();
		});

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
});

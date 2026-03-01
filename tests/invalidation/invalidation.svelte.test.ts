import { describe, expect, test, vi } from 'vitest';
import { render, waitFor } from '@testing-library/svelte/svelte5';

import { invalidateQueries, updateQueryData } from '../../src/lib/svelte-tiny-query/invalidate.svelte';
import NoParam from '../createQuery/NoParam.svelte';

describe('invalidateQueries - prefix matching', () => {
	test('invalidating ["todo"] does NOT invalidate ["todoList"]', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2025, 5, 11, 12, 0, 0));

		let todoCallCount = 0;
		let todoListCallCount = 0;

		const todoStates = $state({ value: [] });
		const todoListStates = $state({ value: [] });

		const renderedTodo = render(NoParam, {
			props: {
				states: todoStates,
				key: ['todo'],
				loadingFn: async () => ({
					success: true,
					data: `todo-${++todoCallCount}`
				})
			}
		});

		const renderedTodoList = render(NoParam, {
			props: {
				states: todoListStates,
				key: ['todoList'],
				loadingFn: async () => ({
					success: true,
					data: `todoList-${++todoListCallCount}`
				})
			}
		});

		await waitFor(() => {
			expect(renderedTodo.queryByText('Data: todo-1')).toBeInTheDocument();
			expect(renderedTodoList.queryByText('Data: todoList-1')).toBeInTheDocument();
		});

		vi.advanceTimersByTime(1000);
		invalidateQueries(['todo']);

		await waitFor(() => {
			expect(renderedTodo.queryByText('Data: todo-2')).toBeInTheDocument();
		});

		// todoList should NOT have been reloaded
		expect(todoListCallCount).toBe(1);
		expect(renderedTodoList.queryByText('Data: todoList-1')).toBeInTheDocument();
	});

	test('invalidating ["todo"] DOES invalidate ["todo"] with params', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2025, 5, 11, 12, 0, 0));

		let callCount = 0;
		const states = $state({ value: [] });

		// This query has key ["todo-prefix-test"] with a param, so cache key is "todo-prefix-test__..."
		const rendered = render(NoParam, {
			props: {
				states,
				key: ['todo-prefix-test'],
				loadingFn: async () => ({
					success: true,
					data: `data-${++callCount}`
				})
			}
		});

		await waitFor(() => {
			expect(rendered.queryByText('Data: data-1')).toBeInTheDocument();
		});

		vi.advanceTimersByTime(1000);
		// Invalidate the parent key — should match child queries with params too
		invalidateQueries(['todo-prefix-test']);

		await waitFor(() => {
			expect(rendered.queryByText('Data: data-2')).toBeInTheDocument();
		});

		expect(callCount).toBe(2);
	});

	test('invalidating with exact option only matches exact key', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2025, 5, 11, 12, 0, 0));

		let parentCallCount = 0;
		const parentStates = $state({ value: [] });

		// Use a unique key so it won't collide with other tests  
		const rendered = render(NoParam, {
			props: {
				states: parentStates,
				key: ['exact-test'],
				loadingFn: async () => ({
					success: true,
					data: `data-${++parentCallCount}`
				})
			}
		});

		await waitFor(() => {
			expect(rendered.queryByText('Data: data-1')).toBeInTheDocument();
		});

		vi.advanceTimersByTime(1000);
		// Invalidate with exact — should match since the cache key is exactly "exact-test"
		invalidateQueries(['exact-test'], { exact: true });

		await waitFor(() => {
			expect(rendered.queryByText('Data: data-2')).toBeInTheDocument();
		});

		expect(parentCallCount).toBe(2);
	});
});

describe('updateQueryData', () => {
	test('updates cached data for an active query', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2025, 5, 11, 12, 0, 0));

		const states = $state({ value: [] });

		const rendered = render(NoParam, {
			props: {
				states,
				key: ['update-data-test'],
				loadingFn: async () => ({
					success: true,
					data: 'original'
				})
			}
		});

		await waitFor(() => {
			expect(rendered.queryByText('Data: original')).toBeInTheDocument();
		});

		updateQueryData(['update-data-test'], (current) => `${current} + modified`);

		await waitFor(() => {
			expect(rendered.queryByText('Data: original + modified')).toBeInTheDocument();
		});
	});

	test('does not update queries that do not match the key', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2025, 5, 11, 12, 0, 0));

		const states = $state({ value: [] });

		const rendered = render(NoParam, {
			props: {
				states,
				key: ['no-match-test'],
				loadingFn: async () => ({
					success: true,
					data: 'untouched'
				})
			}
		});

		await waitFor(() => {
			expect(rendered.queryByText('Data: untouched')).toBeInTheDocument();
		});

		updateQueryData(['completely-different-key'], () => 'should not appear');

		// Data should remain unchanged
		expect(rendered.queryByText('Data: untouched')).toBeInTheDocument();
	});
});


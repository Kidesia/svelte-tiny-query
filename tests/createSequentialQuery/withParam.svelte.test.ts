import { describe, expect, test, vi } from 'vitest';
import { render, waitFor } from '@testing-library/svelte/svelte5';

import WithParam from './WithParam.svelte';

describe('Sequential Query - With Parameter', () => {
	test('Loads first page and supports loadMore', async () => {
		vi.useFakeTimers();
		const mockDate = new Date(2025, 5, 11, 12, 0, 0);
		vi.setSystemTime(mockDate);

		let callCount = 0;
		const states = $state({ value: [] });
		const rendered = render(WithParam, {
			props: {
				states,
				key: ['seq-with-param-test'],
				loadingFn: async (param: { id: number }, cursor: number | undefined) => {
					callCount++;
					if (!cursor) {
						return {
							success: true,
							data: `page1-id${param.id}`,
							cursor: 2
						};
					}
					return {
						success: true,
						data: `page2-id${param.id}`,
						cursor: undefined
					};
				}
			}
		});

		// First page loads
		await waitFor(() => {
			expect(
				rendered.queryByText('Data: ["page1-id1"]')
			).toBeInTheDocument();
			expect(rendered.queryByText('Has More: Yes')).toBeInTheDocument();
		});

		// Load more
		vi.advanceTimersByTime(1000);
		rendered.queryByText('Load More')?.click();
		await waitFor(() => {
			expect(
				rendered.queryByText('Data: ["page1-id1","page2-id1"]')
			).toBeInTheDocument();
			expect(rendered.queryByText('Has More: No')).toBeInTheDocument();
		});

		expect(callCount).toBe(2);
	});

	test('Resets pages when param changes', async () => {
		vi.useFakeTimers();
		const mockDate = new Date(2025, 5, 11, 12, 0, 0);
		vi.setSystemTime(mockDate);

		const states = $state({ value: [] });
		const rendered = render(WithParam, {
			props: {
				states,
				key: ['seq-param-change-test'],
				loadingFn: async (param: { id: number }, cursor: number | undefined) => {
					if (!cursor) {
						return {
							success: true,
							data: `page1-id${param.id}`,
							cursor: 2
						};
					}
					return {
						success: true,
						data: `page2-id${param.id}`,
						cursor: undefined
					};
				}
			}
		});

		// First page loads for id=1
		await waitFor(() => {
			expect(
				rendered.queryByText('Data: ["page1-id1"]')
			).toBeInTheDocument();
		});

		// Load second page
		vi.advanceTimersByTime(1000);
		rendered.queryByText('Load More')?.click();
		await waitFor(() => {
			expect(
				rendered.queryByText('Data: ["page1-id1","page2-id1"]')
			).toBeInTheDocument();
		});

		// Change param — should reset to first page of new param
		vi.advanceTimersByTime(1000);
		rendered.queryByText('Increment')?.click();
		await waitFor(() => {
			expect(
				rendered.queryByText('Data: ["page1-id2"]')
			).toBeInTheDocument();
		});

		// Previous pages for id=1 should not appear
		expect(
			rendered.queryByText('Data: ["page1-id1","page2-id1"]')
		).not.toBeInTheDocument();
	});
});


import { describe, expect, test, vi } from 'vitest';
import { render, waitFor } from '@testing-library/svelte/svelte5';

import WithParam from './WithParam.svelte';

describe('Query Infos', () => {
	test.skip('ActiveQueries reflects the current parameter', async () => {
		vi.useFakeTimers();
		const mockDate = new Date(2025, 5, 11, 12, 0, 0);
		vi.setSystemTime(mockDate);

		const states = $state({ value: [] });
		const activeQueries = $state({ value: [] });
		const rendered = render(WithParam, {
			props: {
				states,
				activeQueries,
				key: ['reactive-param-active-queries'],
				loadingFn: async (param: { id: number }) => ({
					success: true,
					data: `id is ${param.id}`
				})
			}
		});

		await waitFor(() => {
			expect(rendered.queryByText('Data: id is 1')).toBeInTheDocument();
			expect(
				rendered.queryByText(
					`Active Queries: [["reactive-param-active-queries","id:1"]]`
				)
			).toBeInTheDocument();
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
		await waitFor(() => {
			expect(
				rendered.queryByText(`Loaded at: ${mockDate.getTime() + 2000}`)
			).toBeInTheDocument();
		});

		// TODO: fix passing back the history of active queries in order to assert on it
		// expect(activeQueries.value).toEqual([
		// 	[['reactive-param-active-queries', 'id:1']],
		// 	[['reactive-param-active-queries', 'id:2']],
		// 	[['reactive-param-active-queries', 'id:1']]
		// ]);
	});
});

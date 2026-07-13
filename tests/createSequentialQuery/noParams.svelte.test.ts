import { describe, expect, test, vi } from 'vitest';
import { render, waitFor } from '@testing-library/svelte/svelte5';

import NoParam from './NoParam.svelte';
import { invalidateQueries } from '$lib/index.ts';

describe('Sequential Query - No Parameter', () => {
	test('Loads first page', async () => {
		vi.useFakeTimers();
		const mockDate = new Date(2025, 5, 11, 12, 0, 0);
		vi.setSystemTime(mockDate);

		const states = $state({ value: [] });
		const rendered = render(NoParam, {
			props: {
				states,
				key: ['successful-test'],
				loadingFn: async () => ({
					success: true,
					data: 'payload',
					cursor: undefined
				})
			}
		});

		await waitFor(() => {
			expect(rendered.queryByText('Data: ["payload"]')).toBeInTheDocument();
		});

		expect(states.value).toEqual([
			// Initial state
			{
				data: undefined,
				error: undefined,
				loading: true,
				hasMore: undefined,
				loadedTimeStamp: undefined,
				staleTimeStamp: undefined,
				enabled: true
			},
			// After loading there is no more data (cursor was undefined)
			{
				data: ['payload'],
				error: undefined,
				loading: false,
				hasMore: false,
				loadedTimeStamp: mockDate.getTime(),
				staleTimeStamp: Infinity,
				enabled: true
			}
		]);
	});

	test('Error loading first load', async () => {
		vi.useFakeTimers();
		const mockDate = new Date(2025, 5, 11, 12, 0, 0);
		vi.setSystemTime(mockDate);

		const states = $state({ value: [] });
		const rendered = render(NoParam, {
			props: {
				states,
				key: ['error-test'],
				loadingFn: async () => ({
					success: false,
					error: 'Error loading data',
					data: undefined
				})
			}
		});

		await waitFor(() => {
			expect(
				rendered.queryByText('Error: Error loading data')
			).toBeInTheDocument();
		});

		expect(states.value).toEqual([
			// Initial state
			{
				data: undefined,
				error: undefined,
				loading: true,
				hasMore: undefined,
				loadedTimeStamp: undefined,
				staleTimeStamp: undefined,
				enabled: true
			},
			// After error
			{
				data: undefined,
				error: 'Error loading data',
				loading: false,
				hasMore: undefined,
				loadedTimeStamp: undefined,
				staleTimeStamp: undefined,
				enabled: true
			}
		]);
	});

	test('Loads more data', async () => {
		vi.useFakeTimers();
		const mockDate = new Date(2025, 5, 11, 12, 0, 0);
		vi.setSystemTime(mockDate);

		const states = $state({ value: [] });
		const rendered = render(NoParam, {
			props: {
				states,
				key: ['load-more-test'],
				loadingFn: async (_, cursor = 0) => ({
					success: true,
					data: [cursor, cursor + 1, cursor + 2],
					cursor: cursor < 20 ? cursor + 10 : undefined
				})
			}
		});

		await waitFor(() => {
			expect(rendered.queryByText('Data: [[0,1,2]]')).toBeInTheDocument();
			expect(rendered.queryByText('Has More: Yes')).toBeInTheDocument();
		});

		vi.advanceTimersByTime(1000);
		rendered.queryByText('Load More')?.click();
		await waitFor(() => {
			expect(
				rendered.queryByText('Data: [[0,1,2],[10,11,12]]')
			).toBeInTheDocument();
			expect(rendered.queryByText('Has More: Yes')).toBeInTheDocument();
		});

		vi.advanceTimersByTime(1000);
		rendered.queryByText('Load More')?.click();
		await waitFor(() => {
			expect(
				rendered.queryByText('Data: [[0,1,2],[10,11,12],[20,21,22]]')
			).toBeInTheDocument();
			expect(rendered.queryByText('Has More: No')).toBeInTheDocument();
		});

		// this should not trigger another load (as there is no more data)
		rendered.queryByText('Load More')?.click();

		expect(states.value).toEqual([
			// Initial state
			{
				data: undefined,
				error: undefined,
				loading: true,
				hasMore: undefined,
				loadedTimeStamp: undefined,
				staleTimeStamp: undefined,
				enabled: true
			},
			// After loading first page
			{
				data: [[0, 1, 2]],
				error: undefined,
				loading: false,
				hasMore: true,
				loadedTimeStamp: mockDate.getTime(),
				staleTimeStamp: Infinity,
				enabled: true
			},
			// Loading more data
			{
				data: [[0, 1, 2]],
				error: undefined,
				loading: true,
				hasMore: undefined,
				loadedTimeStamp: mockDate.getTime(),
				staleTimeStamp: Infinity,
				enabled: true
			},
			// After loading second page
			{
				data: [
					[0, 1, 2],
					[10, 11, 12]
				],
				error: undefined,
				loading: false,
				hasMore: true,
				loadedTimeStamp: mockDate.getTime() + 1000,
				staleTimeStamp: Infinity,
				enabled: true
			},
			// Loading more data again
			{
				data: [
					[0, 1, 2],
					[10, 11, 12]
				],
				error: undefined,
				loading: true,
				hasMore: undefined,
				loadedTimeStamp: mockDate.getTime() + 1000,
				staleTimeStamp: Infinity,
				enabled: true
			},
			// After loading third page
			{
				data: [
					[0, 1, 2],
					[10, 11, 12],
					[20, 21, 22]
				],
				error: undefined,
				loading: false,
				hasMore: false,
				loadedTimeStamp: mockDate.getTime() + 2000,
				staleTimeStamp: Infinity,
				enabled: true
			}
			// No additional state change after clicking "Load More" again
		]);
	});

	test('Error while loading more data', async () => {
		vi.useFakeTimers();
		const mockDate = new Date(2025, 5, 11, 12, 0, 0);
		vi.setSystemTime(mockDate);

		const states = $state({ value: [] });
		const rendered = render(NoParam, {
			props: {
				states,
				key: ['load-more-error-test'],
				loadingFn: async (_, cursor = 0) => {
					if (cursor === 0) {
						return {
							success: true,
							data: [cursor, cursor + 1, cursor + 2],
							cursor: 10
						};
					} else {
						return {
							success: false,
							error: 'Error loading more data'
						};
					}
				}
			}
		});

		await waitFor(() => {
			expect(rendered.queryByText('Data: [[0,1,2]]')).toBeInTheDocument();
			expect(rendered.queryByText('Has More: Yes')).toBeInTheDocument();
		});

		vi.advanceTimersByTime(1000);
		rendered.queryByText('Load More')?.click();
		await waitFor(() => {
			expect(
				rendered.queryByText('Error: Error loading more data')
			).toBeInTheDocument();
		});

		expect(states.value).toEqual([
			// Initial state
			{
				data: undefined,
				error: undefined,
				loading: true,
				hasMore: undefined,
				loadedTimeStamp: undefined,
				staleTimeStamp: undefined,
				enabled: true
			},
			// After loading first page
			{
				data: [[0, 1, 2]],
				error: undefined,
				loading: false,
				hasMore: true,
				loadedTimeStamp: mockDate.getTime(),
				staleTimeStamp: Infinity,
				enabled: true
			},
			// Loading more data
			{
				data: [[0, 1, 2]],
				error: undefined,
				loading: true,
				hasMore: undefined,
				loadedTimeStamp: mockDate.getTime(),
				staleTimeStamp: Infinity,
				enabled: true
			},
			// After error in load more
			{
				data: [[0, 1, 2]],
				error: 'Error loading more data',
				loading: false,
				hasMore: true,
				loadedTimeStamp: mockDate.getTime(),
				staleTimeStamp: Infinity,
				enabled: true
			}
			// No additional state change after clicking "Load More" again
		]);
	});

	test('Reloading after multiple pages loaded returns to initial page', async () => {
		vi.useFakeTimers();
		const mockDate = new Date(2025, 5, 11, 12, 0, 0);
		vi.setSystemTime(mockDate);

		const states = $state({ value: [] });
		const rendered = render(NoParam, {
			props: {
				states,
				key: ['load-more-reload-test'],
				loadingFn: async (_, cursor = 0) => ({
					success: true,
					data: [cursor, cursor + 1, cursor + 2],
					cursor: cursor + 10
				})
			}
		});

		await waitFor(() => {
			expect(rendered.queryByText('Data: [[0,1,2]]')).toBeInTheDocument();
			expect(rendered.queryByText('Has More: Yes')).toBeInTheDocument();
		});

		vi.advanceTimersByTime(1000);
		rendered.queryByText('Load More')?.click();
		await waitFor(() => {
			expect(
				rendered.queryByText('Data: [[0,1,2],[10,11,12]]')
			).toBeInTheDocument();
			expect(rendered.queryByText('Has More: Yes')).toBeInTheDocument();
		});

		vi.advanceTimersByTime(1000);
		rendered.queryByText('Reload')?.click();
		await waitFor(() => {
			expect(rendered.queryByText('Data: [[0,1,2]]')).toBeInTheDocument();
			expect(rendered.queryByText('Has More: Yes')).toBeInTheDocument();
		});

		expect(states.value).toEqual([
			// Initial state
			{
				data: undefined,
				error: undefined,
				loading: true,
				hasMore: undefined,
				loadedTimeStamp: undefined,
				staleTimeStamp: undefined,
				enabled: true
			},
			// After loading first page
			{
				data: [[0, 1, 2]],
				error: undefined,
				loading: false,
				hasMore: true,
				loadedTimeStamp: mockDate.getTime(),
				staleTimeStamp: Infinity, // mockDate.getTime()
				enabled: true
			},
			// Loading more data
			{
				data: [[0, 1, 2]],
				error: undefined,
				loading: true,
				hasMore: undefined,
				loadedTimeStamp: mockDate.getTime(),
				staleTimeStamp: Infinity, // mockDate.getTime()
				enabled: true
			},
			// After loading second page
			{
				data: [
					[0, 1, 2],
					[10, 11, 12]
				],
				error: undefined,
				loading: false,
				hasMore: true,
				loadedTimeStamp: mockDate.getTime() + 1000,
				staleTimeStamp: Infinity, // mockDate.getTime() + 1000
				enabled: true
			},
			// Reloading data
			{
				data: [
					[0, 1, 2],
					[10, 11, 12]
				],
				error: undefined,
				loading: true,
				hasMore: undefined,
				loadedTimeStamp: mockDate.getTime() + 1000,
				staleTimeStamp: Infinity, // mockDate.getTime() + 1000
				enabled: true
			},
			// After reloading data
			{
				data: [[0, 1, 2]],
				error: undefined,
				loading: false,
				hasMore: true,
				loadedTimeStamp: mockDate.getTime() + 2000,
				staleTimeStamp: Infinity, // mockDate.getTime() + 2000
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
				key: ['load-more-reload-error-test'],
				loadingFn: async (_, cursor = 0) => {
					if (i < 2) {
						i = i + 1;
						return {
							success: true,
							data: [cursor, cursor + 1, cursor + 2],
							cursor: cursor + 10
						};
					} else {
						return {
							success: false,
							error: 'Error reloading data'
						};
					}
				}
			}
		});

		await waitFor(() => {
			expect(rendered.queryByText('Data: [[0,1,2]]')).toBeInTheDocument();
			expect(rendered.queryByText('Has More: Yes')).toBeInTheDocument();
		});

		vi.advanceTimersByTime(1000);
		rendered.queryByText('Load More')?.click();
		await waitFor(() => {
			expect(
				rendered.queryByText('Data: [[0,1,2],[10,11,12]]')
			).toBeInTheDocument();
			expect(rendered.queryByText('Has More: Yes')).toBeInTheDocument();
		});

		vi.advanceTimersByTime(1000);
		rendered.queryByText('Reload')?.click();
		await waitFor(() => {
			expect(
				rendered.queryByText('Error: Error reloading data')
			).toBeInTheDocument();
		});

		expect(states.value).toEqual([
			// Initial state
			{
				data: undefined,
				error: undefined,
				loading: true,
				hasMore: undefined,
				loadedTimeStamp: undefined,
				staleTimeStamp: undefined,
				enabled: true
			},
			// After loading first page
			{
				data: [[0, 1, 2]],
				error: undefined,
				loading: false,
				hasMore: true,
				loadedTimeStamp: mockDate.getTime(),
				staleTimeStamp: Infinity,
				enabled: true
			},
			// Loading more data
			{
				data: [[0, 1, 2]],
				error: undefined,
				loading: true,
				hasMore: undefined,
				loadedTimeStamp: mockDate.getTime(),
				staleTimeStamp: Infinity,
				enabled: true
			},
			// After loading second page
			{
				data: [
					[0, 1, 2],
					[10, 11, 12]
				],
				error: undefined,
				loading: false,
				hasMore: true,
				loadedTimeStamp: mockDate.getTime() + 1000,
				staleTimeStamp: Infinity,
				enabled: true
			},
			// Reloading data
			{
				data: [
					[0, 1, 2],
					[10, 11, 12]
				],
				error: undefined,
				loading: true,
				hasMore: undefined,
				loadedTimeStamp: mockDate.getTime() + 1000,
				staleTimeStamp: Infinity,
				enabled: true
			},
			// After error in reload
			{
				data: [
					[0, 1, 2],
					[10, 11, 12]
				],
				error: 'Error reloading data',
				loading: false,
				hasMore: true,
				loadedTimeStamp: mockDate.getTime() + 1000,
				staleTimeStamp: Infinity,
				enabled: true
			}
		]);
	});

	test('Concurrent loadMore only loads one page', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2025, 5, 11, 12, 0, 0));

		type Page = { success: true; data: number[]; cursor: number };
		const resolvers: ((page: Page) => void)[] = [];
		const mockLoadingFn = vi.fn(
			(_: void, cursor: number = 0) =>
				new Promise<Page>((resolve) => {
					resolvers.push(() =>
						resolve({
							success: true,
							data: [cursor],
							cursor: cursor + 10
						})
					);
				})
		);

		const states = $state({ value: [] });
		const rendered = render(NoParam, {
			props: {
				states,
				key: ['concurrent-load-more-test'],
				loadingFn: mockLoadingFn
			}
		});

		// Resolve the initial load
		await waitFor(() => expect(resolvers.length).toBe(1));
		resolvers[0]({ success: true, data: [0], cursor: 10 });
		await waitFor(() => {
			expect(rendered.queryByText('Data: [[0]]')).toBeInTheDocument();
		});

		// Click "Load More" twice while no load has resolved yet
		rendered.queryByText('Load More')?.click();
		rendered.queryByText('Load More')?.click();
		await vi.advanceTimersByTimeAsync(100);

		// Only one additional load was started
		expect(mockLoadingFn).toHaveBeenCalledTimes(2);

		resolvers[1]({ success: true, data: [10], cursor: 20 });
		await waitFor(() => {
			expect(rendered.queryByText('Data: [[0],[10]]')).toBeInTheDocument();
		});
	});

	test('Failed reload of all pages keeps the cursor consistent', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2025, 5, 11, 12, 0, 0));

		let callCount = 0;
		const states = $state({ value: [] });
		const rendered = render(NoParam, {
			props: {
				states,
				key: ['failed-reload-cursor-test'],
				loadingFn: async (_, cursor = 0) => {
					callCount++;
					// The 4th call is the second page of the invalidation reload
					if (callCount === 4) {
						return { success: false, error: 'reload failed' };
					}
					return { success: true, data: [cursor], cursor: cursor + 10 };
				}
			}
		});

		// Load two pages (cursor is now 20)
		await waitFor(() => {
			expect(rendered.queryByText('Data: [[0]]')).toBeInTheDocument();
		});
		rendered.queryByText('Load More')?.click();
		await waitFor(() => {
			expect(rendered.queryByText('Data: [[0],[10]]')).toBeInTheDocument();
		});

		// Invalidate: the reload of page 2 fails, previous data is kept
		vi.advanceTimersByTime(1000);
		invalidateQueries(['failed-reload-cursor-test']);
		await waitFor(() => {
			expect(rendered.queryByText('Error: reload failed')).toBeInTheDocument();
			expect(rendered.queryByText('Data: [[0],[10]]')).toBeInTheDocument();
		});

		// Loading more must continue after the kept pages (cursor 20),
		// not from the mid-reload cursor
		rendered.queryByText('Load More')?.click();
		await waitFor(() => {
			expect(rendered.queryByText('Data: [[0],[10],[20]]')).toBeInTheDocument();
		});
	});

	test('Reloading stops early when the data has shrunk', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2025, 5, 11, 12, 0, 0));

		let callCount = 0;
		const states = $state({ value: [] });
		const rendered = render(NoParam, {
			props: {
				states,
				key: ['shrunken-reload-test'],
				loadingFn: async (_, cursor = 0) => {
					callCount++;
					// First two calls: two pages exist
					if (callCount <= 2) {
						return { success: true, data: [cursor], cursor: cursor + 10 };
					}
					// After that, only a single page without more data
					return { success: true, data: [99], cursor: undefined };
				}
			}
		});

		// Load two pages
		await waitFor(() => {
			expect(rendered.queryByText('Data: [[0]]')).toBeInTheDocument();
		});
		rendered.queryByText('Load More')?.click();
		await waitFor(() => {
			expect(rendered.queryByText('Data: [[0],[10]]')).toBeInTheDocument();
		});

		// Invalidate: the first reloaded page has no more data, so the
		// second page is not fetched again (and not duplicated)
		vi.advanceTimersByTime(1000);
		invalidateQueries(['shrunken-reload-test']);
		await waitFor(() => {
			expect(rendered.queryByText('Data: [[99]]')).toBeInTheDocument();
			expect(rendered.queryByText('Has More: No')).toBeInTheDocument();
		});

		expect(callCount).toBe(3);
	});

	test('Invalidation during loadMore discards the page and reloads all pages', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2025, 5, 11, 12, 0, 0));

		type Page = { success: true; data: number[]; cursor: number };
		let pendingMoreResolve: ((page: Page) => void) | undefined;
		let loadCount = 0;
		const mockLoadingFn = vi.fn((_: void, cursor: number = 0) => {
			loadCount++;
			// The second call is the loadMore we keep in flight
			if (loadCount === 2) {
				return new Promise<Page>((resolve) => {
					pendingMoreResolve = resolve;
				});
			}
			return Promise.resolve({
				success: true as const,
				data: [cursor + loadCount * 100],
				cursor: cursor + 10
			});
		});

		const states = $state({ value: [] });
		const rendered = render(NoParam, {
			props: {
				states,
				key: ['cancel-load-more-test'],
				loadingFn: mockLoadingFn
			}
		});

		// First page loads (call 1)
		await waitFor(() => {
			expect(rendered.queryByText('Data: [[100]]')).toBeInTheDocument();
		});

		// Start a loadMore that stays in flight (call 2)
		rendered.queryByText('Load More')?.click();
		await vi.advanceTimersByTimeAsync(0);
		expect(mockLoadingFn).toHaveBeenCalledTimes(2);

		// Invalidate while the loadMore is in flight: it is cancelled and
		// all pages reload (call 3, one current page)
		invalidateQueries(['cancel-load-more-test']);
		await vi.advanceTimersByTimeAsync(0);
		expect(mockLoadingFn).toHaveBeenCalledTimes(3);

		// The cancelled loadMore resolves — its page must be discarded
		pendingMoreResolve?.({ success: true, data: [999], cursor: 99 });
		await waitFor(() => {
			expect(rendered.queryByText('Data: [[300]]')).toBeInTheDocument();
		});
		expect(rendered.queryByText('Data: [[100],[999]]')).not.toBeInTheDocument();

		// The cursor comes from the reload, not the cancelled loadMore:
		// loading more continues from cursor 10 (call 4)
		rendered.queryByText('Load More')?.click();
		await waitFor(() => {
			expect(rendered.queryByText('Data: [[300],[410]]')).toBeInTheDocument();
		});

		rendered.unmount();
	});

	test('loadMore does nothing when there is no more data', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2025, 5, 11, 12, 0, 0));

		const mockLoadingFn = vi.fn(async () => ({
			success: true as const,
			data: 'only page',
			cursor: undefined
		}));

		const states = $state({ value: [] });
		const rendered = render(NoParam, {
			props: {
				states,
				key: ['load-more-exhausted-test'],
				loadingFn: mockLoadingFn
			}
		});

		await waitFor(() => {
			expect(rendered.queryByText('Has More: No')).toBeInTheDocument();
		});
		expect(mockLoadingFn).toHaveBeenCalledTimes(1);

		// Load More must not trigger another load
		rendered.queryByText('Load More')?.click();
		await vi.advanceTimersByTimeAsync(100);

		expect(mockLoadingFn).toHaveBeenCalledTimes(1);
	});

	test('Reloads data from all pages when invalidated', async () => {
		vi.useFakeTimers();
		const mockDate = new Date(2025, 5, 11, 12, 0, 0);
		vi.setSystemTime(mockDate);

		let i = $state(0);
		const states = $state({ value: [] });
		const mockLoadingFn = vi.fn(async (_, cursor = 0) => {
			i = i + 1;
			if (i <= 3) {
				// 3 "normal" requests
				return {
					success: true as const,
					data: [cursor, cursor + 1, cursor + 2],
					cursor: cursor + 10
				};
			} else {
				// 3 "invalidated" requests
				return {
					success: true as const,
					data: [cursor + 3, cursor + 4, cursor + 5],
					cursor: cursor + 10
				};
			}
		});

		const rendered = render(NoParam, {
			props: {
				states: states,
				key: ['sequential-invalidate-test'],
				loadingFn: mockLoadingFn,
				queryOptions: {
					staleTime: 0
				}
			}
		});

		await waitFor(() => {
			expect(rendered.queryByText('Data: [[0,1,2]]')).toBeInTheDocument();
			expect(rendered.queryByText('Has More: Yes')).toBeInTheDocument();
		});

		vi.advanceTimersByTime(1000);
		rendered.queryByText('Load More')?.click();
		await waitFor(() => {
			expect(
				rendered.queryByText('Data: [[0,1,2],[10,11,12]]')
			).toBeInTheDocument();
			expect(rendered.queryByText('Has More: Yes')).toBeInTheDocument();
		});

		vi.advanceTimersByTime(1000);
		rendered.queryByText('Load More')?.click();
		await waitFor(() => {
			expect(
				rendered.queryByText('Data: [[0,1,2],[10,11,12],[20,21,22]]')
			).toBeInTheDocument();
			expect(rendered.queryByText('Has More: Yes')).toBeInTheDocument();
		});

		vi.advanceTimersByTime(1000);
		invalidateQueries(['sequential-invalidate-test']);
		await waitFor(() => {
			expect(rendered.queryByText('Loading: true')).toBeInTheDocument();
		});
		await waitFor(() => {
			expect(rendered.queryByText('Loading: false')).toBeInTheDocument();
		});

		expect(states.value).toEqual([
			// Initial state
			{
				data: undefined,
				error: undefined,
				loading: true,
				hasMore: undefined,
				loadedTimeStamp: undefined,
				staleTimeStamp: undefined,
				enabled: true
			},
			// After loading first page
			{
				data: [[0, 1, 2]],
				error: undefined,
				loading: false,
				hasMore: true,
				loadedTimeStamp: mockDate.getTime(),
				staleTimeStamp: mockDate.getTime(),
				enabled: true
			},
			// Loading more data
			{
				data: [[0, 1, 2]],
				error: undefined,
				loading: true,
				hasMore: undefined,
				loadedTimeStamp: mockDate.getTime(),
				staleTimeStamp: mockDate.getTime(),
				enabled: true
			},
			// After loading second page
			{
				data: [
					[0, 1, 2],
					[10, 11, 12]
				],
				error: undefined,
				loading: false,
				hasMore: true,
				loadedTimeStamp: mockDate.getTime() + 1000,
				staleTimeStamp: mockDate.getTime() + 1000,
				enabled: true
			},
			// Loading more data
			{
				data: [
					[0, 1, 2],
					[10, 11, 12]
				],
				error: undefined,
				loading: true,
				hasMore: undefined,
				loadedTimeStamp: mockDate.getTime() + 1000,
				staleTimeStamp: mockDate.getTime() + 1000,
				enabled: true
			},
			// After loading second page
			{
				data: [
					[0, 1, 2],
					[10, 11, 12],
					[20, 21, 22]
				],
				error: undefined,
				loading: false,
				hasMore: true,
				loadedTimeStamp: mockDate.getTime() + 2000,
				staleTimeStamp: mockDate.getTime() + 2000,
				enabled: true
			},
			// Invalidating data (at +3000 time)
			{
				data: [
					[0, 1, 2],
					[10, 11, 12],
					[20, 21, 22]
				],
				error: undefined,
				loading: true,
				hasMore: undefined,
				loadedTimeStamp: mockDate.getTime() + 2000,
				staleTimeStamp: mockDate.getTime() + 2999,
				enabled: true
			},
			// After reloading data from all pages
			{
				data: [
					[3, 4, 5],
					[13, 14, 15],
					[23, 24, 25]
				],
				error: undefined,
				loading: false,
				hasMore: true,
				loadedTimeStamp: mockDate.getTime() + 3000,
				staleTimeStamp: mockDate.getTime() + 3000,
				enabled: true
			}
		]);
	});
});

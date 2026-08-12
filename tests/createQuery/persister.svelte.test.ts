import { describe, expect, test, vi } from 'vitest';
import { render, waitFor } from '@testing-library/svelte/svelte5';

import {
	invalidateQueries,
	type LoadResult,
	type QueryPersister
} from '../../src/lib/index.ts';
import { dataByKey } from '../../src/lib/svelte-tiny-query/cache.svelte';
import NoParam from './NoParam.svelte';

// A synchronous in-memory persister, so tests can inspect the storage
function makePersister(initial?: Record<string, unknown>) {
	const storage = new Map<string, unknown>(Object.entries(initial ?? {}));
	const persister = {
		get: vi.fn((key: string[]) => storage.get(key.join('/'))),
		set: vi.fn((key: string[], data: unknown) => {
			storage.set(key.join('/'), data);
		}),
		remove: vi.fn((key: string[]) => {
			storage.delete(key.join('/'));
		})
	} satisfies QueryPersister<unknown>;
	return { storage, persister };
}

describe('Normal Query - persister Option', () => {
	test('Shows restored data while loading, then persists the fresh data', async () => {
		const { storage, persister } = makePersister({
			'persister-restore-test': 'persisted'
		});

		let resolveLoad: (result: LoadResult<unknown, unknown>) => void;
		const mockLoadingFn = vi.fn(
			() =>
				new Promise<LoadResult<unknown, unknown>>((resolve) => {
					resolveLoad = resolve;
				})
		);

		const states = $state({ value: [] });
		const rendered = render(NoParam, {
			props: {
				states,
				key: ['persister-restore-test'],
				loadingFn: mockLoadingFn,
				queryOptions: { persister }
			}
		});

		// The restored data is shown while the query is still loading
		await waitFor(() => {
			expect(rendered.queryByText('Data: persisted')).toBeInTheDocument();
		});
		expect(rendered.queryByText('Loading: true')).toBeInTheDocument();
		expect(persister.get).toHaveBeenCalledWith(['persister-restore-test']);

		// The load is not skipped and its data replaces the restored data
		resolveLoad!({ success: true, data: 'fresh' });
		await waitFor(() => {
			expect(rendered.queryByText('Data: fresh')).toBeInTheDocument();
		});
		expect(mockLoadingFn).toHaveBeenCalledTimes(1);

		// The fresh data was persisted
		expect(persister.set).toHaveBeenCalledWith(
			['persister-restore-test'],
			'fresh'
		);
		expect(storage.get('persister-restore-test')).toBe('fresh');

		// Remounting restores nothing (the data is still cached in memory)
		rendered.unmount();
		const states2 = $state({ value: [] });
		const rendered2 = render(NoParam, {
			props: {
				states: states2,
				key: ['persister-restore-test'],
				loadingFn: mockLoadingFn,
				queryOptions: { persister }
			}
		});
		await waitFor(() => {
			expect(rendered2.queryByText('Data: fresh')).toBeInTheDocument();
		});
		expect(persister.get).toHaveBeenCalledTimes(1);

		rendered2.unmount();
	});

	test('A persister without data leaves the query untouched', async () => {
		const { persister } = makePersister();

		const states = $state({ value: [] });
		const rendered = render(NoParam, {
			props: {
				states,
				key: ['persister-miss-test'],
				loadingFn: async () => ({ success: true as const, data: 'fresh' }),
				queryOptions: { persister, initialData: 'initial' }
			}
		});

		await waitFor(() => {
			expect(rendered.queryByText('Data: fresh')).toBeInTheDocument();
		});

		// The miss never stored anything, so initialData applied while loading
		const shownData = states.value.map(
			(state) => (state as { data: unknown }).data
		);
		expect(shownData).not.toContain(undefined);
		expect(shownData[0]).toBe('initial');

		rendered.unmount();
	});

	test('A slow restore never overwrites already loaded data', async () => {
		const { persister } = makePersister();
		let resolveGet: (value: unknown) => void;
		persister.get.mockImplementation(
			() =>
				new Promise((resolve) => {
					resolveGet = resolve;
				})
		);

		const states = $state({ value: [] });
		const rendered = render(NoParam, {
			props: {
				states,
				key: ['persister-slow-get-test'],
				loadingFn: async () => ({ success: true as const, data: 'fresh' }),
				queryOptions: { persister }
			}
		});

		await waitFor(() => {
			expect(rendered.queryByText('Data: fresh')).toBeInTheDocument();
		});

		// The restore resolves after the load has finished — it is discarded
		resolveGet!('persisted');
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(dataByKey['persister-slow-get-test']).toBe('fresh');

		rendered.unmount();
	});

	test('Force invalidation removes the persisted data', async () => {
		const { storage, persister } = makePersister();

		const states = $state({ value: [] });
		const rendered = render(NoParam, {
			props: {
				states,
				key: ['persister-remove-test'],
				loadingFn: async () => ({ success: true as const, data: 'fresh' }),
				queryOptions: { persister }
			}
		});

		await waitFor(() => {
			expect(rendered.queryByText('Data: fresh')).toBeInTheDocument();
		});
		expect(storage.get('persister-remove-test')).toBe('fresh');

		// A plain invalidation keeps the persisted data (and re-persists on
		// the reload that it triggers)
		invalidateQueries(['persister-remove-test']);
		await waitFor(() => {
			expect(rendered.queryByText('Loading: false')).toBeInTheDocument();
		});
		expect(persister.remove).not.toHaveBeenCalled();

		// A forced invalidation removes the persisted data
		invalidateQueries(['persister-remove-test'], { force: true });
		expect(persister.remove).toHaveBeenCalledWith(['persister-remove-test']);
		expect(storage.has('persister-remove-test')).toBe(false);

		rendered.unmount();
	});

	test('Persisted data is restored again after gc eviction', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2025, 5, 11, 12, 0, 0));

		const { storage, persister } = makePersister();

		const states = $state({ value: [] });
		const rendered = render(NoParam, {
			props: {
				states,
				key: ['persister-gc-test'],
				loadingFn: async () => ({ success: true as const, data: 'fresh' }),
				queryOptions: { persister, gcTime: 5000 }
			}
		});

		await waitFor(() => {
			expect(rendered.queryByText('Data: fresh')).toBeInTheDocument();
		});

		// After eviction, the memory cache is gone but the storage is not
		rendered.unmount();
		vi.advanceTimersByTime(5000);
		expect('persister-gc-test' in dataByKey).toBe(false);
		expect(storage.get('persister-gc-test')).toBe('fresh');

		// Using the query again restores the persisted data while it reloads
		let resolveLoad: (result: LoadResult<unknown, unknown>) => void;
		const states2 = $state({ value: [] });
		const rendered2 = render(NoParam, {
			props: {
				states: states2,
				key: ['persister-gc-test'],
				loadingFn: () =>
					new Promise((resolve) => {
						resolveLoad = resolve;
					}),
				queryOptions: { persister, gcTime: 5000 }
			}
		});

		await waitFor(() => {
			expect(rendered2.queryByText('Data: fresh')).toBeInTheDocument();
		});
		expect(rendered2.queryByText('Loading: true')).toBeInTheDocument();
		expect(persister.get).toHaveBeenCalledTimes(2);

		resolveLoad!({ success: true, data: 'fresher' });
		await waitFor(() => {
			expect(rendered2.queryByText('Data: fresher')).toBeInTheDocument();
		});

		rendered2.unmount();
		vi.useRealTimers();
	});

	test('A failing persister does not break the query', async () => {
		const consoleError = vi
			.spyOn(console, 'error')
			.mockImplementation(() => {});

		const persister: QueryPersister<unknown> = {
			get: () => Promise.reject(new Error('get failed')),
			set: () => {
				throw new Error('set failed');
			},
			remove: () => Promise.reject(new Error('remove failed'))
		};

		const states = $state({ value: [] });
		const rendered = render(NoParam, {
			props: {
				states,
				key: ['persister-failing-test'],
				loadingFn: async () => ({ success: true as const, data: 'fresh' }),
				queryOptions: { persister }
			}
		});

		// The query loads normally despite get and set failing
		await waitFor(() => {
			expect(rendered.queryByText('Data: fresh')).toBeInTheDocument();
		});
		expect(rendered.queryByText('Error:')).toBeInTheDocument();

		invalidateQueries(['persister-failing-test'], { force: true });

		// All failures were reported: get and set on the initial load,
		// remove on the invalidation, and set again on the forced reload
		await waitFor(() => {
			expect(consoleError).toHaveBeenCalledTimes(4);
		});

		rendered.unmount();
		consoleError.mockRestore();
	});
});

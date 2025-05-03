import { flushSync } from 'svelte';
import { beforeEach, afterEach, describe, expect, test, vi } from 'vitest';
import { createQuery } from './query.svelte.js';

async function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('query', () => {
	beforeEach(() => {
		vi.useFakeTimers({ toFake: ['queueMicrotask'] });
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	// test('initial state is empty and not loading', () => {
	// 	const cleanup = $effect.root(() => {
	// 		const mockFn = vi.fn(async () => {
	// 			await sleep(10);
	// 			return { success: true as const, data: [1, 2, 3] };
	// 		});

	// 		const numbersQuery = createQuery(['numbers'], mockFn);

	// 		const { query } = numbersQuery();

	// 		expect(mockFn).toHaveBeenCalledTimes(0);
	// 		expect(query.data).toEqual(undefined);
	// 		expect(query.error).toEqual(undefined);
	// 		expect(query.loading).toEqual(false);

	// 		flushSync();
	// 		expect(mockFn).toHaveBeenCalledTimes(1);
	// 	});

	// 	cleanup();
	// });

	test('immediately calls the loading function', () => {
		const cleanup = $effect.root(() => {
			const mockFn = vi.fn(() => {
				console.log('mockFn called');
			});
			const foo = vi.fn(async () => {
				console.log('foo called');
				mockFn();
				// await new Promise((resolve) => setTimeout(resolve, 10));
				// console.log('foo slept for 10ms');
				return { success: true as const, data: 42 };
			});

			const numbersQuery = createQuery(['numbers2'], foo);

			const { query } = numbersQuery();

			expect(mockFn).toHaveBeenCalledTimes(0);
			expect(query.data).toEqual(undefined);
			expect(query.error).toEqual(undefined);
			expect(query.loading).toEqual(false);

			vi.advanceTimersByTime(1);
			expect(mockFn).toHaveBeenCalledTimes(1);
			expect(query.data).toEqual(undefined);
			expect(query.error).toEqual(undefined);
			expect(query.loading).toEqual(true);

			vi.advanceTimersByTime(100);
			console.log('should have updated the data by now');
			expect(query.data).toEqual(42);
			// expect(query.error).toEqual(undefined);
			// expect(query.loading).toEqual(false);

			console.log('cleanup maybe?');
		});

		console.log('cleanup');
		cleanup();
	});
});

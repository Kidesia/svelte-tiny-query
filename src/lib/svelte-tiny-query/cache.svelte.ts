import { untrack } from 'svelte';

type TreeNode<T> = {
	__value?: T;
	__refCount?: number;
	__timestamp?: number;
} & {
	[K in Exclude<string, '__value'>]?: TreeNode<T>;
};

/**
 * Create a nested cache object, where the key represents a path to a value.
 * @param name The name of the cache (for debugging).
 * @returns The cache object.
 */
export default function (name: string = 'cache') {
	const cache: TreeNode<unknown> = $state({});

	/**
	 * Set a value in the cache.
	 * @param key The path of the value.
	 * @param value The value
	 * @returns void
	 */
	function setValue(key: string[], value: unknown): void {
		let current = cache;
		let i = 0;

		while (i < key.length && key[i] in current) {
			current = current[key[i]]!;
			i++;
		}

		if (i < key.length) {
			const newBranch: TreeNode<unknown> = {};
			let temp = newBranch;
			for (let j = i; j < key.length; j++) {
				temp[key[j]] = {};
				temp = temp[key[j]] as TreeNode<unknown>;
			}

			temp.__refCount = 1;
			temp.__value = value;
			temp.__timestamp = Date.now();

			current[key[i]] = newBranch[key[i]];
		} else {
			untrack(() => {
				current.__refCount = (current.__refCount ?? 0) + 1;
			});
			current.__value = value;
		}
	}

	/**
	 * Get a value from the cache.
	 * @param key The path of the value.
	 * @returns The value, or undefined if not found.
	 */
	function getValue(key: string[]): unknown {
		let current = cache;

		for (const part of key) {
			if (!(part in current)) {
				return undefined;
			}
			current = current[part]!;
		}

		return current.__value;
	}

	/**
	 * Remove a value from the cache.
	 * @param key The path of the value.
	 * @param force If true, the value will be removed even if it has a refCount.
	 * @returns void
	 */
	function removeValue(key: string[], force = false): void {
		console.log(name, key, '💾 remove cache');
		let current = cache;

		for (const part of key) {
			if (!(part in current)) {
				return;
			}
			current = current[part]!;
		}

		if (!force && current.__refCount) {
			current.__refCount--;
			if (current.__refCount === 0) {
				console.log(name, key, '💾 actually remove');
				delete current.__value;
			} else {
				console.log(name, key, '💾 decrement refCount');
			}
		} else {
			delete current.__value;
		}
	}

	/**
	 * Get the values of all values from the path and below.
	 * @param key The root path of the values.
	 * @returns The values.
	 */
	function getValues(key: string[]): unknown[] {
		let current = cache;

		for (const part of key) {
			if (!(part in current)) {
				return [];
			}
			current = current[part]!;
		}

		const values: unknown[] = [];

		function collectValues(node: TreeNode<unknown>): void {
			if (node.__value !== undefined) {
				values.push(node.__value);
			}

			for (const key in node) {
				if (key !== '__value') {
					const childNode = node[key];
					if (childNode) {
						collectValues(childNode);
					}
				}
			}
		}

		collectValues(current);
		return values;
	}

	return {
		cache,
		setValue,
		getValue,
		getValues,
		removeValue
	};
}

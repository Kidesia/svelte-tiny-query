import { describe, expect, test } from 'vitest';

import {
	serializeParam,
	generateCacheKey,
	KEY_SEPARATOR
} from '../../src/lib/svelte-tiny-query/utils.ts';

describe('serializeParam', () => {
	test('returns empty string for null', () => {
		expect(serializeParam(null)).toBe('');
	});

	test('returns empty string for undefined', () => {
		expect(serializeParam(undefined)).toBe('');
	});

	test('serializes number', () => {
		expect(serializeParam(42)).toBe('42');
	});

	test('serializes zero (falsy number)', () => {
		expect(serializeParam(0)).toBe('0');
	});

	test('serializes string', () => {
		expect(serializeParam('hello')).toBe('"hello"');
	});

	test('serializes empty string (falsy)', () => {
		expect(serializeParam('')).toBe('""');
	});

	test('serializes boolean true', () => {
		expect(serializeParam(true)).toBe('true');
	});

	test('serializes boolean false (falsy)', () => {
		expect(serializeParam(false)).toBe('false');
	});

	test('serializes flat object', () => {
		expect(serializeParam({ id: 1, name: 'test' })).toBe(
			'{"id":1,"name":"test"}'
		);
	});

	test('produces same output regardless of key insertion order', () => {
		const a = serializeParam({ z: 1, a: 2, m: 3 });
		const b = serializeParam({ a: 2, m: 3, z: 1 });
		const c = serializeParam({ m: 3, z: 1, a: 2 });
		expect(a).toBe(b);
		expect(b).toBe(c);
		expect(a).toBe('{"a":2,"m":3,"z":1}');
	});

	test('serializes nested objects', () => {
		const result = serializeParam({ filter: { status: 'active' }, page: 1 });
		expect(result).toBe('{"filter":{"status":"active"},"page":1}');
	});

	test('serializes arrays', () => {
		expect(serializeParam([1, 2, 3])).toBe('[1,2,3]');
	});

	test('serializes array of objects', () => {
		expect(serializeParam([{ a: 1 }, { b: 2 }])).toBe('[{"a":1},{"b":2}]');
	});

	test('produces same key for nested objects with different key order (deep-sort)', () => {
		const a = serializeParam({ filter: { z: 1, a: 2 }, page: 1 });
		const b = serializeParam({ filter: { a: 2, z: 1 }, page: 1 });
		// BUG: only top-level keys are sorted, nested object keys are not
		expect(a).toBe(b);
	});

	test('produces same key for deeply nested objects with different key order', () => {
		const a = serializeParam({ level1: { level2: { z: 'last', a: 'first' } } });
		const b = serializeParam({ level1: { level2: { a: 'first', z: 'last' } } });
		expect(a).toBe(b);
	});

	test('distinguishes different nested values', () => {
		const a = serializeParam({ filter: { status: 'active' } });
		const b = serializeParam({ filter: { status: 'archived' } });
		expect(a).not.toBe(b);
	});

	test('distinguishes null from string "null"', () => {
		expect(serializeParam(null)).not.toBe(serializeParam('null'));
	});
});

describe('generateCacheKey', () => {
	test('returns base key when param is undefined', () => {
		expect(generateCacheKey(['todos'], undefined)).toBe('todos');
	});

	test('returns base key when param is null', () => {
		expect(generateCacheKey(['todos'], null)).toBe('todos');
	});

	test('appends serialized object param', () => {
		expect(generateCacheKey(['todos'], { id: 1 })).toBe(
			['todos', '{"id":1}'].join(KEY_SEPARATOR)
		);
	});

	test('appends serialized primitive param (number)', () => {
		expect(generateCacheKey(['todos'], 5)).toBe(
			['todos', '5'].join(KEY_SEPARATOR)
		);
	});

	test('appends serialized primitive param (string)', () => {
		expect(generateCacheKey(['todos'], 'abc')).toBe(
			['todos', '"abc"'].join(KEY_SEPARATOR)
		);
	});

	test('does NOT drop falsy param 0', () => {
		expect(generateCacheKey(['todos'], 0)).toBe(
			['todos', '0'].join(KEY_SEPARATOR)
		);
	});

	test('does NOT drop falsy param empty string', () => {
		expect(generateCacheKey(['todos'], '')).toBe(
			['todos', '""'].join(KEY_SEPARATOR)
		);
	});

	test('does NOT drop falsy param false', () => {
		expect(generateCacheKey(['todos'], false)).toBe(
			['todos', 'false'].join(KEY_SEPARATOR)
		);
	});

	test('works with multi-segment base key', () => {
		expect(generateCacheKey(['api', 'v2', 'todos'], { id: 1 })).toBe(
			['api', 'v2', 'todos', '{"id":1}'].join(KEY_SEPARATOR)
		);
	});

	test('uses dynamic key function', () => {
		const keyFn = (param: { id: number }) => ['todos', `item-${param.id}`];
		expect(generateCacheKey(keyFn, { id: 42 })).toBe(
			['todos', 'item-42'].join(KEY_SEPARATOR)
		);
	});

	test('dynamic key function receives the param', () => {
		const keyFn = (param: number) => ['page', String(param)];
		expect(generateCacheKey(keyFn, 3)).toBe(['page', '3'].join(KEY_SEPARATOR));
	});

	test('produces different keys for different params', () => {
		const key1 = generateCacheKey(['todos'], { id: 1 });
		const key2 = generateCacheKey(['todos'], { id: 2 });
		expect(key1).not.toBe(key2);
	});

	test('key for "todo" does not collide with "todoList"', () => {
		const todoKey = generateCacheKey(['todo'], undefined);
		const todoListKey = generateCacheKey(['todoList'], undefined);
		expect(todoListKey.startsWith(todoKey + KEY_SEPARATOR)).toBe(false);
		expect(todoKey).not.toBe(todoListKey);
	});
});

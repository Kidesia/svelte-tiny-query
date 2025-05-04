import { describe, expect, test } from 'vitest';
import { render, waitFor } from '@testing-library/svelte/svelte5';

import BaseExample from './BaseExample.svelte';
import ControlsExample from './ControlsExample.svelte';

describe('createQuery', () => {
	test('Return the correct states for a successful query', async () => {
		const states = $state({
			value: []
		});

		const rendered = render(BaseExample, {
			props: {
				states,
				key: ['successful-test'],
				loadingFn: async () => ({ success: true, data: 'payload' })
			}
		});

		await waitFor(() => {
			expect(rendered.queryByText('Data: payload')).toBeInTheDocument();
		});

		expect(states.value).toHaveLength(3);

		expect(states.value[0]).toMatchObject({
			data: undefined,
			error: undefined,
			loading: false
		});

		expect(states.value[1]).toMatchObject({
			data: undefined,
			error: undefined,
			loading: true
		});

		expect(states.value[2]).toMatchObject({
			data: 'payload',
			error: undefined,
			loading: false
		});
	});

	test('Return the correct states for a failed query', async () => {
		const states = $state({
			value: []
		});

		const rendered = render(BaseExample, {
			props: {
				states,
				key: ['failed-test'],
				loadingFn: async () => ({ success: false, error: 'oopsie' })
			}
		});

		await waitFor(() => {
			expect(rendered.queryByText('Error: oopsie')).toBeInTheDocument();
		});

		expect(states.value).toHaveLength(3);

		expect(states.value[0]).toMatchObject({
			data: undefined,
			error: undefined,
			loading: false
		});

		expect(states.value[1]).toMatchObject({
			data: undefined,
			error: undefined,
			loading: true
		});

		expect(states.value[2]).toMatchObject({
			data: undefined,
			error: 'oopsie',
			loading: false
		});
	});

	test('Reloads data when param changes', async () => {
		const states = $state({
			value: []
		});

		const rendered = render(ControlsExample, {
			props: {
				states,
				key: ['param-example'],
				loadingFn: async (param: { id: number }) => ({
					success: true,
					data: `id is ${param.id}`
				})
			}
		});

		await waitFor(() => {
			expect(rendered.queryByText('Data: id is 1')).toBeInTheDocument();
		});

		rendered.queryByText('Increment')?.click();

		await waitFor(() => {
			expect(rendered.queryByText('Data: id is 2')).toBeInTheDocument();
		});

		expect(states.value).toHaveLength(5);

		expect(states.value[0]).toMatchObject({
			data: undefined,
			error: undefined,
			loading: false
		});

		expect(states.value[1]).toMatchObject({
			data: undefined,
			error: undefined,
			loading: true
		});

		expect(states.value[2]).toMatchObject({
			data: 'id is 1',
			error: undefined,
			loading: false
		});

		expect(states.value[3]).toMatchObject({
			data: undefined,
			error: undefined,
			loading: true
		});

		expect(states.value[4]).toMatchObject({
			data: 'id is 2',
			error: undefined,
			loading: false
		});
	});

	test('Shows data from cache when it already has it', async () => {
		const states = $state({
			value: []
		});

		const rendered = render(ControlsExample, {
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

		rendered.queryByText('Increment')?.click();

		await waitFor(() => {
			expect(rendered.queryByText('Data: id is 2')).toBeInTheDocument();
		});

		rendered.queryByText('Decrement')?.click();

		await waitFor(() => {
			expect(rendered.queryByText('Data: id is 1')).toBeInTheDocument();
		});

		expect(states.value).toHaveLength(7);

		expect(states.value[0]).toMatchObject({
			data: undefined,
			error: undefined,
			loading: false
		});

		expect(states.value[1]).toMatchObject({
			data: undefined,
			error: undefined,
			loading: true
		});

		expect(states.value[2]).toMatchObject({
			data: 'id is 1',
			error: undefined,
			loading: false
		});

		expect(states.value[3]).toMatchObject({
			data: undefined,
			error: undefined,
			loading: true
		});

		expect(states.value[4]).toMatchObject({
			data: 'id is 2',
			error: undefined,
			loading: false
		});

		expect(states.value[5]).toMatchObject({
			data: 'id is 1',
			error: undefined,
			loading: true
		});

		expect(states.value[6]).toMatchObject({
			data: 'id is 1',
			error: undefined,
			loading: false
		});
	});
});

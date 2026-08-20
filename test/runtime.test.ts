// SPDX-License-Identifier: Apache-2.0

import { __, getLocaleData } from '@wordpress/i18n'
import { expect, test } from 'vitest'

import { displayLocale, startLocale } from '../src/index.js'
import type { Catalog } from '../src/index.js'

const CATALOG: Catalog = {
	'': { lang: 'es-ES', 'plural-forms': 'nplurals=2; plural=(n != 1);' },
	'Older posts': ['Entradas anteriores'],
}

test('answers the locale its resolver settles on', async () => {
	const settled = await startLocale(async () => 'es-ES', [])

	expect(settled).toBe('es-ES')
})

test('remembers the settled locale for display', async () => {
	await startLocale(async () => 'es-ES', [])

	expect(displayLocale()).toBe('es-ES')
})

test('sets a loaded catalogue under its domain before returning', async () => {
	await startLocale(async () => 'es-ES', [
		{ domain: 'gottext-probe', load: async () => CATALOG },
	])

	expect(getLocaleData('gottext-probe')['']).toBeDefined()
	expect(__('Older posts', 'gottext-probe')).toBe('Entradas anteriores')
})

test('leaves a domain untouched when its loader answers nothing', async () => {
	await startLocale(async () => 'es-ES', [
		{ domain: 'gottext-empty', load: async () => undefined },
	])

	expect(__('Older posts', 'gottext-empty')).toBe('Older posts')
})

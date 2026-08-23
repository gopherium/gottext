// SPDX-License-Identifier: Apache-2.0

import { __, setLocaleData } from '@wordpress/i18n'
import { expect, test } from 'vitest'

import { displayLocale, rememberLocale } from '../src/index.js'
import type { Catalog } from '../src/index.js'
import { resetLocale } from '../src/testing.js'

const CATALOG: Catalog = {
	'': { lang: 'es-ES', 'plural-forms': 'nplurals=2; plural=(n != 1);' },
	'Older posts': ['Entradas anteriores'],
}

test('takes the loaded domains back to their sources', () => {
	setLocaleData(CATALOG, 'gottext-reset-probe')
	rememberLocale('es-ES')

	resetLocale('en-US', ['gottext-reset-probe'])

	expect(__('Older posts', 'gottext-reset-probe')).toBe('Older posts')
	expect(displayLocale()).toBe('en-US')
})

test('resets the default domain and locale without arguments', () => {
	setLocaleData(CATALOG)
	rememberLocale('es-ES')

	resetLocale()

	expect(__('Older posts')).toBe('Older posts')
	expect(displayLocale()).toBe('en-US')
})

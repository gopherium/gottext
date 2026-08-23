// SPDX-License-Identifier: Apache-2.0

import { resetLocaleData } from '@wordpress/i18n'

import { rememberLocale } from './display.js'

/**
 * Takes every named domain and the default one back to their sources between tests.
 * @param defaultLocale - The locale to settle back on, en-US absent a choice.
 * @param domains - The text domains a test suite loaded catalogues under.
 */
export function resetLocale(defaultLocale = 'en-US', domains: string[] = []): void {
	for (const domain of domains) {
		resetLocaleData({}, domain)
	}
	resetLocaleData({})
	rememberLocale(defaultLocale)
}

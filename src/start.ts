// SPDX-License-Identifier: Apache-2.0

import { setLocaleData } from '@wordpress/i18n'

import { rememberLocale } from './display.js'

/** Catalog is one compiled gettext catalogue as setLocaleData consumes it. */
export type Catalog = Record<string, string[] | Record<string, string>>

/** CatalogEntry names one text domain beside how its catalogue loads. */
export interface CatalogEntry {
	/** domain is the text domain the catalogue answers, the default domain when absent. */
	domain?: string
	/** load answers the catalogue for a locale, or nothing when none ships for it. */
	load: (locale: string) => Promise<Catalog | undefined>
}

/**
 * Resolves the locale, loads every catalogue in parallel, and sets each under its domain.
 * @param resolve - Answers the locale the interface should stand in.
 * @param entries - The text domains to load.
 * @returns The settled locale.
 */
export async function startLocale(
	resolve: () => Promise<string>,
	entries: CatalogEntry[],
): Promise<string> {
	const locale = await resolve()
	rememberLocale(locale)
	const loaded = await Promise.all(entries.map((entry) => entry.load(locale)))
	entries.forEach((entry, at) => {
		const catalog = loaded[at]
		if (catalog !== undefined) {
			setLocaleData(catalog, entry.domain)
		}
	})
	return locale
}

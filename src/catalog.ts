// SPDX-License-Identifier: Apache-2.0

/** Catalog is one compiled gettext catalogue as setLocaleData consumes it. */
export type Catalog = Record<string, string[] | Record<string, string>>

/** METADATA is the entry carrying a catalogue's headers rather than a message. */
export const METADATA = ''

/**
 * Returns the key a message waits under, its context and message joined.
 * @param context - The context telling two senses of one word apart, if any.
 * @param msgid - The source message.
 * @returns The lookup key.
 */
export function keyOf(context: string, msgid: string): string {
	return context === '' ? msgid : `${context}${msgid}`
}

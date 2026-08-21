// SPDX-License-Identifier: Apache-2.0

/** Catalog is one compiled gettext catalogue as setLocaleData consumes it. */
export type Catalog = Record<string, string[] | Record<string, string>>

/** METADATA is the entry carrying a catalogue's headers rather than a message. */
export const METADATA = ''

/**
 * Returns the entry a table holds under a key, ignoring anything it inherits.
 * @param table - The table to read, or nothing when the catalogue lacks it.
 * @param key - The key to look under.
 * @returns The entry, or nothing when the table holds none of its own.
 */
export function held<T>(table: Record<string, T> | undefined, key: string): T | undefined {
	return table !== undefined && Object.hasOwn(table, key) ? table[key] : undefined
}

/**
 * Returns the key a message waits under, its context and message joined.
 * @param context - The context telling two senses of one word apart, if any.
 * @param msgid - The source message.
 * @returns The lookup key.
 */
export function keyOf(context: string, msgid: string): string {
	return context === '' ? msgid : `${context}${msgid}`
}

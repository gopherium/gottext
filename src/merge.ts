// SPDX-License-Identifier: Apache-2.0

import { po } from 'gettext-parser'
import type { GetTextTranslation, GetTextTranslations } from 'gettext-parser'

import { METADATA } from './catalog.js'

/** COMPILED is how every catalogue this brick writes is laid out. */
const COMPILED = { foldLength: 0, eol: '\n' } as const

/**
 * Returns the language a platform code names, in the casing a catalogue file uses.
 * @param code - The code as the platform writes it.
 * @returns The language, with its region upper cased.
 */
export function localeOf(code: string): string {
	const [language, region] = code.split('-')
	return region === undefined ? language : `${language}-${region.toUpperCase()}`
}

/**
 * Returns the language the site knows a platform code as, if it knows one.
 * @param code - The language as the platform names it.
 * @param supported - The languages the site answers in.
 * @returns The site's own name for it, or nothing when it answers in no such language.
 */
export function localeFor(code: string, supported: string[]): string | undefined {
	if (supported.includes(code)) {
		return code
	}
	if (code.includes('-')) {
		return undefined
	}
	const doubled = localeOf(`${code}-${code}`)
	return supported.includes(doubled) ? doubled : undefined
}

/**
 * Returns how many messages a catalogue answers.
 * @param source - The catalogue as PO text.
 * @returns The count of messages carrying a translation.
 */
export function translated(source: string): number {
	let held = 0
	for (const entries of Object.values(po.parse(source).translations)) {
		for (const [msgid, entry] of Object.entries(entries)) {
			if (msgid !== METADATA && entry.msgstr.some((form) => form !== '')) {
				held += 1
			}
		}
	}
	return held
}

/**
 * Returns how many translated forms a catalogue carries.
 * @param source - The catalogue as PO text.
 * @returns The count of answered forms across every message.
 */
export function answeredForms(source: string): number {
	let held = 0
	for (const entries of Object.values(po.parse(source).translations)) {
		for (const [msgid, entry] of Object.entries(entries)) {
			if (msgid !== METADATA) {
				held += entry.msgstr.filter((form) => form !== '').length
			}
		}
	}
	return held
}

/**
 * Returns an incoming catalogue under the plural rule the committed one declares.
 * @param current - The catalogue as committed.
 * @param incoming - The catalogue the platform exported.
 * @returns The incoming catalogue, carrying the committed plural rule and no form beyond it.
 */
export function withPluralRuleOf(current: string, incoming: string): string {
	const rule = po.parse(current).headers['Plural-Forms']
	if (rule === undefined) {
		return incoming
	}
	const held = po.parse(incoming)
	held.headers['Plural-Forms'] = rule
	const counted = /nplurals\s*=\s*(\d+)/.exec(rule)
	const forms = counted === null ? 0 : Number(counted[1])
	if (forms < 1) {
		throw new Error('the committed catalogue declares a plural rule naming no usable count')
	}
	for (const entries of Object.values(held.translations)) {
		for (const entry of Object.values(entries)) {
			if (entry.msgstr.length > forms) {
				entry.msgstr = entry.msgstr.slice(0, forms)
			}
		}
	}
	return po.compile(held, COMPILED).toString()
}

/**
 * Returns an incoming catalogue without any message the template does not name.
 * @param incoming - The catalogue the platform exported.
 * @param template - The template naming every message the catalogue may carry.
 * @returns The incoming catalogue, trimmed to the template.
 */
export function namedByTemplate(incoming: string, template: string): string {
	const named = po.parse(template).translations
	const held = po.parse(incoming)
	for (const [context, entries] of Object.entries(held.translations)) {
		for (const msgid of Object.keys(entries)) {
			if (msgid !== METADATA && named[context]?.[msgid] === undefined) {
				delete held.translations[context][msgid]
			}
		}
	}
	return po.compile(held, COMPILED).toString()
}

/**
 * Returns the forms a catalogue keeps, taking each answered form over an empty one.
 * @param ours - The forms as committed.
 * @param theirs - The forms the platform exported.
 * @returns The forms, answered wherever either side answers them.
 */
function mergedForms(ours: string[], theirs: string[]): string[] {
	const held: string[] = []
	for (let at = 0; at < Math.max(ours.length, theirs.length); at += 1) {
		const arrived = theirs[at] ?? ''
		held.push(arrived === '' ? (ours[at] ?? '') : arrived)
	}
	return held
}

/**
 * Writes one committed answer into a catalogue that arrived without every form of it.
 * @param held - The catalogue the platform exported, as parsed.
 * @param context - The context the answer sits under.
 * @param msgid - The message the answer belongs to.
 * @param entry - The committed answer.
 */
function restoring(
	held: GetTextTranslations,
	context: string,
	msgid: string,
	entry: GetTextTranslation,
): void {
	const arrived = held.translations[context]?.[msgid]
	if (arrived === undefined) {
		held.translations[context] ??= {}
		held.translations[context][msgid] = entry
		return
	}
	arrived.msgid_plural ??= entry.msgid_plural
	arrived.msgstr = mergedForms(entry.msgstr, arrived.msgstr)
}

/**
 * Returns an incoming catalogue restoring every committed answer it lost.
 * @param current - The catalogue as committed.
 * @param incoming - The catalogue the platform exported.
 * @param template - The template naming every message the catalogue may carry.
 * @returns The incoming catalogue, keeping each committed form the export holds empty or lacks.
 */
export function keepingAnswers(current: string, incoming: string, template: string): string {
	const named = po.parse(template).translations
	const ours = po.parse(current).translations
	const held = po.parse(incoming)
	for (const [context, entries] of Object.entries(ours)) {
		for (const [msgid, entry] of Object.entries(entries)) {
			const wanted = msgid !== METADATA && named[context]?.[msgid] !== undefined
			if (wanted && entry.msgstr.some((form) => form !== '')) {
				restoring(held, context, msgid, entry)
			}
		}
	}
	return po.compile(held, COMPILED).toString()
}

/** Answers is what one language's export carries, keyed by context and message. */
type Answers = Record<string, Record<string, string[]>>

/**
 * Returns the translations a catalogue holds, without the headers an export restamps.
 * @param source - The catalogue as PO text.
 * @returns The translations, keyed by context and message.
 */
function answersOf(source: string): Answers {
	const held: Answers = {}
	for (const [context, entries] of Object.entries(po.parse(source).translations).sort()) {
		held[context] = {}
		for (const [msgid, entry] of Object.entries(entries).sort()) {
			if (msgid !== METADATA) {
				held[context][msgid] = entry.msgstr
			}
		}
	}
	return held
}

/**
 * Reports whether an incoming catalogue says anything the current one does not.
 * @param current - The catalogue as committed, or nothing when none is committed yet.
 * @param incoming - The catalogue the platform exported.
 * @returns True when a translation differs, false when only the export stamp moved.
 */
export function meaningfulChange(current: string | undefined, incoming: string): boolean {
	if (current === undefined) {
		return true
	}
	return JSON.stringify(answersOf(current)) !== JSON.stringify(answersOf(incoming))
}

/**
 * Returns how many messages a template names.
 * @param source - The template as POT text.
 * @returns The count of named messages.
 */
export function namedMessages(source: string): number {
	let held = 0
	for (const entries of Object.values(po.parse(source).translations)) {
		for (const msgid of Object.keys(entries)) {
			if (msgid !== METADATA) {
				held += 1
			}
		}
	}
	return held
}

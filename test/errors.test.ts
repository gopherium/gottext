// SPDX-License-Identifier: Apache-2.0

import { expect, test } from 'vitest'

import { errorText } from '../src/index.js'

const TEMPLATES = {
	first_out_of_range: 'Ask for between %(min)d and %(max)d at a time.',
	name_taken: 'That name is already taken.',
	locale_unknown: 'AlphOne does not speak %(wanted)s yet.',
}

const FALLBACK = 'Something went wrong. Try again.'

test('fills the template its code names with the data the answer carries', () => {
	const shown = errorText(
		{ message: 'graph: first must be between 1 and 200', code: 'first_out_of_range', meta: { min: 1, max: 200 } },
		TEMPLATES,
		FALLBACK,
	)

	expect(shown).toBe('Ask for between 1 and 200 at a time.')
})

test('shows a template naming no values as it stands', () => {
	const shown = errorText({ message: 'fields: name taken', code: 'name_taken' }, TEMPLATES, FALLBACK)

	expect(shown).toBe('That name is already taken.')
})

test('speaks the answer when no template holds its code', () => {
	const shown = errorText(
		{ message: 'the server said something new', code: 'a_code_from_the_future' },
		TEMPLATES,
		FALLBACK,
	)

	expect(shown).toBe('the server said something new')
})

test('speaks the answer when it names no code at all', () => {
	const shown = errorText({ message: 'the server answered 500' }, TEMPLATES, FALLBACK)

	expect(shown).toBe('the server answered 500')
})

test('speaks the answer when the template asks for a value the answer lacks', () => {
	const shown = errorText(
		{ message: 'graph: first must be between 1 and 200', code: 'first_out_of_range', meta: { min: 1 } },
		TEMPLATES,
		FALLBACK,
	)

	expect(shown).toBe('graph: first must be between 1 and 200')
})

test('speaks the answer when the template asks for values and none arrived', () => {
	const shown = errorText({ message: 'locale refused', code: 'locale_unknown' }, TEMPLATES, FALLBACK)

	expect(shown).toBe('locale refused')
})

test('falls back to the words the caller supplied when the answer says nothing', () => {
	const shown = errorText({ message: '' }, TEMPLATES, FALLBACK)

	expect(shown).toBe(FALLBACK)
})

test('prefers a filled template over an answer that says nothing', () => {
	const shown = errorText({ message: '', code: 'name_taken' }, TEMPLATES, FALLBACK)

	expect(shown).toBe('That name is already taken.')
})

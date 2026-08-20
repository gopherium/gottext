// SPDX-License-Identifier: Apache-2.0

import { expect, test, vi } from 'vitest'

import {
	answeredForms,
	keepingAnswers,
	localeFor,
	localeOf,
	meaningfulChange,
	namedByTemplate,
	poeditorAt,
	syncTranslations,
	translated,
	withPluralRuleOf,
} from '../src/sync.js'
import type { Catalogues, Poeditor } from '../src/sync.js'

const HEADER = `msgid ""
msgstr ""
"Language: es-ES\\n"
"Plural-Forms: nplurals=2; plural=(n != 1);\\n"
`

const TEMPLATE = 'msgid "Older posts"\nmsgstr ""\n'

/**
 * Returns a catalogue carrying one translation.
 * @param msgstr - The translation the catalogue holds.
 * @returns The catalogue as PO text.
 */
function catalogue(msgstr: string): string {
	return `${HEADER}\nmsgid "Older posts"\nmsgstr "${msgstr}"\n`
}

/**
 * Returns a platform answering with the given languages and exports.
 * @param languages - The languages the platform lists.
 * @param exports - The catalogue each language exports, keyed by platform name.
 * @returns The platform.
 */
function platformOf(languages: string[], exports: Record<string, string>): Poeditor {
	return {
		languages: async () => languages,
		exportPo: async (named: string) => exports[named] ?? '',
		uploadTerms: async () => {},
	}
}

/**
 * Returns a catalogue store over the given committed sources.
 * @param committed - The catalogues already committed, keyed by locale.
 * @returns The store and the writes it received.
 */
function storeOf(committed: Record<string, string> = {}): {
	held: Catalogues
	written: Record<string, string>
} {
	const written: Record<string, string> = {}
	return {
		held: {
			read: (locale: string) => committed[locale],
			write: (locale: string, source: string) => {
				written[locale] = source
			},
		},
		written,
	}
}

test('reads a language the platform names in its own casing', () => {
	expect(localeOf('es-es')).toBe('es-ES')
	expect(localeOf('es')).toBe('es')
})

test('matches a language named exactly as the site names it', () => {
	expect(localeFor('es-ES', ['en-US', 'es-ES'])).toBe('es-ES')
})

test('matches a bare language to its doubled region', () => {
	expect(localeFor('es', ['en-US', 'es-ES'])).toBe('es-ES')
	expect(localeFor('es', ['es-ES', 'es-MX'])).toBe('es-ES')
})

test('refuses a bare language whose doubled region the site does not answer in', () => {
	expect(localeFor('pt', ['en-US', 'pt-BR'])).toBeUndefined()
})

test('refuses a region the site does not answer in', () => {
	expect(localeFor('es-MX', ['en-US', 'es-ES'])).toBeUndefined()
})

test('counts the messages and the forms a catalogue answers', () => {
	const held = `${HEADER}
msgid "%(count)d post"
msgid_plural "%(count)d posts"
msgstr[0] "%(count)d entrada"
msgstr[1] ""

msgid "Older posts"
msgstr "Entradas anteriores"
`

	expect(translated(held)).toBe(2)
	expect(answeredForms(held)).toBe(2)
})

test('keeps the plural rule the committed catalogue declares', () => {
	const ours = `msgid ""\nmsgstr ""\n"Plural-Forms: nplurals=2; plural=(n != 1);\\n"\n`
	const theirs = `msgid ""
msgstr ""
"Plural-Forms: nplurals=3; plural=(n==1 ? 0 : n==2 ? 1 : 2);\\n"

msgid "%(count)d post"
msgid_plural "%(count)d posts"
msgstr[0] "%(count)d entrada"
msgstr[1] "%(count)d entradas"
msgstr[2] ""
`

	const held = withPluralRuleOf(ours, theirs)

	expect(held).toContain('nplurals=2')
	expect(held).not.toMatch(/msgstr\[2\]/)
})

test('refuses a committed rule naming no usable count', () => {
	const ours = 'msgid ""\nmsgstr ""\n"Plural-Forms: plural=(n != 1);\\n"\n'
	const theirs = 'msgid ""\nmsgstr ""\n\nmsgid "Older posts"\nmsgstr "Entradas anteriores"\n'

	expect(() => withPluralRuleOf(ours, theirs)).toThrow(/count/)
	expect(() => withPluralRuleOf(ours.replace('plural=', 'nplurals=0; plural='), theirs))
		.toThrow(/count/)
})

test('takes the platform plural rule when the catalogue declares none', () => {
	const ours = 'msgid ""\nmsgstr ""\n"Language: es-ES\\n"\n'
	const theirs = 'msgid ""\nmsgstr ""\n"Plural-Forms: nplurals=2; plural=(n != 1);\\n"\n'

	expect(withPluralRuleOf(ours, theirs)).toBe(theirs)
})

test('drops a message the template does not name', () => {
	const theirs = `${HEADER}\nmsgid "Older posts"\nmsgstr "Entradas anteriores"\n\nmsgid "Retired"\nmsgstr "Retirado"\n`

	expect(namedByTemplate(theirs, TEMPLATE)).not.toContain('Retirado')
})

test('keeps a committed answer the export holds empty', () => {
	const ours = 'msgid ""\nmsgstr ""\n\nmsgid "Older posts"\nmsgstr "Entradas anteriores"\n'
	const theirs = 'msgid ""\nmsgstr ""\n\nmsgid "Older posts"\nmsgstr ""\n'

	expect(keepingAnswers(ours, theirs, TEMPLATE)).toContain('Entradas anteriores')
})

test('keeps a plural form the export holds empty', () => {
	const naming = 'msgid "%(count)d post"\nmsgid_plural "%(count)d posts"\nmsgstr[0] ""\nmsgstr[1] ""\n'
	const ours = `msgid ""
msgstr ""

msgid "%(count)d post"
msgid_plural "%(count)d posts"
msgstr[0] "%(count)d entrada"
msgstr[1] "%(count)d entradas"
`
	const theirs = `msgid ""
msgstr ""

msgid "%(count)d post"
msgid_plural "%(count)d posts"
msgstr[0] "%(count)d entrada"
msgstr[1] ""
`

	expect(keepingAnswers(ours, theirs, naming)).toContain('%(count)d entradas')
})

test('keeps every committed form when the export flattens the entry', () => {
	const naming = 'msgid "%(count)d post"\nmsgid_plural "%(count)d posts"\nmsgstr[0] ""\nmsgstr[1] ""\n'
	const ours = `msgid ""
msgstr ""
"Plural-Forms: nplurals=2; plural=(n != 1);\\n"

msgid "%(count)d post"
msgid_plural "%(count)d posts"
msgstr[0] "una entrada"
msgstr[1] "varias entradas"
`
	const theirs = `msgid ""
msgstr ""
"Plural-Forms: nplurals=2; plural=(n != 1);\\n"

msgid "%(count)d post"
msgstr "una entrada"
`

	const held = keepingAnswers(ours, theirs, naming)

	expect(held).toContain('varias entradas')
	expect(held).toContain('msgid_plural')
})

test('keeps committed forms the export stops short of', () => {
	const naming = 'msgid "%(count)d post"\nmsgid_plural "%(count)d posts"\nmsgstr[0] ""\nmsgstr[1] ""\n'
	const ours = `msgid ""
msgstr ""

msgid "%(count)d post"
msgid_plural "%(count)d posts"
msgstr[0] "una entrada"
msgstr[1] "varias entradas"
`
	const theirs = `msgid ""
msgstr ""

msgid "%(count)d post"
msgid_plural "%(count)d posts"
msgstr[0] "la entrada"
`

	const held = keepingAnswers(ours, theirs, naming)

	expect(held).toContain('la entrada')
	expect(held).toContain('varias entradas')
})

test('leaves a form empty that neither catalogue answers', () => {
	const naming = 'msgid "%(count)d post"\nmsgid_plural "%(count)d posts"\nmsgstr[0] ""\nmsgstr[1] ""\n'
	const ours = `msgid ""
msgstr ""

msgid "%(count)d post"
msgid_plural "%(count)d posts"
msgstr[0] "una entrada"
`
	const theirs = `msgid ""
msgstr ""

msgid "%(count)d post"
msgid_plural "%(count)d posts"
msgstr[0] "la entrada"
msgstr[1] ""
`

	const held = keepingAnswers(ours, theirs, naming)

	expect(held).toContain('la entrada')
	expect(held).toMatch(/msgstr\[1\] ""/)
})

test('takes an incoming answer over the committed one', () => {
	const ours = 'msgid ""\nmsgstr ""\n\nmsgid "Older posts"\nmsgstr "Entradas anteriores"\n'
	const theirs = 'msgid ""\nmsgstr ""\n\nmsgid "Older posts"\nmsgstr "Entradas antiguas"\n'

	const held = keepingAnswers(ours, theirs, TEMPLATE)

	expect(held).toContain('Entradas antiguas')
	expect(held).not.toContain('Entradas anteriores')
})

test('restores an answer the export omits entirely', () => {
	const naming = 'msgid "Older posts"\nmsgstr ""\n\nmsgid "Newer posts"\nmsgstr ""\n'
	const ours = 'msgid ""\nmsgstr ""\n\nmsgid "Older posts"\nmsgstr "Entradas anteriores"\n'
	const theirs = 'msgid ""\nmsgstr ""\n\nmsgid "Newer posts"\nmsgstr "Entradas nuevas"\n'

	const held = keepingAnswers(ours, theirs, naming)

	expect(held).toContain('Entradas anteriores')
	expect(held).toContain('Entradas nuevas')
})

test('restores an answer under a context the export does not know', () => {
	const naming = 'msgctxt "posts"\nmsgid "Older"\nmsgstr ""\n'
	const ours = 'msgid ""\nmsgstr ""\n\nmsgctxt "posts"\nmsgid "Older"\nmsgstr "Antiguas"\n'
	const theirs = 'msgid ""\nmsgstr ""\n'

	expect(keepingAnswers(ours, theirs, naming)).toContain('Antiguas')
})

test('does not restore an answer the template no longer names', () => {
	const ours = 'msgid ""\nmsgstr ""\n\nmsgid "Retired"\nmsgstr "Retirado"\n'
	const theirs = 'msgid ""\nmsgstr ""\n\nmsgid "Older posts"\nmsgstr "Entradas anteriores"\n'

	expect(keepingAnswers(ours, theirs, TEMPLATE)).not.toContain('Retirado')
})

test('reports a change only when a translation moved', () => {
	const same = catalogue('Entradas anteriores')

	expect(meaningfulChange(same, same)).toBe(false)
	expect(meaningfulChange(same, catalogue('Entradas antiguas'))).toBe(true)
	expect(meaningfulChange(undefined, same)).toBe(true)
})

test('asks the platform under its own name and writes under the site locale', async () => {
	const platform = platformOf(['es'], { es: catalogue('Entradas anteriores') })
	const { held, written } = storeOf()

	const done = await syncTranslations(platform, ['en-US', 'es-ES'], held, TEMPLATE)

	expect(Object.keys(written)).toEqual(['es-ES'])
	expect(done.moved).toEqual(['es-ES'])
})

test('skips a language the site does not answer in', async () => {
	const platform = platformOf(['fr'], { fr: catalogue('Articles plus anciens') })
	const { held, written } = storeOf()

	const done = await syncTranslations(platform, ['en-US', 'es-ES'], held, TEMPLATE)

	expect(written).toEqual({})
	expect(done.skipped[0]).toContain('fr')
})

test('skips a language nobody has translated yet', async () => {
	const bare = `${HEADER}\nmsgid "Older posts"\nmsgstr ""\n`
	const platform = platformOf(['es'], { es: bare })
	const { held, written } = storeOf()

	const done = await syncTranslations(platform, ['en-US', 'es-ES'], held, TEMPLATE)

	expect(written).toEqual({})
	expect(done.skipped[0]).toContain('nobody has translated')
})

test('writes nothing when the platform says what the catalogue already says', async () => {
	const same = catalogue('Entradas anteriores')
	const platform = platformOf(['es'], { es: same })
	const { held, written } = storeOf({ 'es-ES': same })

	const done = await syncTranslations(platform, ['en-US', 'es-ES'], held, TEMPLATE)

	expect(written).toEqual({})
	expect(done.moved).toEqual([])
})

test('never lowers the answers a catalogue holds, and says how many it kept', async () => {
	const naming = 'msgid "Older posts"\nmsgstr ""\n\nmsgid "Newer posts"\nmsgstr ""\n'
	const theirs = `${HEADER}\nmsgid "Older posts"\nmsgstr ""\n\nmsgid "Newer posts"\nmsgstr "Entradas nuevas"\n`
	const platform = platformOf(['es'], { es: theirs })
	const { held, written } = storeOf({ 'es-ES': catalogue('Entradas anteriores') })

	const done = await syncTranslations(platform, ['en-US', 'es-ES'], held, naming)

	expect(written['es-ES']).toContain('Entradas nuevas')
	expect(written['es-ES']).toContain('Entradas anteriores')
	expect(done.kept[0]).toContain('1')
})

test('sends the template before asking what the platform holds', async () => {
	const order: string[] = []
	const platform: Poeditor = {
		languages: async () => {
			order.push('languages')
			return []
		},
		exportPo: async () => '',
		uploadTerms: async () => {
			order.push('upload')
		},
	}
	const { held } = storeOf()

	await syncTranslations(platform, ['en-US'], held, TEMPLATE)

	expect(order).toEqual(['upload', 'languages'])
})

/**
 * Returns a fetch answering the platform's success envelope.
 * @param result - The result the platform answers with.
 * @returns The fetch stub.
 */
function answering(result: unknown): typeof fetch {
	return vi.fn(async () =>
		new Response(JSON.stringify({ response: { status: 'success' }, result }), { status: 200 }),
	) as unknown as typeof fetch
}

test('names the upload after the domain it carries', async () => {
	const sent: FormData[] = []
	const fetched = vi.fn(async (_url: string, init?: RequestInit) => {
		sent.push(init?.body as FormData)
		return new Response(JSON.stringify({ response: { status: 'success' }, result: {} }))
	}) as unknown as typeof fetch

	await poeditorAt({ token: 't', project: 'p', domain: 'probe', fetched }).uploadTerms(TEMPLATE)

	expect((sent[0].get('file') as File).name).toBe('probe.pot')
	expect(sent[0].get('updating')).toBe('terms')
	expect(sent[0].get('sync_terms')).toBeNull()
})

test('lists the languages a project carries', async () => {
	const platform = poeditorAt({
		token: 't',
		project: 'p',
		domain: 'probe',
		fetched: answering({ languages: [{ code: 'es' }, { code: 'fr-ca' }] }),
	})

	expect(await platform.languages()).toEqual(['es', 'fr-CA'])
})

test('refuses a platform answer that reports a failure', async () => {
	const fetched = vi.fn(async () =>
		new Response(JSON.stringify({ response: { status: 'fail', message: 'no' } })),
	) as unknown as typeof fetch

	await expect(poeditorAt({ token: 't', project: 'p', domain: 'probe', fetched }).languages())
		.rejects.toThrow(/refused/)
})

test('reads a platform answer carrying no result at all', async () => {
	const fetched = vi.fn(async () =>
		new Response(JSON.stringify({ response: { status: 'success' } })),
	) as unknown as typeof fetch

	const held = await poeditorAt({ token: 't', project: 'p', domain: 'probe', fetched }).languages()

	expect(held).toEqual([])
})

test('names no reason when the platform refused without one', async () => {
	const fetched = vi.fn(async () =>
		new Response(JSON.stringify({ response: { status: 'fail' } })),
	) as unknown as typeof fetch

	await expect(poeditorAt({ token: 't', project: 'p', domain: 'probe', fetched }).languages())
		.rejects.toThrow(/no reason given/)
})

test('sends through the runtime fetch unless it is handed one', async () => {
	vi.stubGlobal('fetch', vi.fn(async () =>
		new Response(JSON.stringify({ response: { status: 'success' }, result: { languages: [] } })),
	))

	const held = await poeditorAt({ token: 't', project: 'p', domain: 'probe' }).languages()

	expect(held).toEqual([])
	vi.unstubAllGlobals()
})

test('refuses a platform answer that did not arrive', async () => {
	const fetched = vi.fn(async () => new Response('', { status: 500 })) as unknown as typeof fetch

	await expect(poeditorAt({ token: 't', project: 'p', domain: 'probe', fetched }).languages())
		.rejects.toThrow(/500/)
})

test('refuses to retire with a template naming no messages', async () => {
	const platform = poeditorAt({
		token: 't',
		project: 'p',
		domain: 'probe',
		fetched: answering({}),
	})

	await expect(platform.retireTerms('msgid ""\nmsgstr ""\n')).rejects.toThrow(/no messages/)
})

test('reports how many terms a retirement deleted', async () => {
	const platform = poeditorAt({
		token: 't',
		project: 'p',
		domain: 'probe',
		fetched: answering({ terms: { deleted: 3 } }),
	})

	expect(await platform.retireTerms(TEMPLATE)).toBe(3)
})

test('reports no deletion when the platform names none', async () => {
	const platform = poeditorAt({
		token: 't',
		project: 'p',
		domain: 'probe',
		fetched: answering({}),
	})

	expect(await platform.retireTerms(TEMPLATE)).toBe(0)
})

test('downloads the export the platform prepared', async () => {
	const fetched = vi.fn(async (url: string) =>
		url.includes('export')
			? new Response(JSON.stringify({
				response: { status: 'success' },
				result: { url: 'https://example.com/es.po' },
			}))
			: new Response(catalogue('Entradas anteriores')),
	) as unknown as typeof fetch

	const held = await poeditorAt({ token: 't', project: 'p', domain: 'probe', fetched })
		.exportPo('es-ES')

	expect(held).toContain('Entradas anteriores')
})

test('refuses an export the platform named no address for', async () => {
	const platform = poeditorAt({
		token: 't',
		project: 'p',
		domain: 'probe',
		fetched: answering({}),
	})

	await expect(platform.exportPo('es-ES')).rejects.toThrow(/no export/)
})

test('refuses an export that could not be downloaded', async () => {
	const fetched = vi.fn(async (url: string) =>
		url.includes('export')
			? new Response(JSON.stringify({
				response: { status: 'success' },
				result: { url: 'https://example.com/es.po' },
			}))
			: new Response('', { status: 404 }),
	) as unknown as typeof fetch

	await expect(poeditorAt({ token: 't', project: 'p', domain: 'probe', fetched }).exportPo('es-ES'))
		.rejects.toThrow(/404/)
})

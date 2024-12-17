const xlsx = require('@e965/xlsx')
const path = require('path')
const fs = require('fs')

const { cleanup_part_of_speech, read_xlsx_sheet } = require('./helper')

/**
 * @typedef { Object.<string, EtymologyWord> } PonishEtymology
 */
/**
 * @typedef { object } EtymologyWord
 * @property { string } etymology
 * @property { string? } credit
 * @property { string? } description
 * @property { string? } note
 */

/**
 * @param { string } changelog_path
 * @param { string } etymology_data_path
 * @param { string } dictionary_json_path
 */
async function create_etymology_json(changelog_path, etymology_data_path, dictionary_json_path) {
	const xlsx_changelog = xlsx.readFile(changelog_path)

	const PONISH_ETYMOLOGY /** @type { PonishEtymology } */ = {}

	// Convert existing etymology to new format
	const input_etymology = JSON.parse(fs.readFileSync(path.join(etymology_data_path, 'original.json')))
	for (const WORD of Object.keys(input_etymology)) {
		const ENTRY = input_etymology[WORD]

		PONISH_ETYMOLOGY[WORD] = {
			etymology: ENTRY.etymology,
			credit: ENTRY.credit,
			description: ENTRY.description,
			note: ENTRY.note,
			speech: ENTRY.speech,
		}
	}

	/**
	 * @typedef { object } NewWord
	 * @property { string } "Old Ponish"
	 * @property { string } Translation
	 * @property { string } "Part of Speech"
	 * @property { string } Notes
	 * @property { string } Etymology
	 */
	/** @type { NewWord[] } */
	const NEW_WORDS = xlsx.utils.sheet_to_json(xlsx_changelog.Sheets['New Words'])
	for (const NEW_WORD of NEW_WORDS) {
		const word = NEW_WORD['Old Ponish']

		if (PONISH_ETYMOLOGY[word]) {
			const ENTRY = PONISH_ETYMOLOGY[word]

			ENTRY.etymology = NEW_WORD.Etymology
		} else {
			const ENTRY /** @type { Etymology } */ = {}

			ENTRY.etymology = NEW_WORD.Etymology

			PONISH_ETYMOLOGY[word] = ENTRY
		}

		if (!PONISH_ETYMOLOGY[word].speech && NEW_WORD['Part of Speech']) {
			PONISH_ETYMOLOGY[word].speech = NEW_WORD['Part of Speech'].split(', ').map(cleanup_part_of_speech)
		}
	}

	apply_dictionary_speech(PONISH_ETYMOLOGY, dictionary_json_path)
	apply_hackd_speech(PONISH_ETYMOLOGY, path.join(etymology_data_path, 'hackd_etymology.txt'))
	apply_changelog_113_speech(PONISH_ETYMOLOGY, path.join(etymology_data_path, '1_13_changelog.xlsx'))
	apply_changelog_114_speech(PONISH_ETYMOLOGY, path.join(etymology_data_path, '1_14_changelog.xlsx'))

	apply_additional_patch(PONISH_ETYMOLOGY, path.join(etymology_data_path, 'patches.json'))

	apply_maple_patch(PONISH_ETYMOLOGY, path.join(etymology_data_path, 'maple.ety1.txt'))
	apply_maple_patch(PONISH_ETYMOLOGY, path.join(etymology_data_path, 'maple.ety2.txt'))
	apply_maple_patch(PONISH_ETYMOLOGY, path.join(etymology_data_path, 'maple.ety3.txt'))

	for (const word of Object.keys(PONISH_ETYMOLOGY)) {
		const info = PONISH_ETYMOLOGY[word]

		if (info.speech) {
			PONISH_ETYMOLOGY[word].speech = info.speech.map(cleanup_part_of_speech)
		}
	}

	return Object.keys(PONISH_ETYMOLOGY)
		.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
		.reduce((tbl, key) => {
			tbl[key] = PONISH_ETYMOLOGY[key]
			return tbl
		}, {})
}

function apply_dictionary_speech(etymology, dictionary_path) {
	const DICTIONARY = JSON.parse(fs.readFileSync(dictionary_path, 'utf-8'))

	for (const word of Object.keys(DICTIONARY)) {
		if (etymology[word] && DICTIONARY[word].speech) {
			etymology[word].speech = DICTIONARY[word].speech
		}
	}
}
function apply_hackd_speech(etymology, hackd_path) {
	const lines = fs.readFileSync(hackd_path, 'utf-8').split('\n')

	for (const line of lines) {
		if (/.+\(.+\).+\|.+/.test(line)) {
			const match = line.match(/(.+)\((.+)\).+\|.+/)
			const word = match[1].trim()
			const pos = match[2].split(',').map(cleanup_part_of_speech)

			if (etymology[word]) {
				etymology[word].speech = pos
			}
		}
	}
}
/**
 * @typedef { object } ChangelogEntry
 * @property { string } "Old Ponish"
 * @property { string } "Part of Speech"
 * @property { string } Translation
 * @property { string? } Notes
 * @property { string } Etymology
 */
function apply_changelog_113_speech(etymology, changelog_path) {
	/** @type { ChangelogEntry } */
	const data = read_xlsx_sheet(changelog_path, 'New Words')

	for (const entry of data) {
		const pos = entry['Part of Speech'].split(',').map(cleanup_part_of_speech)

		if (etymology[entry['Old Ponish']]) {
			etymology[entry['Old Ponish']].speech = pos
		}
	}
}
function apply_changelog_114_speech(etymology, changelog_path) {
	/** @type { ChangelogEntry } */
	const data = read_xlsx_sheet(changelog_path, 'New Words')

	for (const entry of data) {
		if (!entry['Part of Speech']) continue
		const pos = entry['Part of Speech'].split(',').map(cleanup_part_of_speech)

		if (etymology[entry['Old Ponish']]) {
			etymology[entry['Old Ponish']].speech = pos
		}
	}
}

/**
 * @typedef { object } PatchEntry
 * @property { string } etymology
 * @property { string } credit
 */

/**
 * @param { string } patch_path
 */
function apply_additional_patch(etymology, patch_path) {
	/** @type { Object.<string, PatchEntry> } */
	const data = JSON.parse(fs.readFileSync(patch_path, 'utf-8'))

	for (const entry of Object.keys(data)) {
		etymology[entry] = data[entry]
	}
}

/**
 * @param { string } patch_path
 */
function apply_maple_patch(etymology, patch_path) {
	/** @type { Array<string> } */
	const data = fs.readFileSync(patch_path, 'utf-8').split('\n').filter(x => !!x.trim())

	for (const entry of data) {
		const [words, ...info_array] = entry.split(';')
		const info = info_array.join(';').trim()

		for(const word of words.split('/')) {
			etymology[word] = {
				etymology: info,
				credit: 'maple'
			}
		}
	}
}

module.exports = {
	create_etymology_json,
}

import { readFile, utils } from '@e965/xlsx'
import { join } from 'path'
import { readFileSync } from 'fs'

import { cleanup_part_of_speech, read_xlsx_sheet } from './helper'

type PonishEtymology = { [key: string]: EtymologyWord }

type EtymologyWord = {
	etymology: string
	credit?: string
	description?: string
	speech?: string[]
	note?: string
}

export async function create_etymology_json(changelog_path: string, etymology_data_path: string, dictionary_json_path: string) {
	const xlsx_changelog = readFile(changelog_path)

	const PONISH_ETYMOLOGY: PonishEtymology = {}

	// Convert existing etymology to new format
	const input_etymology = JSON.parse(readFileSync(join(etymology_data_path, 'original.json'), 'utf-8'))
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

	type NewWord = {
		"Old Ponish": string,
		"Translation": string
		"Part of Speech": string,
		"Notes": string,
		"Etymology": string,
	}

	const NEW_WORDS: NewWord[] = utils.sheet_to_json(xlsx_changelog.Sheets['New Words']!)
	for (const NEW_WORD of NEW_WORDS) {
		const word = NEW_WORD['Old Ponish']

		if (PONISH_ETYMOLOGY[word]) {
			const ENTRY = PONISH_ETYMOLOGY[word]

			ENTRY.etymology = NEW_WORD.Etymology
		} else {
			const ENTRY: EtymologyWord = {
				etymology: NEW_WORD.Etymology
			}

			PONISH_ETYMOLOGY[word] = ENTRY
		}

		if (!PONISH_ETYMOLOGY[word].speech && NEW_WORD['Part of Speech']) {
			PONISH_ETYMOLOGY[word].speech = NEW_WORD['Part of Speech'].split(', ').map(cleanup_part_of_speech)
		}
	}

	apply_dictionary_speech(PONISH_ETYMOLOGY, dictionary_json_path)
	apply_hackd_speech(PONISH_ETYMOLOGY, join(etymology_data_path, 'hackd_etymology.txt'))
	apply_changelog_113_speech(PONISH_ETYMOLOGY, join(etymology_data_path, '1_13_changelog.xlsx'))
	apply_changelog_114_speech(PONISH_ETYMOLOGY, join(etymology_data_path, '1_14_changelog.xlsx'))

	apply_additional_patch(PONISH_ETYMOLOGY, join(etymology_data_path, 'patches.json'))

	apply_maple_patch(PONISH_ETYMOLOGY, join(etymology_data_path, 'maple.ety1.txt'))
	apply_maple_patch(PONISH_ETYMOLOGY, join(etymology_data_path, 'maple.ety2.txt'))
	apply_maple_patch(PONISH_ETYMOLOGY, join(etymology_data_path, 'maple.ety3.txt'))

	for (const word of Object.keys(PONISH_ETYMOLOGY)) {
		const info = PONISH_ETYMOLOGY[word]

		if (info?.speech) {
			PONISH_ETYMOLOGY[word]!.speech = info.speech.map(cleanup_part_of_speech)
		}
	}

	return Object.keys(PONISH_ETYMOLOGY)
		.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
		.reduce((tbl: any, key) => {
			tbl[key] = PONISH_ETYMOLOGY[key]
			return tbl
		}, {})
}

function apply_dictionary_speech(etymology: PonishEtymology, dictionary_path: string) {
	const DICTIONARY = JSON.parse(readFileSync(dictionary_path, 'utf-8'))

	for (const word of Object.keys(DICTIONARY)) {
		if (etymology[word] && DICTIONARY[word].speech) {
			etymology[word].speech = DICTIONARY[word].speech
		}
	}
}
function apply_hackd_speech(etymology: PonishEtymology, hackd_path: string) {
	const lines = readFileSync(hackd_path, 'utf-8').split('\n')

	for (const line of lines) {
		if (/.+\(.+\).+\|.+/.test(line)) {
			const match = line.match(/(.+)\((.+)\).+\|.+/)
			if(!match) continue

			const word = match[1]!.trim()
			const pos = match[2]!.split(',').map(cleanup_part_of_speech)

			if (etymology[word]) {
				etymology[word].speech = pos
			}
		}
	}
}

type ChangelogEntry = {
	"Old Ponish": string,
	"Part of Speech": string,
	"Translation": string,
	"Notes"?: string
	"Etymology": string
}

function apply_changelog_113_speech(etymology: PonishEtymology, changelog_path: string) {
	const data: ChangelogEntry[] = read_xlsx_sheet(changelog_path, 'New Words') as ChangelogEntry[]

	for (const entry of data) {
		const pos = entry['Part of Speech'].split(',').map(cleanup_part_of_speech)

		if (etymology[entry['Old Ponish']]) {
			etymology[entry['Old Ponish']]!.speech = pos
		}
	}
}
function apply_changelog_114_speech(etymology: PonishEtymology, changelog_path: string) {
	const data: ChangelogEntry[] = read_xlsx_sheet(changelog_path, 'New Words') as ChangelogEntry[]

	for (const entry of data) {
		if (!entry['Part of Speech']) continue
		const pos = entry['Part of Speech'].split(',').map(cleanup_part_of_speech)

		if (etymology[entry['Old Ponish']]) {
			etymology[entry['Old Ponish']]!.speech = pos
		}
	}
}

type PatchEntry = {
 etymology: string
 credit: string
}

function apply_additional_patch(etymology: PonishEtymology, patch_path: string) {
	const data: { [key: string]: PatchEntry } = JSON.parse(readFileSync(patch_path, 'utf-8'))

	for (const entry of Object.keys(data)) {
		etymology[entry] = data[entry]!
	}
}

function apply_maple_patch(etymology: PonishEtymology, patch_path: string) {
	const data: string[] = readFileSync(patch_path, 'utf-8').split('\n').filter(x => !!x.trim())

	for (const entry of data) {
		const [words, ...info_array] = entry.split(';')
		const info = info_array.join(';').trim()

		for(const word of words!.split('/')) {
			etymology[word] = {
				etymology: info,
				credit: 'maple'
			}
		}
	}
}

export default {
	create_etymology_json,
}

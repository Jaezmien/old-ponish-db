import xlsx from '@e965/xlsx'
import { handle_similar_word, cleanup_part_of_speech } from './helper'

export async function create_dictionary_json(dictionary_path: string) {
	const xlsx_dictionary = xlsx.readFile(dictionary_path)

	type VocabularyRecord = {
		"Old Ponish": string,
		"English": string,
		"Part of Speech": string,
		"Note"?: string
	}

	type PonishDictionary = { [key: string]: DictionaryWord }

	type DictionaryWord = {
		definition: string
		note?: string
		speech?: string[]
		similar?: string[]
		nsfw?: DictionaryNSFW
		character?: DictionaryCharacter
	}

	type DictionaryNSFW = {
		definition: string
		reason?: DictionaryNSFWReason
	}
	type DictionaryNSFWReason = {
		in_universe: string
		out_universe: string
	}
	type DictionaryCharacter = {
		english?: string
		justification?: string
	}

	const PONISH_DICTIONARY: PonishDictionary = {}

	// Vocabulary
	const VOCABULARY_SHEET: VocabularyRecord[] = xlsx.utils.sheet_to_json(xlsx_dictionary.Sheets['Vocabulary']!)
	for (const VOCAB_WORD of VOCABULARY_SHEET) {
		handle_similar_word(VOCAB_WORD['Old Ponish'], PONISH_DICTIONARY, (word, similars, entry: DictionaryWord) => {
			entry.definition = VOCAB_WORD.English
			entry.note = VOCAB_WORD.Note
			entry.speech = VOCAB_WORD['Part of Speech']
				? VOCAB_WORD['Part of Speech'].split(/[,|;]/g).map((pos) => cleanup_part_of_speech(pos))
				: undefined

			entry.similar = similars
		})
	}

	// Prefix
	type PrefixRecord = {
		Prefix: string
		Meaning: string
		Note?: string
	}
	const PREFIX_SHEET: PrefixRecord[] = xlsx.utils.sheet_to_json(xlsx_dictionary.Sheets['Prefixes']!)
	for (const PREFIX_WORD of PREFIX_SHEET) {
		handle_similar_word(PREFIX_WORD.Prefix, PONISH_DICTIONARY, (word, similar, entry: DictionaryWord) => {
			entry.definition = PREFIX_WORD.Meaning
			entry.note = PREFIX_WORD.Note
			entry.speech = ['prefix']
			entry.similar = similar
		})
	}

	// Suffix
	type SuffixRecord = Omit<PrefixRecord, 'Prefix'> & {
		Suffix: string
	}
	const SUFFIX_SHEET: SuffixRecord[] = xlsx.utils.sheet_to_json(xlsx_dictionary.Sheets['Suffixes']!)
	for (const SUFFIX_WORD of SUFFIX_SHEET) {
		handle_similar_word(SUFFIX_WORD.Suffix, PONISH_DICTIONARY, (word, similar, entry: DictionaryWord) => {
			entry.definition = SUFFIX_WORD.Meaning
			entry.note = SUFFIX_WORD.Note
			entry.speech = ['suffix']
			entry.similar = similar
		})
	}
	// Prepositions
	type PrepositionRecord = {
        Word: string
        Definition: string
        Notes?: string
    }
	const PREPOSITION_SHEET: PrepositionRecord[] = xlsx.utils.sheet_to_json(xlsx_dictionary.Sheets['Prepositions']!)
	for (const PREPOSITION_WORD of PREPOSITION_SHEET) {
		handle_similar_word(PREPOSITION_WORD.Word, PONISH_DICTIONARY, (word, similar, entry: DictionaryWord) => {
			entry.definition = PREPOSITION_WORD.Definition
			entry.note = PREPOSITION_WORD.Notes
			entry.speech = ['preposition']
			entry.similar = similar
		})
	}

	// Character
	type CharacterRecord = {
		English: string
		"Old Ponish": string
		Justification: string
	}
	const CHARACTER_SHEET: CharacterRecord[] = xlsx.utils.sheet_to_json(xlsx_dictionary.Sheets['Character Names']!)
	for (const CHARACTER_WORD of CHARACTER_SHEET) {
		handle_similar_word(CHARACTER_WORD['Old Ponish'], PONISH_DICTIONARY, (word, similar, entry: DictionaryWord) => {
			if (!entry.definition) {
				entry.definition = CHARACTER_WORD.English
			}

			entry.character = {
				english: CHARACTER_WORD.English,
				justification: CHARACTER_WORD.Justification
			}

			if (entry.speech) entry.speech.push('character')
			else entry.speech = ['character']

			entry.similar = similar
		})
	}

	// NSFW
	type NSFWRecord = {
		"Old Ponish": string,
		English: string,
		"Type of Word": string,
		"In-Universe Reason / Note": string,
		"Out-Of-Universe Reason": string
	}
	const NSFW_SHEET: NSFWRecord[] = xlsx.utils.sheet_to_json(xlsx_dictionary.Sheets['NSFW Words & Insults']!)
	for (const NSFW_WORD of NSFW_SHEET) {
		handle_similar_word(NSFW_WORD['Old Ponish'], PONISH_DICTIONARY, (word, similar, entry: DictionaryWord) => {
			const in_universe = NSFW_WORD['In-Universe Reason / Note']
			const out_universe = NSFW_WORD['Out-Of-Universe Reason']

			if (!entry.definition) {
				entry.definition = NSFW_WORD.English
				entry.speech = NSFW_WORD['Type of Word'].split(',').map((pos) => cleanup_part_of_speech(pos))
			}

			entry.nsfw = {
				definition: NSFW_WORD.English
			}

			if (in_universe || out_universe) {
				entry.nsfw.reason = { in_universe, out_universe }
			}

			entry.similar = similar
		})
	}

	return Object.keys(PONISH_DICTIONARY)
		.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
		.reduce((tbl: any, key) => {
			tbl[key] = PONISH_DICTIONARY[key]
			return tbl
		}, {})
}

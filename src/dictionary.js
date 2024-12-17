const xlsx = require('@e965/xlsx')
const { handle_similar_word, cleanup_part_of_speech } = require('./helper')

/**
 * @param { string } dictionary_path
 */
async function create_dictionary_json(dictionary_path) {
	const xlsx_dictionary = xlsx.readFile(dictionary_path)

	/**
	 * @typedef { object } VocabularyRecord
	 * @property { string } "Old Ponish"
	 * @property { string } English
	 * @property { string } "Part of Speech"
	 * @property { string? } Note
	 */

	/**
	 * @typedef { Object.<string, DictionaryWord> } PonishDictionary
	 */
	/**
	 * @typedef { object } DictionaryWord
	 * @property { string } definition
	 * @property { string? } note
	 * @property { string[]? } speech
	 * @property { string[]? } similar
	 * @property { DictionaryNSFW? } nsfw
	 * @property { DictionaryCharacter? } character
	 */
	/**
	 * @typedef { object } DictionaryNSFW
	 * @property { string } definition
	 * @property { DictionaryNSFWReason? } reason
	 */
	/**
	 * @typedef { object } DictionaryNSFWReason
	 * @property { string } in_universe
	 * @property { string } out_universe
	 */
	/**
	 * @typedef { object } DictionaryCharacter
	 * @property { string? } english
	 * @property { string? } justification
	 */

	/** @type { PonishDictionary } */
	const PONISH_DICTIONARY = {}

	// Vocabulary
	/** @type { VocabularyRecord[] } */
	const VOCABULARY_SHEET = xlsx.utils.sheet_to_json(xlsx_dictionary.Sheets['Vocabulary'])
	for (const VOCAB_WORD of VOCABULARY_SHEET) {
		handle_similar_word(VOCAB_WORD['Old Ponish'], PONISH_DICTIONARY, (word, similars, _entry) => {
			/** @type { DictionaryWord } */
			const entry = _entry

			entry.definition = VOCAB_WORD.English
			entry.note = VOCAB_WORD.Note
			entry.speech = VOCAB_WORD['Part of Speech']
				? VOCAB_WORD['Part of Speech'].split(/[,|;]/g).map((pos) => cleanup_part_of_speech(pos))
				: undefined

			entry.similar = similars
		})
	}

	// Prefix
	/**
	 * @typedef { object } PrefixRecord
	 * @property { string } Prefix
	 * @property { string } Meaning
	 * @property { string? } Note
	 */
	/** @type { PrefixRecord } */
	const PREFIX_SHEET /** @type { PrefixRecord[] } */ = xlsx.utils.sheet_to_json(xlsx_dictionary.Sheets['Prefixes'])
	for (const PREFIX_WORD of PREFIX_SHEET) {
		handle_similar_word(PREFIX_WORD.Prefix, PONISH_DICTIONARY, (word, similar, _entry) => {
			/** @type { DictionaryWord } */
			const entry = _entry

			entry.definition = PREFIX_WORD.Meaning
			entry.note = PREFIX_WORD.Note
			entry.speech = ['prefix']
			entry.similar = similar
		})
	}
	// Suffix
	/**
	 * @typedef { object } SuffixRecord
	 * @property { string } Suffix
	 * @property { string } Meaning
	 * @property { string? } Note
	 */
	/** @type { SuffixRecord[] } */
	const SUFFIX_SHEET = xlsx.utils.sheet_to_json(xlsx_dictionary.Sheets['Suffixes'])
	for (const SUFFIX_WORD of SUFFIX_SHEET) {
		handle_similar_word(SUFFIX_WORD.Suffix, PONISH_DICTIONARY, (word, similar, _entry) => {
			/** @type { DictionaryWord } */
			const entry = _entry

			entry.definition = SUFFIX_WORD.Meaning
			entry.note = SUFFIX_WORD.Note
			entry.speech = ['suffix']
			entry.similar = similar
		})
	}
	// Prepositions
	/**
	 * @typedef { object } PrepositionRecord
	 * @property { string } Word
	 * @property { string } Definition
	 * @property { string? } Notes
	 */
	/** @type { PrepositionRecord[] } */
	const PREPOSITION_SHEET = xlsx.utils.sheet_to_json(xlsx_dictionary.Sheets['Prepositions'])
	for (const PREPOSITION_WORD of PREPOSITION_SHEET) {
		handle_similar_word(PREPOSITION_WORD.Word, PONISH_DICTIONARY, (word, similar, _entry) => {
			/** @type { DictionaryWord } */
			const entry = _entry

			entry.definition = PREPOSITION_WORD.Definition
			entry.note = PREPOSITION_WORD.Notes
			entry.speech = ['preposition']
			entry.similar = similar
		})
	}

	// Character
	/**
	 * @typedef { object } CharacterRecord
	 * @property { string } English
	 * @property { string } "Old Ponish"
	 * @property { string } Justification
	 */
	/** @type { CharacterRecord[] } */
	const CHARACTER_SHEET = xlsx.utils.sheet_to_json(xlsx_dictionary.Sheets['Character Names'])
	for (const CHARACTER_WORD of CHARACTER_SHEET) {
		handle_similar_word(CHARACTER_WORD['Old Ponish'], PONISH_DICTIONARY, (word, similar, _entry) => {
			/** @type { DictionaryWord } */
			const entry = _entry
			entry.character = {}
			if (entry.definition) {
				if (CHARACTER_WORD.English !== entry.definition) entry.character.english = CHARACTER_WORD.English
			} else {
				entry.definition = CHARACTER_WORD.English
			}
			entry.character.justification = CHARACTER_WORD.Justification

			if (entry.speech) entry.speech.push('character')
			else entry.speech = ['character']

			entry.similar = similar
		})
	}

	// NSFW
	/**
	 * @typedef { object } NSFWRecord
	 * @property { string } "Old Ponish"
	 * @property { string } English
	 * @property { string } "Type of Word"
	 * @property { string } "In-Universe Reason / Note"
	 * @property { string } "Out-Of-Universe Reason"
	 */
	/** @type { NSFWRecord[] } */
	const NSFW_SHEET = xlsx.utils.sheet_to_json(xlsx_dictionary.Sheets['NSFW Words & Insults'])
	for (const NSFW_WORD of NSFW_SHEET) {
		handle_similar_word(NSFW_WORD['Old Ponish'], PONISH_DICTIONARY, (word, similar, _entry) => {
			/** @type { DictionaryWord } */
			const entry = _entry

			const in_universe = NSFW_WORD['In-Universe Reason / Note']
			const out_universe = NSFW_WORD['Out-Of-Universe Reason']
			entry.nsfw = {}

			if (entry.definition) {
				entry.nsfw.definition = NSFW_WORD.English
			} else {
				entry.definition = NSFW_WORD.English
				entry.speech = NSFW_WORD['Type of Word'].split(',').map((pos) => cleanup_part_of_speech(pos))
			}

			if (in_universe || out_universe) entry.nsfw = { ...entry.nsfw, in_universe, out_universe }

			entry.similar = similar
		})
	}

	return Object.keys(PONISH_DICTIONARY)
		.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
		.reduce((tbl, key) => {
			tbl[key] = PONISH_DICTIONARY[key]
			return tbl
		}, {})
}

module.exports = {
	create_dictionary_json,
}

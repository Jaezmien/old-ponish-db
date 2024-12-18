const xlsx = require('@e965/xlsx')

/**
 * @param { string } word
 */
function cleanup_part_of_speech(word) {
	let w = word.trim()
	if (w.endsWith('.')) w = w.substring(0, w.length - 1)

	switch (w) {
		case 'adv':
			return 'adverb'
		case 'prep':
			return 'preposition'
		case 'adj':
			return 'adjective'
		case 'conj':
			return 'conjunction'
		case 'N':
		case 'n':
			return 'noun'
		case 'veb':
		case 'v':
			return 'verb'
	}

	return w
}

/**
 * @callback SimilarWordCallback
 * @param { string } word
 * @param { string[]|undefined } similars
 * @param { object } entry
 * @returns { void }
 */
/**
 * @param { string } word
 * @param { object } tbl
 * @param { SimilarWordCallback } callback
 */
function handle_similar_word(word, tbl, callback) {
	const SPLIT_WORD = new Set(word.split(/[\/\,]/).map((x) => x.trim()))

	// Handle `word (word)`
	for(const WORD of SPLIT_WORD) {
		if ( /\(.+?\)/.test(WORD) ) {
			const match = WORD.trim().match(/^(.+)\((.+)\)$/)
			if(!match) continue;

			SPLIT_WORD.add(match[1].trim())
			SPLIT_WORD.add(match[2].trim())

			SPLIT_WORD.delete(WORD)
		}
	}

	for (const WORD of SPLIT_WORD) {
		const similars = Array.from(SPLIT_WORD.values()).filter((word) => word !== WORD)
		callback(WORD, similars.length ? similars : undefined, tbl[WORD] ?? (tbl[WORD] = {}))
	}
}

/**
 * @param { string } path
 * @param { string } name
 */
function read_xlsx_sheet(path, name) {
	const speadsheet = xlsx.readFile(path)
	return xlsx.utils.sheet_to_json(speadsheet.Sheets[name])
}

module.exports = {
	cleanup_part_of_speech,
	handle_similar_word,
	read_xlsx_sheet,
}

import xlsx from '@e965/xlsx'

export function cleanup_part_of_speech(word: string) {
	let w = word.trim()
	if (w.startsWith('(') && w.endsWith(')')) w = w.substring(1, w.length - 1)
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

type SimilarWordCallback = (word: string, similars: string[] | undefined, entry: any) => void

export function handle_similar_word(word: string, tbl: any, callback: SimilarWordCallback) {
	const SPLIT_WORD = new Set(word.split(/[\/\,]/).map((x) => x.trim()))

	// Handle `word (word)`
	for (const WORD of SPLIT_WORD) {
		if (/\(.+?\)/.test(WORD)) {
			const match = WORD.trim().match(/^(.+)\((.+)\)$/)
			if (!match) continue;

			SPLIT_WORD.add(match[1]!.trim())
			SPLIT_WORD.add(match[2]!.trim())

			SPLIT_WORD.delete(WORD)
		}
	}

	for (const WORD of SPLIT_WORD) {
		const similars = Array.from(SPLIT_WORD.values()).filter((word) => word !== WORD)
		callback(WORD, similars.length ? similars : undefined, tbl[WORD] ?? (tbl[WORD] = {}))
	}
}

export function read_xlsx_sheet(path: string, name: string) {
	const speadsheet = xlsx.readFile(path)
	return xlsx.utils.sheet_to_json(speadsheet.Sheets[name]!)
}

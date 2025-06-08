import { existsSync, rmSync, mkdirSync, writeFileSync } from 'fs'
import * as fs from 'fs'
import { utils, writeFile } from '@e965/xlsx'
import * as XLSX from '@e965/xlsx'
XLSX.set_fs(fs)


import { join } from 'path'
import { create_dictionary_json } from './dictionary'
import { create_etymology_json } from './etymology'

const ROOT_PATH = join(__dirname, '..')
const DIST_PATH = join(ROOT_PATH, 'dist')
const DATA_PATH = join(ROOT_PATH, 'data')
const DATA_D_PATH = join(DATA_PATH, 'dictionary')
const DATA_E_PATH = join(DATA_PATH, 'etymology')

async function main() {
	if (existsSync(DIST_PATH)) {
		console.log('Cleaning up dist folder...')
		rmSync(DIST_PATH, { recursive: true })
	}
	mkdirSync(DIST_PATH)

	console.log('Creating dictionary file...')
	const DICTIONARY_JSON_PATH = join(DIST_PATH, 'dictionary.json')
	const DICTIONARY = await create_dictionary_json(join(DATA_D_PATH, 'dictionary.xlsx'))
	writeFileSync(DICTIONARY_JSON_PATH, JSON.stringify(DICTIONARY, null, '\t'))

	console.log('Creating etymology file...')
	const ETYMOLOGY_JSON_PATH = join(DIST_PATH, 'etymology.json')
	const ETYMOLOGY_XLSX_PATH = join(DIST_PATH, 'etymology.xlsx')
	const ETYMOLOGY = await create_etymology_json(
		join(DATA_E_PATH, 'changelog.xlsx'),
		join(DATA_E_PATH),
		DICTIONARY_JSON_PATH,
	)
	writeFileSync(ETYMOLOGY_JSON_PATH, JSON.stringify(ETYMOLOGY, null, '\t'))

	let worksheet = utils.json_to_sheet(
		Object.keys(ETYMOLOGY).map((k) => {
			let entry = ETYMOLOGY[k]

			return {
				word: k,
				etymology: entry.etymology,
				description: entry.description,
				note: entry.note,
				speech: entry.speech?.join(', '),
				credit: entry.credit,
			}
		}),
	)
	let workbook = utils.book_new()
	utils.book_append_sheet(workbook, worksheet, 'Etymology')
	writeFile(workbook, ETYMOLOGY_XLSX_PATH)
}

main()
	.then(() => {
		console.log('Successfully created files!')

		process.exit(0)
	})
	.catch((err) => {
		console.error('An error has occured while trying to build the database!')
		console.error(err)

		process.exit(1)
	})

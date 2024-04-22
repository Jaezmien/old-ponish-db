const fs = require('fs')
const path = require('path')
const xlsx = require('xlsx')
const { create_dictionary_json } = require('./dictionary')
const { create_etymology_json } = require('./etymology')

const ROOT_PATH = path.join(__dirname, '..')
const DIST_PATH = path.join(ROOT_PATH, 'dist')
const DATA_PATH = path.join(ROOT_PATH, 'data')
const DATA_D_PATH = path.join(DATA_PATH, 'dictionary')
const DATA_E_PATH = path.join(DATA_PATH, 'etymology')

async function main() {
	if (fs.existsSync(DIST_PATH)) {
		console.log('Cleaning up dist folder...')
		fs.rmSync(DIST_PATH, { recursive: true })
	}
	fs.mkdirSync(DIST_PATH)

	console.log('Creating dictionary file...')
	const DICTIONARY_JSON_PATH = path.join(DIST_PATH, 'dictionary.json')
	const DICTIONARY = await create_dictionary_json(path.join(DATA_D_PATH, 'dictionary.xlsx'))
	fs.writeFileSync(DICTIONARY_JSON_PATH, JSON.stringify(DICTIONARY, null, '\t'))

	console.log('Creating etymology file...')
	const ETYMOLOGY_JSON_PATH = path.join(DIST_PATH, 'etymology.json')
	const ETYMOLOGY_XLSX_PATH = path.join(DIST_PATH, 'etymology.xlsx')
	const ETYMOLOGY = await create_etymology_json(
		path.join(DATA_E_PATH, 'changelog.xlsx'),
		path.join(DATA_E_PATH),
		DICTIONARY_JSON_PATH,
	)
	fs.writeFileSync(ETYMOLOGY_JSON_PATH, JSON.stringify(ETYMOLOGY, null, '\t'))

	let worksheet = xlsx.utils.json_to_sheet(
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
	let workbook = xlsx.utils.book_new()
	xlsx.utils.book_append_sheet(workbook, worksheet, 'Etymology')
	xlsx.writeFile(workbook, ETYMOLOGY_XLSX_PATH)
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

const migrations = [
	async (db) => {
		db.createObjectStore('characters', { keyPath: 'idx', autoIncrement: true })
	}
]

function usingDB (callback) {
	let db
	return new Promise((resolve, reject) => {
		const req = window.indexedDB.open('syzygy', migrations.length)

		req.onerror = () => reject(new Error('Error accessing database'))
		req.onsuccess = () => {
			db = req.result

			callback(db)
				.then(resolve)
				.catch(reject)
		}

		req.onupgradeneeded = async (evt) => {
			try {
				for (let i = evt.oldVersion; i < evt.newVersion; ++i) {
					await migrations[i](req.result)
				}
			}
			catch (err) {
				reject(new Error('Error migrating the database.'))
			}
		}
	}).finally(() => {
		db.close()
	})
}

function usingTransaction (db, readwrite, callback) {
	const mode = readwrite ? 'readwrite' : 'readonly'

	return new Promise((resolve, reject) => {
		const transaction = db.transaction('characters', mode)
		transaction.oncomplete = () => resolve()
		transaction.onerror = () => reject(new Error('Transaction failed.'))

		const store = transaction.objectStore('characters')
		callback(store, transaction)
	})
}

export const characterRepository = {
	async listAll () {
		let characters

		await usingDB(db => usingTransaction(db, false, (store) => {
				const req = store.getAll()
				req.onsuccess = () => { characters = req.result }
			})
		)

		return characters
	},

	async create () {
		let idx

		await usingDB(db => usingTransaction(db, true, (store) => {
			const req = store.add({
				info: {
					name: '',
					origin: 'human',
					charClass: 'envoy',
					archetype: 'none',
					level: 1,
					portrait: null,
				},
				skills: {
					athletics: { partial: 1, full: 3 },
					authority: { partial: 1, full: 3 },
					empathy:   { partial: 1, full: 3 },
					hardware:  { partial: 1, full: 3 },
					science:   { partial: 1, full: 3 },
					secrecy:   { partial: 1, full: 3 },
					software:  { partial: 1, full: 3 },
					weaponry:  { partial: 1, full: 3 },
				},
				resources: {
					strain: { current: 0, max: 20 },
					wounds: [],
					darkness: 0,
					corruptions: [],
				},
				inventory: {
					weapons: [],
					armour: [],
					equipment: [],
					credits: 0,
				},
				storage: {
					weapons: [],
					armour: [],
					equipment: [],
					credits: 0,
				},
				abilities: [],
			})

			req.onsuccess = () => { idx = req.result }
		}))

		return idx
	},

	async get (key) {
		let character

		await usingDB(db => usingTransaction(db, false, (store) => {
			const req = store.get(key)
			req.onsuccess = () => character = req.result
		}))

		return character
	},

	async put (character) {
		let success = false

		await usingDB(db => usingTransaction(db, true, (store) => {
			const req = store.put(character)
			req.onsuccess = () => success = true
		}))

		return success
	},

	async delete (idx) {
		let success = false

		await usingDB(db => usingTransaction(db, true, (store) => {
			const req = store.delete(idx)
			req.onsuccess = () => success = true
		}))

		return success
	}
}
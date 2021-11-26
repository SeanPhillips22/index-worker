// Make a URL for the Airtable API
function airtableUrl(baseName, appendA = '', appendB = '') {
	return `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${baseName}${appendA}`
}

// Find an ID based on the symbol
async function findID(base, symbol) {
	const list = await Index.get(base)
	const json = JSON.parse(list)
	const match = json.find((item) => item.symbol === symbol)
	return match ? match.id : null
}

// Minify the data from the Airtable API by removing bloat
function minifyAirtableData(data) {
	const minified = data.map((record) => {
		let id = record.id
		let field = record.fields

		if (field.Link) delete field.Link
		if (field.SEC) delete field.SEC
		if (field.TEST) delete field.TEST
		if (field.Created) delete field.Created
		if (field.executives) field.executives = JSON.parse(field.executives)

		field.id = id

		return field
	})

	return minified
}

export async function fetchBase(baseName, view = null, saveAs = null) {
	let name = baseName.toLowerCase()
	let url = view ? airtableUrl(name, `?view=${view}`) : airtableUrl(name)

	let data = []
	let finished = false

	while (!finished) {
		let response = await fetch(url, {
			headers: {
				Authorization: `Bearer ${AIRTABLE_API_KEY}`
			}
		})

		let json = await response.json()
		data = data.concat(json.records)

		if (json.offset) {
			url = view
				? airtableUrl(name, `?offset=${json.offset}&view=${view}`)
				: airtableUrl(name, `?offset=${json.offset}`)
		} else {
			finished = true
		}
	}

	let minified = minifyAirtableData(data)

	// Save to KV store
	let saveName = saveAs ? saveAs : name
	await Index.put(saveName, JSON.stringify(minified))
	await Index.put(`${saveName}_lastUpdated`, new Date().toISOString())

	return minified
}

export async function updateBase(data) {
	// Lookup the record ID
	let base = data.base.toLowerCase()
	let symbol = data.symbol.toUpperCase()
	let id = await findID(base, symbol)
	if (!id) return null

	// Set the payload to send to Airtable
	delete data.base
	delete data.symbol
	let payload = {
		fields: data
	}

	// Send the request
	let url = airtableUrl(base, `/${id}`)
	let response = await fetch(url, {
		method: 'PATCH',
		headers: {
			Authorization: `Bearer ${AIRTABLE_API_KEY}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(payload)
	})

	// Return the response
	return response
}

export async function fetchStocks() {
	let last = await Index.get('stocks_lastFetched')

	if (last === 'others') {
		await fetchBase('stocks', 'nasdaq', 'stocks_nasdaq')
		await Index.put('stocks_lastFetched', 'nasdaq')
	} else {
		await fetchBase('stocks', 'others', 'stocks_others')
		await Index.put('stocks_lastFetched', 'others')
	}

	let stocks = []
	let stocks1 = await Index.get('stocks_nasdaq')
	let stocks2 = await Index.get('stocks_others')
	if (stocks1 && stocks2) {
		stocks = JSON.parse(stocks1).concat(JSON.parse(stocks2))
	}

	await Index.put('stocks', JSON.stringify(stocks))
	await Index.put('stocks_lastUpdated', new Date().toISOString())

	return stocks
}

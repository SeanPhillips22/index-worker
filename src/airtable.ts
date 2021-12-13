// Make a URL for the Airtable API
function airtableUrl(baseName: string, appendA = '') {
  return `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${baseName}${appendA}`
}

// Find an ID based on the symbol
async function findID(base: string, symbol: string) {
  const list = await Index.get(base)
  const json = JSON.parse(list || '{}')
  const match = json.find((item) => item.symbol === symbol) //! ITEM
  return match ? match.id : null
}

// Minify the data from the Airtable API by removing bloat
function minifyAirtableData(data) {
  //! data
  const minified = data.map((record: any) => {
    const id = record.id
    const field = record.fields

    if (field.Link) delete field.Link
    if (field.SEC) delete field.SEC
    if (field.TEST) delete field.TEST
    if (field.TEST_IEX_QUOTE) delete field.TEST_IEX_QUOTE
    if (field.TEST_NEWS) delete field.TEST_NEWS
    if (field.Created) delete field.Created
    if (field.executives) field.executives = JSON.parse(field.executives)

    field.id = id

    return field
  })

  return minified
}

export async function fetchBase(
  baseName: string,
  view?: string,
  saveAs?: string,
) {
  const name = baseName.toLowerCase()
  let url = view ? airtableUrl(name, `?view=${view}`) : airtableUrl(name)

  let data = [] //! data
  let finished = false

  while (!finished) {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      },
    })

    const json: any = await response.json()
    data = data.concat(json.records) //!

    if (json.offset) {
      url = view
        ? airtableUrl(name, `?offset=${json.offset}&view=${view}`)
        : airtableUrl(name, `?offset=${json.offset}`)
    } else {
      finished = true
    }
  }

  const minified = minifyAirtableData(data)

  // Save to KV store
  const saveName = saveAs ? saveAs : name
  await Index.put(saveName, JSON.stringify(minified))
  await Index.put(`${saveName}_lastUpdated`, new Date().toISOString())

  return minified
}

export async function updateBase(data) {
  //! data
  // Lookup the record ID
  const base = data.base.toLowerCase()
  const symbol = data.symbol.toUpperCase()
  const id = await findID(base, symbol)
  if (!id) return null

  // Set the payload to send to Airtable
  delete data.base
  delete data.symbol
  const payload = {
    fields: data,
  }

  // Send the request
  const url = airtableUrl(base, `/${id}`)
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  // Return the response
  return response
}

export async function fetchStocks() {
  const last = await Index.get('stocks_lastFetched')

  if (last === 'others') {
    await fetchBase('stocks', 'nasdaq', 'stocks_nasdaq')
    await Index.put('stocks_lastFetched', 'nasdaq')
  } else {
    await fetchBase('stocks', 'others', 'stocks_others')
    await Index.put('stocks_lastFetched', 'others')
  }

  let stocks = []
  const stocks1 = await Index.get('stocks_nasdaq')
  const stocks2 = await Index.get('stocks_others')
  if (stocks1 && stocks2) {
    stocks = JSON.parse(stocks1).concat(JSON.parse(stocks2))
  }

  await Index.put('stocks', JSON.stringify(stocks))
  await Index.put('stocks_lastUpdated', new Date().toISOString())

  return stocks
}

export async function fetchSymbols() {
  const last = await Index.get('symbols_lastFetched')
  console.log('here')
  if (last === 'others') {
    await fetchBase('symbols', 'nasdaq', 'symbols_nasdaq')
    await Index.put('symbols_lastFetched', 'nasdaq')
  } else {
    await fetchBase('symbols', 'others', 'symbols_others')
    await Index.put('symbols_lastFetched', 'others')
  }

  let symbols = []
  const symbols1 = await Index.get('symbols_nasdaq')
  const symbols2 = await Index.get('symbols_others')
  if (symbols1 && symbols2) {
    symbols = JSON.parse(symbols1).concat(JSON.parse(symbols2))
  }

  await Index.put('symbols', JSON.stringify(symbols))
  await Index.put('symbols_lastUpdated', new Date().toISOString())

  return symbols
}

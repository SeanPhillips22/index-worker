// Make a URL for the Airtable API
function airtableUrl(baseName, append = '') {
    return `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${baseName}${append}`
}

// Find an ID based on the symbol
async function findID(base, symbol) {
    const list = await Index.get(base)
    const json = JSON.parse(list)
    const match = json.find(item => item.symbol === symbol)
    return match ? match.id : null
}

// Minify the data from the Airtable API by removing bloat
function minifyAirtableData(data) {

    const minified = data.map(record => {
        let id = record.id
        let field = record.fields
        if (field.Link) delete field.Link
        field.id = id
        return field
    })

    return minified
}

export async function fetchBase(baseName) {
    let name = baseName.toLowerCase()
    let url = airtableUrl(name)

    let data = []
    let finished = false

    while (!finished) {
        let response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${AIRTABLE_API_KEY}`
            }
        })

        let json = await response.json()
        data = data.concat(json.records)

        if (json.offset) {
            url = airtableUrl(name, `?offset=${json.offset}`)
        } else {
            finished = true
        }
    }

    let minified = minifyAirtableData(data)

    // Save to KV store
    await Index.put(name, JSON.stringify(minified))
    await Index.put(`${name}_lastUpdated`, new Date().toISOString())

    return minified
}



export async function updateBase(data) {

    // Lookup the record ID
    let base = data.base.toLowerCase()
    let symbol = data.symbol.toUpperCase()
    let id = await findID(base, symbol)
    if (!id) return null

    // Set the payload to send to Airtable
    let payload = {
        fields: data.payload
    }

    // Send the request
    let url = airtableUrl(base, `/${id}`)
    let response = await fetch(url, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
    })

    // Return the response
    return response
}
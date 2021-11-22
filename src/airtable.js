// Make a URL for the Airtable API
function airtableUrl(baseName, offset = null) {
    let append = offset ? `?offset=${offset}` : ''
    return `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${baseName}${append}`
}

// Minify the data from the Airtable API by removing bloat
function minifyAirtableData(data) {

    let minified = []

    data.forEach(record => {
        let field = record.fields
        if (field.Link) delete field.Link
        minified = minified.concat(field)
    })

    return minified
}

export async function fetchBase(baseName) {
    let url = airtableUrl(baseName)

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
            url = airtableUrl(baseName, json.offset)
        } else {
            finished = true
        }
    }

    let minified = minifyAirtableData(data)

    // Save to KV store
    await Index.put(baseName, JSON.stringify(minified))
    await Index.put(`${baseName}_lastUpdated`, new Date().toISOString())

    return minified
}
// Make a URL for the Airtable API
export function airtableUrl(baseName, offset = null) {
    let append = offset ? `?offset=${offset}` : ''
    return `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${baseName}${append}`
}

// Minify the data from the Airtable API by removing bloat
export function minifyAirtableData(data) {

    let minified = []

    data.forEach(record => {
        let field = record.fields
        if (field.Link) delete field.Link
        minified = minified.concat(field)
    })

    return minified
}
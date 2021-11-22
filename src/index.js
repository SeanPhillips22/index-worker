import { airtableUrl, minifyAirtableData } from './airtable'

async function handler(request) {

    // get the query params
    const { searchParams } = new URL(request.url)
    const list = searchParams.get('list') // The type of index to fetch
    const key = searchParams.get('key') // The key to verify the request
    const forceUpdate = searchParams.get('forceUpdate') // Force an update of the index

    // make sure all params are present and valid
    if (!list || key !== SA_CF_KEY) return new Response('Problem', { status: 400 })

    // fetch the stored data and timestamp
    const stored = await Index.get(list)
    const updated = stored ? await Index.get(`${list}_lastUpdated`) : 0

    // get minutes elapsed since the last update
    const minutes = (Date.now() - new Date(updated)) / 60000

    // if there is data and it's fresh, return it (else, fetch it again)
    if (!forceUpdate) {
        if (stored && minutes < 60) {
            return new Response(stored, {
                headers: {
                    'Content-Type': 'application/json'
                }
            })
        }
    }

    let url = airtableUrl(list)

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
            url = airtableUrl(list, json.offset)
        } else {
            finished = true
        }
    }

    let minified = minifyAirtableData(data)

    // Save to KV store
    await Index.put(list, JSON.stringify(minified))
    await Index.put(`${list}_lastUpdated`, new Date().toISOString())

    return new Response(JSON.stringify(minified), {
        headers: {
            'Content-Type': 'application/json'
        }
    })
}











addEventListener('fetch', event => {
    event.respondWith(handler(event.request))
})
import { fetchBase } from './airtable'

async function handler(request) {

    // get the query params
    const { searchParams } = new URL(request.url)
    const indexName = searchParams.get('list') // The type of index to fetch (ETFs)
    const forceUpdate = searchParams.get('forceUpdate') // Force an update of the index
    const key = searchParams.get('key') // The key to verify the request

    // make sure all params are present and valid
    if (!indexName || key !== SA_CF_KEY) return new Response('Problem', { status: 400 })

    // if there is data and it's fresh, return it (else, fetch it again)
    if (!forceUpdate) {

        // fetch the stored data and timestamp
        const stored = await Index.get(indexName)
        const updated = stored ? await Index.get(`${indexName}_lastUpdated`) : 0

        // get minutes elapsed since the last update
        const minutes = (Date.now() - new Date(updated)) / 60000

        if (stored && minutes < 60) {
            return new Response(stored, {
                headers: {
                    'Content-Type': 'application/json'
                }
            })
        }
    }

    let data = await fetchBase(indexName)

    return new Response(JSON.stringify(data), {
        headers: {
            'Content-Type': 'application/json'
        }
    })
}



async function updateAllIndexes() {
    await fetchBase('ETFs')
}









addEventListener('fetch', event => {
    event.respondWith(handler(event.request))
})

addEventListener('scheduled', event => {
    event.waitUntil(updateAllIndexes(event))
})
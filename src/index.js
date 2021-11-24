import { Router } from 'itty-router'
import { fetchBase, updateBase } from './airtable'
import { typeJSON } from './utils/responses'

// Create a new router
const router = Router()

// Fetch an index
router.get('/fetch/:index', async ({ params, query }) => {
    if (query.key !== SA_CF_KEY) return new Response('Invalid key', { status: 401 });

    const data = await Index.get(params.index.toLowerCase())
    if (data) return new Response(data, typeJSON)
})

// Force an index update
router.get('/update/:index', async ({ params, query }) => {
    if (query.key !== SA_CF_KEY) return new Response('Invalid key', { status: 401 });

    const data = await fetchBase(params.index.toLowerCase())
    if (data) return new Response(JSON.stringify(data), typeJSON)
})

// Edit values in the index
router.post('/edit', async request => {
    if (request.query.key !== SA_CF_KEY) return new Response('Invalid key', { status: 401 });

    const data = await request.json()
    const edit = await updateBase(data)
    if (edit) return new Response(JSON.stringify(edit), typeJSON)
})

// Return 404 if no route match
router.all('*', () => new Response('404', { status: 404 }))

// Update all the indexes
async function updateAllIndexes() {
    await fetchBase('ETFs')
}


addEventListener('fetch', (e) => {
    e.respondWith(router.handle(e.request))
})

addEventListener('scheduled', event => {
    event.waitUntil(updateAllIndexes(event))
})
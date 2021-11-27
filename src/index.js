import { Router } from 'itty-router'
import { fetchBase, updateBase, fetchSymbols } from './airtable'
import { typeJSON } from './utils/responses'
import { minutes } from './utils/minutes'

// Create a new router
const router = Router()

// Fetch an index
router.get('/fetch/:index', async ({ params, query }) => {
	if (query.key !== SA_CF_KEY) return new Response('Invalid key', { status: 401 })

	const data = await Index.get(params.index.toLowerCase())
	if (data) return new Response(data, typeJSON)
})

// Force an index update
router.get('/update/:index', async ({ params, query }) => {
	if (query.key !== SA_CF_KEY) return new Response('Invalid key', { status: 401 })

	let base = params.index.toLowerCase()
	const data = base === 'symbols' ? await fetchSymbols() : await fetchBase(base)

	if (data) return new Response(JSON.stringify(data), typeJSON)
})

// Edit values in the index
router.post('/edit', async (request) => {
	if (request.query.key !== SA_CF_KEY) return new Response('Invalid key', { status: 401 })

	const data = await request.json()
	const edit = await updateBase(data)
	if (edit) return new Response(JSON.stringify(edit), typeJSON)
})

// router.get('/test', async () => {
// 	let data = await fetchSymbols()
// 	if (data) return new Response(JSON.stringify(data), typeJSON)
// })

// Return 404 if no route match
router.all('*', () => new Response('404', { status: 404 }))

// Update all the indexes
async function updateAllIndexes() {
	if ((await minutes('redirects')) > 360) {
		await fetchBase('redirects')
		return new Response('OK')
	}
	if ((await minutes('etfs')) > 240) {
		await fetchBase('etfs')
		return new Response('OK')
	}
	if ((await minutes('stocks')) > 60) {
		await fetchSymbols()
		return new Response('OK')
	}
	if ((await minutes('ipos')) > 30) {
		await fetchBase('ipos')
		return new Response('OK')
	}
}

// Fetch trigger
addEventListener('fetch', (e) => {
	e.respondWith(router.handle(e.request))
})

// Cron trigger
addEventListener('scheduled', (event) => {
	event.waitUntil(updateAllIndexes(event))
})

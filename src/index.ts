import { Router } from 'itty-router'
import { fetchBase, updateBase, fetchSymbols } from './airtable'
import { typeJSON } from './utils/responses'
import Fuse from 'fuse.js'
import { minutes } from './utils/minutes'

interface Input {
  params: Param | undefined
  query: string
}

interface Param {
  param: string | undefined
}

interface IndexType {
  s: string
  n: string
  t: string
}

type FuseResult<T> = Fuse.FuseResult<T>
// Create a new router
const router = Router()

//Fetch an index
router.get('/fetch/:param', async (input: Input) => {
  /*
  if (query.key !== SA_CF_KEY)    return new Response('Invalid key', { status: 401 })
  */
  if (!input.params || !input.params.param) {
    return new Response('404, not found!', { status: 404 })
  }

  const data = await Index.get(input.params.param.toLowerCase())

  if (data) return new Response(data, typeJSON)
})

//Search trough the index with parameter as the search string
router.get('/search/:param', async (input: Input) => {
  if (!input.params || !input.params.param) {
    return new Response('404, not found!', { status: 404 })
  }

  const data = JSON.parse(await Index.get('index'))

  const options: Fuse.IFuseOptions<IndexType> = {
    includeScore: true,
    keys: ['s', 'n'],
  }
  const fuse = new Fuse(data, options)

  const result: FuseResult<IndexType>[] = fuse.search(input.params.param, {
    limit: 7,
  })

  if (data) return new Response(JSON.stringify(result), typeJSON)
})
/*
Force an index update
*/
router.get('/update/:param', async ({ params, query }) => {
  // if (query.key !== SA_CF_KEY) return new Response('Invalid key', { status: 401 })

  if (!params) {
    return new Response('404, not found!', { status: 404 })
  }

  const base = params.param.toLowerCase()
  const data = base === 'symbols' ? await fetchSymbols() : await fetchBase(base)

  if (data) return new Response(JSON.stringify(data), typeJSON)
})

// Edit values in the index
router.post('/edit', async (request: Request) => {
  // 	if (request.query.key !== SA_CF_KEY) return new Response('Invalid key', { status: 401 })
  if (!request) {
    return new Response('404, not found!', { status: 404 })
  }

  const data = await request.json()
  const edit = await updateBase(data)
  if (edit) return new Response(JSON.stringify(edit), typeJSON)
})

/*
This is the last route we define, it will match anything that hasn't hit a route we've defined
above, therefore it's useful as a 404 (and avoids us hitting worker exceptions, so make sure to include it!).
Visit any page that doesn't exist (e.g. /foobar) to see it in action.
*/
router.all('*', () => new Response('404, not found!', { status: 404 }))

/*
This snippet ties our worker to the router we deifned above, all incoming requests
are passed to the router where your routes are called and the response is sent.
*/
addEventListener('fetch', (e) => {
  e.respondWith(router.handle(e.request))
})

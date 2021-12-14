import { Router } from 'itty-router'
import { typeJSON } from './utils/responses'
import Fuse from 'fuse.js'

interface Input {
  params: Param | undefined
  query: Query
}

interface Query {
  q: string
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

//Search trough the index with parameter as the search string
router.get('/search', async (input: Input) => {
  if (!input.query.q) {
    return new Response('404, not found!', { status: 404 })
  }

  const data = JSON.parse((await Index.get('index')) || '{}')

  const options: Fuse.IFuseOptions<IndexType> = {
    includeScore: true,
    keys: ['s', 'n'],
  }
  const fuse = new Fuse(data, options)

  const result: FuseResult<IndexType>[] = fuse.search(input.query.q, {
    limit: 50,
  })

  if (data)
    return new Response(
      JSON.stringify(
        result.map((result) => {
          return { n: result.item.n, s: result.item.s, t: result.item.t }
        }),
      ),
      typeJSON,
    )
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

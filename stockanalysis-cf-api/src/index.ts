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

interface SearchItem {
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

  const index = JSON.parse((await Index.get('index')) || '{}')

  const keyword = input.query.q.toString().toUpperCase()

  const exact = index.filter((item: SearchItem) => {
    if (item.s && item.s === keyword) {
      return item.s
    }
    if (item.n) {
      const name = item.n.toUpperCase()
      if (name === keyword) {
        return name
      }
    }
  })

  const matches = index.filter((item: SearchItem) => {
    if (item.s && item.s.startsWith(keyword)) {
      if (item.s !== keyword) {
        return item.s.startsWith(keyword)
      }
    }
    if (item.n) {
      const name = item.n.toUpperCase()
      if (item.s !== keyword && name !== keyword) {
        return name.startsWith(keyword)
      }
    }
  })

  const allResults = exact.concat(matches)

  if (index) return new Response(JSON.stringify(allResults), typeJSON)
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

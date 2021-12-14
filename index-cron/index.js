const url = 'https://api.stockanalysis.com/wp-json/sa/search?q=index'

addEventListener('scheduled', (event) => {
  event.waitUntil(triggerEvent(event.scheduledTime))
})

async function gatherResponse(response) {
  const { headers } = response
  const contentType = headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return JSON.stringify(await response.json())
  } else if (contentType.includes('application/text')) {
    return response.text()
  } else if (contentType.includes('text/html')) {
    return response.text()
  } else {
    return response.text()
  }
}

async function triggerEvent(scheduledTime) {
  const init = {
    headers: {
      'content-type': 'application/json;charset=UTF-8',
    },
  }
  const response = await fetch(url, init)
  const results = await gatherResponse(response)
  await Index.put('test', results)
}

export async function onRequestPost({
  env,
  request
}) {
  const hostname = await request.text()
  var response = await fetch(`https://api.cloudflare.com/client/v4/zones/${env.CLOUDFLARE_ZONE_ID}/custom_hostnames`, {
    body: JSON.stringify({
      hostname: hostname,
      ssl: {
        method: 'txt',
        type: 'dv'
      }
    }),
    headers: {
      'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    method: 'POST'
  })
  switch (response.status) {
    case 201: {
      const responseJson = await response.json()
      return new Response(JSON.stringify(responseJson.result), {
        headers: {
          'Content-Type': 'application/json'
        }
      })
    }
    case 409: {
      const urlSearchParams = new URLSearchParams({
        'per_page': 1,
        'hostname': hostname
      })
      var response = await fetch(`https://api.cloudflare.com/client/v4/zones/${env.CLOUDFLARE_ZONE_ID}/custom_hostnames?${urlSearchParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`
        }
      })
      const responseJson = await response.json()
      if (responseJson.result.length === 0) {
        throw new Error('Could not query information of existing hostname')
      }
      return new Response(JSON.stringify(responseJson.result[0]), {
        headers: {
          'Content-Type': 'application/json'
        }
      })
    }
    default: {
      throw new Error(`Unhandled response code: ${response.status}.`)
    }
  }
}

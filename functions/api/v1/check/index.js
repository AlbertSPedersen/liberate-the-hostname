export async function onRequestPost({
  env,
  request
}) {
  const hostname = await request.text()
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
    const result = await env.KV.get(hostname)
    if (result) {
      return new Response(result)
    }
    return new Response('Hostname does not exist.', {
      status: 404
    })
  }
  return new Response(responseJson.result[0].status)
}
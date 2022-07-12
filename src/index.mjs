import html from './index.html'


export default {
    async fetch(request, env) {
        try {
            const requestUrl = new URL(request.url)
            if (requestUrl.pathname === '/submit' && request.method === 'POST') {
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
                switch(response.status) {
                    case 201: {
                        const responseJson = await response.json()
                        return new Response(JSON.stringify(responseJson.result), {headers: {'Content-Type': 'application/json'}})
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
                        return new Response(JSON.stringify(responseJson.result[0]), {headers: {'Content-Type': 'application/json'}})
                    }
                    default: {
                        throw new Error(`Unhandled response code: ${response.status}`)
                    }
                }
            }
            if (requestUrl.pathname === '/check' && request.method === 'POST') {
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
                    return new Response('Hostname does not exist', {status: 404})
                }
                return new Response(responseJson.result[0].status)
            }
            return new Response(html, {headers: {'Content-Type': 'text/html'}})
        } catch(error) {
            console.log(error.message)
            return new Response('Something has gone wrong :/', {status: 500})
        }
    },

    async scheduled(_, env) {
        const urlSearchParams = new URLSearchParams({
            'per_page': 49,
            'hostname_status': 'active'
        })
        const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${env.CLOUDFLARE_ZONE_ID}/custom_hostnames?${urlSearchParams.toString()}`, {
            headers: {
                'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`
            }
        })
        const responseJson = await response.json()
        for (const hostname of responseJson.result) {
            await env.KV.put(hostname.hostname, 'liberated')
            await fetch(`https://api.cloudflare.com/client/v4/zones/${env.CLOUDFLARE_ZONE_ID}/custom_hostnames/${hostname.id}`, {
                headers: {
                    'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`
                },
                method: 'DELETE'
            })
        }
    }
}

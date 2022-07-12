export default {
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
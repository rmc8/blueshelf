import { serveDir } from 'jsr:@std/http@^1.0.0/file-server';

/**
 * Deno Deploy 用の静的 SPA サーバー & OAuth メタデータ動的解決
 */
Deno.serve(async (req) => {
	const url = new URL(req.url);

	// ATProto OAuth client-metadata.json の動的配信
	// HTTPS Web App の redirect_uris は同一オリジンの HTTPS URI のみ許可される (RFC 8252 / ATProto OAuth)
	if (url.pathname === '/oauth/client-metadata.json') {
		const origin = url.origin;
		const metadata = {
			client_id: `${origin}/oauth/client-metadata.json`,
			client_name: 'Blueshelf',
			client_uri: origin,
			logo_uri: `${origin}/img/logo/shelfsky.svg`,
			tos_uri: origin,
			policy_uri: origin,
			redirect_uris: [`${origin}/oauth/callback`],
			grant_types: ['authorization_code', 'refresh_token'],
			response_types: ['code'],
			scope: 'atproto',
			token_endpoint_auth_method: 'none',
			dpop_bound_access_tokens: true
		};

		return new Response(JSON.stringify(metadata, null, 2), {
			status: 200,
			headers: {
				'content-type': 'application/json; charset=utf-8',
				'cache-control': 'public, max-age=60',
				'access-control-allow-origin': '*'
			}
		});
	}

	// 静的ファイルの配信
	const res = await serveDir(req, {
		fsRoot: 'build',
		showIndex: true,
		quiet: true
	});

	// 静的ファイルが見つからない場合は index.html / 404.html を返す (SPA フォールバック)
	if (res.status === 404) {
		try {
			const html = await Deno.readTextFile('build/index.html');
			return new Response(html, {
				status: 200,
				headers: {
					'content-type': 'text/html; charset=utf-8',
					'cache-control': 'no-cache'
				}
			});
		} catch {
			try {
				const fallbackHtml = await Deno.readTextFile('build/404.html');
				return new Response(fallbackHtml, {
					status: 200,
					headers: {
						'content-type': 'text/html; charset=utf-8',
						'cache-control': 'no-cache'
					}
				});
			} catch {
				return new Response('Not Found', { status: 404 });
			}
		}
	}

	return res;
});

import { serveDir } from 'jsr:@std/http@^1.0.0/file-server';

/**
 * Deno Deploy 用の静的 SPA サーバー
 * - 静的ファイル（.js, .css, 書影, マニフェストなど）が存在する場合は配信
 * - ルートや存在しないパスは index.html / 404.html (SPA) にフォールバック
 */
Deno.serve(async (req) => {
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

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { searchBooks } from './bookSearch';

describe('BookSearch Service (TDD)', () => {
	const originalFetch = globalThis.fetch;

	beforeEach(() => {
		// Mock fetch responses for fast, deterministic unit tests
		globalThis.fetch = async (input: RequestInfo | URL) => {
			const url = String(input);
			if (url.includes('openbd.jp')) {
				return {
					ok: true,
					json: async () => [
						{
							summary: {
								isbn: '9784297126353',
								title: 'SvelteKit Guide',
								author: 'Rich Harris',
								publisher: 'Gihyo',
								cover: 'https://cover.openbd.jp/9784297126353.jpg'
							}
						}
					]
				} as Response;
			}
			if (url.includes('openlibrary.org')) {
				return {
					ok: true,
					json: async () => ({
						docs: [
							{
								title: 'SvelteKit Guide',
								author_name: ['Rich Harris'],
								isbn: ['9784297126353'],
								cover_i: 12345678
							}
						]
					})
				} as Response;
			}
			if (url.includes('ndlsearch.ndl.go.jp')) {
				return {
					ok: true,
					text: async () => `
						<rss>
							<channel>
								<item>
									<title>実践Svelte入門</title>
									<author>Kyohei Hamaguchi</author>
									<dc:publisher>技術評論社</dc:publisher>
									<dc:identifier xsi:type="dcndl:ISBN">978-4-297-13495-2</dc:identifier>
								</item>
							</channel>
						</rss>
					`
				} as Response;
			}
			return {
				ok: false,
				status: 404,
				json: async () => ({})
			} as Response;
		};
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

	it('returns empty array when query is empty or whitespace', async () => {
		const res1 = await searchBooks('');
		const res2 = await searchBooks('   ');
		assert.deepEqual(res1, []);
		assert.deepEqual(res2, []);
	});

	it('fetches English books by keyword via Open Library', async () => {
		const results = await searchBooks('SvelteKit', 5);
		assert.ok(Array.isArray(results));
		assert.ok(results.length > 0);
		const book = results[0];
		assert.equal(book.title, 'SvelteKit Guide');
		assert.deepEqual(book.authors, ['Rich Harris']);
		// openBD の書影補完が効くため、openBD のカバーが優先される
		assert.equal(book.coverUrl, 'https://cover.openbd.jp/9784297126353.jpg');
	});

	it('fetches books by ISBN-13 via openBD + Open Library (parallel)', async () => {
		const results = await searchBooks('978-4-297-12635-3');
		assert.ok(Array.isArray(results));
		assert.ok(results.length > 0);
		const book = results[0];
		assert.equal(book.isbn13, '9784297126353');
		// openBD has priority for title and cover
		assert.equal(book.title, 'SvelteKit Guide');
		assert.equal(book.coverUrl, 'https://cover.openbd.jp/9784297126353.jpg');
	});

	it('searches Japanese books via NDL + openBD (primary path)', async () => {
		globalThis.fetch = async (input: RequestInfo | URL) => {
			const url = String(input);
			if (url.includes('ndlsearch.ndl.go.jp')) {
				return {
					ok: true,
					text: async () => `
						<rss>
							<channel>
								<item>
									<title>実践Svelte入門</title>
									<author>Kyohei Hamaguchi</author>
									<dc:publisher>技術評論社</dc:publisher>
									<dc:identifier xsi:type="dcndl:ISBN">978-4-297-13495-2</dc:identifier>
								</item>
							</channel>
						</rss>
					`
				} as Response;
			}
			if (url.includes('openbd.jp')) {
				return {
					ok: true,
					json: async () => [
						{
							summary: {
								isbn: '9784297134952',
								title: '実践Svelte入門',
								author: 'Kyohei Hamaguchi',
								publisher: '技術評論社',
								cover: 'https://cover.openbd.jp/9784297134952.jpg'
							}
						}
					]
				} as Response;
			}
			return { ok: false, status: 404 } as Response;
		};

		const results = await searchBooks('実践Svelte', 5);
		assert.ok(results.length > 0);
		assert.equal(results[0].title, '実践Svelte入門');
		assert.equal(results[0].isbn13, '9784297134952');
		assert.equal(results[0].coverUrl, 'https://cover.openbd.jp/9784297134952.jpg');
	});

	it('leaves coverUrl undefined when openBD has no cover (triggers instant placeholder cover)', async () => {
		globalThis.fetch = async (input: RequestInfo | URL) => {
			const url = String(input);
			if (url.includes('ndlsearch.ndl.go.jp')) {
				return {
					ok: true,
					text: async () => `
						<rss>
							<channel>
								<item>
									<title>人間失格</title>
									<author>太宰治</author>
									<dc:publisher>新潮社</dc:publisher>
									<dc:identifier xsi:type="dcndl:ISBN">978-4-10-100601-0</dc:identifier>
								</item>
							</channel>
						</rss>
					`
				} as Response;
			}
			if (url.includes('openbd.jp')) {
				// openBD has no cover for this book
				return { ok: true, json: async () => [null] } as Response;
			}
			return { ok: false, status: 404 } as Response;
		};

		const results = await searchBooks('人間失格', 5);
		assert.ok(results.length > 0);
		assert.equal(results[0].title, '人間失格');
		// openBD に書影がない場合は undefined（仮書影コンポーネントが0msで即時描画される）
		assert.equal(results[0].coverUrl, undefined);
	});

	it('falls back from Open Library to NDL for English query when OL has no results', async () => {
		// Mock: Open Library returns empty, NDL has a result
		globalThis.fetch = async (input: RequestInfo | URL) => {
			const url = String(input);
			if (url.includes('openlibrary.org')) {
				return {
					ok: true,
					json: async () => ({ docs: [] })
				} as Response;
			}
			if (url.includes('ndlsearch.ndl.go.jp')) {
				return {
					ok: true,
					text: async () => `
						<rss>
							<channel>
								<item>
									<title>Rare Book Title</title>
									<author>Some Author</author>
									<dc:publisher>Publisher Co</dc:publisher>
								</item>
							</channel>
						</rss>
					`
				} as Response;
			}
			if (url.includes('openbd.jp')) {
				return { ok: true, json: async () => [null] } as Response;
			}
			return { ok: false, status: 404 } as Response;
		};

		const results = await searchBooks('Rare Book Title', 5);
		assert.ok(results.length > 0);
		assert.equal(results[0].title, 'Rare Book Title');
	});

	it('falls back to CiNii Books when NDL returns 429 Too Many Requests', async () => {
		globalThis.fetch = async (input: RequestInfo | URL) => {
			const url = String(input);
			if (url.includes('ndlsearch.ndl.go.jp')) {
				return {
					ok: false,
					status: 429,
					text: async () => '<code>429</code><message>Too Many Requests</message>'
				} as Response;
			}
			if (url.includes('ci.nii.ac.jp')) {
				return {
					ok: true,
					text: async () => `
						<rdf:RDF>
							<channel><title>CiNii</title></channel>
							<item>
								<title>リーダブルコード : より良いコードを書くためのシンプルな実践テクニック</title>
								<dc:creator>Dustin Boswell, Trevor Foucher</dc:creator>
								<dc:publisher>オライリー・ジャパン</dc:publisher>
								<dcterms:hasPart rdf:resource="urn:isbn:9784873115658"/>
							</item>
						</rdf:RDF>
					`
				} as Response;
			}
			if (url.includes('openbd.jp')) {
				return {
					ok: true,
					json: async () => [
						{
							summary: {
								isbn: '9784873115658',
								title: 'リーダブルコード',
								author: 'Dustin Boswell',
								publisher: 'オライリー・ジャパン',
								cover: 'https://cover.openbd.jp/9784873115658.jpg'
							}
						}
					]
				} as Response;
			}
			return { ok: false, status: 404 } as Response;
		};

		const results = await searchBooks('オライリー', 5);
		assert.ok(results.length > 0);
		assert.equal(results[0].isbn13, '9784873115658');
		assert.equal(results[0].publisher, 'オライリー・ジャパン');
		assert.equal(results[0].coverUrl, 'https://cover.openbd.jp/9784873115658.jpg');
	});

	it('does not call Google Books API (no googleapis.com requests)', async () => {
		let googleBooksCalled = false;
		globalThis.fetch = async (input: RequestInfo | URL) => {
			const url = String(input);
			if (url.includes('googleapis.com')) {
				googleBooksCalled = true;
				return { ok: false, status: 429 } as Response;
			}
			if (url.includes('openlibrary.org')) {
				return {
					ok: true,
					json: async () => ({
						docs: [
							{
								title: 'Test Book',
								author_name: ['Author'],
								isbn: ['9780123456789'],
								cover_i: 99999
							}
						]
					})
				} as Response;
			}
			if (url.includes('openbd.jp')) {
				return { ok: true, json: async () => [null] } as Response;
			}
			return { ok: false, status: 404 } as Response;
		};

		await searchBooks('Test Book', 5);
		assert.equal(googleBooksCalled, false, 'Google Books API should never be called');
	});
});

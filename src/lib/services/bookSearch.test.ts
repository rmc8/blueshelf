import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { searchBooks } from './bookSearch';

describe('BookSearch Service (TDD)', () => {
	const originalFetch = globalThis.fetch;

	beforeEach(() => {
		// Mock fetch responses for fast, deterministic unit tests
		globalThis.fetch = async (input: RequestInfo | URL) => {
			const url = String(input);
			if (url.includes('googleapis.com')) {
				return {
					ok: true,
					json: async () => ({
						items: [
							{
								volumeInfo: {
									title: 'SvelteKit Guide',
									authors: ['Rich Harris'],
									industryIdentifiers: [{ type: 'ISBN_13', identifier: '9784297126353' }],
									imageLinks: { thumbnail: 'https://example.com/cover.jpg' }
								}
							}
						]
					})
				} as Response;
			}
			if (url.includes('openbd.jp')) {
				return {
					ok: true,
					json: async () => [
						{
							summary: {
								isbn: '9784297126353',
								title: 'SvelteKit Guide',
								author: 'Rich Harris',
								publisher: 'Gihyo'
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
								isbn: ['9784297126353']
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

	it('fetches books by keyword (e.g. Svelte)', async () => {
		const results = await searchBooks('SvelteKit', 5);
		assert.ok(Array.isArray(results));
		assert.ok(results.length > 0);
		const book = results[0];
		assert.equal(book.title, 'SvelteKit Guide');
		assert.deepEqual(book.authors, ['Rich Harris']);
	});

	it('fetches books by ISBN-13 (e.g. 9784297126353)', async () => {
		const results = await searchBooks('978-4-297-12635-3');
		assert.ok(Array.isArray(results));
		assert.ok(results.length > 0);
		const book = results[0];
		assert.equal(book.isbn13, '9784297126353');
		assert.equal(book.title, 'SvelteKit Guide');
	});

	it('falls back to NDL and openBD when Google Books API fails or returns 429', async () => {
		// Mock Google Books failure
		globalThis.fetch = async (input: RequestInfo | URL) => {
			const url = String(input);
			if (url.includes('googleapis.com')) {
				return {
					ok: false,
					status: 429,
					json: async () => ({ error: { code: 429, message: 'Quota exceeded' } })
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

		const results = await searchBooks('Svelte', 5);
		assert.ok(results.length > 0);
		assert.equal(results[0].title, '実践Svelte入門');
		assert.equal(results[0].isbn13, '9784297134952');
		assert.equal(results[0].coverUrl, 'https://cover.openbd.jp/9784297134952.jpg');
	});
});

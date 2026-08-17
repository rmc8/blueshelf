import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { searchBooks } from './bookSearch';

// CiNii RSS のモック（opensearch:totalResults 付き）
const MOCK_CINII_RSS = (title: string, author: string, publisher: string, isbn?: string) => `
<rss>
  <channel>
    <opensearch:totalResults>42</opensearch:totalResults>
    <item>
      <title>${title}</title>
      <dc:creator>${author}</dc:creator>
      <dc:publisher>${publisher}</dc:publisher>
      ${isbn ? `<dcterms:hasPart rdf:resource="urn:isbn:${isbn}"/>` : ''}
    </item>
  </channel>
</rss>`;

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
						numFound: 10,
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
			if (url.includes('ci.nii.ac.jp')) {
				return {
					ok: true,
					text: async () =>
						MOCK_CINII_RSS('実践Svelte入門', 'Kyohei Hamaguchi', '技術評論社', '9784297134952')
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

	it('returns empty array and total 0 when query is empty or whitespace', async () => {
		const res1 = await searchBooks('');
		const res2 = await searchBooks('   ');
		assert.deepEqual(res1.books, []);
		assert.equal(res1.total, 0);
		assert.deepEqual(res2.books, []);
		assert.equal(res2.total, 0);
	});

	it('fetches books by keyword and returns SearchResult with books and total', async () => {
		const result = await searchBooks('SvelteKit', 1, 5);
		assert.ok(Array.isArray(result.books));
		assert.ok(result.books.length > 0);
		assert.ok(typeof result.total === 'number');
		// CiNii mock returns totalResults=42
		assert.ok(result.total > 0, 'total should be > 0');

		// 結果に SvelteKit Guide が含まれることを確認
		const sveltekitBook = result.books.find((b) => b.title === 'SvelteKit Guide');
		assert.ok(sveltekitBook, 'SvelteKit Guide should be in results');
		assert.deepEqual(sveltekitBook!.authors, ['Rich Harris']);
		// openBD の書影補完が効くため、openBD のカバーが優先される
		assert.equal(sveltekitBook!.coverUrl, 'https://cover.openbd.jp/9784297126353.jpg');
	});

	it('fetches books by ISBN-13 via openBD + Open Library (parallel)', async () => {
		const result = await searchBooks('978-4-297-12635-3');
		assert.ok(Array.isArray(result.books));
		assert.ok(result.books.length > 0);
		const book = result.books[0];
		assert.equal(book.isbn13, '9784297126353');
		// openBD has priority for title and cover
		assert.equal(book.title, 'SvelteKit Guide');
		assert.equal(book.coverUrl, 'https://cover.openbd.jp/9784297126353.jpg');
	});

	it('searches Japanese books via CiNii + openBD (primary path)', async () => {
		// CiNii mock returns 実践Svelte入門 with ISBN
		globalThis.fetch = async (input: RequestInfo | URL) => {
			const url = String(input);
			if (url.includes('ci.nii.ac.jp')) {
				return {
					ok: true,
					text: async () =>
						MOCK_CINII_RSS('実践Svelte入門', 'Kyohei Hamaguchi', '技術評論社', '9784297134952')
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

		const result = await searchBooks('実践Svelte', 1, 5);
		assert.ok(result.books.length > 0);
		assert.equal(result.books[0].title, '実践Svelte入門');
		assert.equal(result.books[0].isbn13, '9784297134952');
		assert.equal(result.books[0].coverUrl, 'https://cover.openbd.jp/9784297134952.jpg');
	});

	it('uses Google Books cover fallback when openBD has no cover', async () => {
		// CiNii returns 人間失格 with ISBN, openBD has no cover
		globalThis.fetch = async (input: RequestInfo | URL) => {
			const url = String(input);
			if (url.includes('ci.nii.ac.jp')) {
				return {
					ok: true,
					text: async () => MOCK_CINII_RSS('人間失格', '太宰治', '新潮社', '9784101006000')
				} as Response;
			}
			if (url.includes('openbd.jp')) {
				// openBD has no cover for this book (cover is empty string)
				return {
					ok: true,
					json: async () => [
						{
							summary: {
								isbn: '9784101006000',
								title: '人間失格',
								author: '太宰治',
								publisher: '新潮社',
								cover: ''
							}
						}
					]
				} as Response;
			}
			return { ok: false, status: 404 } as Response;
		};

		const result = await searchBooks('人間失格', 1, 5);
		assert.ok(result.books.length > 0);
		assert.equal(result.books[0].title, '人間失格');
		// openBD に書影がない場合は Google Books フォールバック URL が設定される
		assert.ok(
			result.books[0].coverUrl?.includes('books.google.com'),
			'Should fall back to Google Books cover URL'
		);
	});

	it('returns books even when Open Library returns empty results', async () => {
		// Mock: Open Library returns empty, CiNii has a result
		globalThis.fetch = async (input: RequestInfo | URL) => {
			const url = String(input);
			if (url.includes('openlibrary.org')) {
				return {
					ok: true,
					json: async () => ({ numFound: 0, docs: [] })
				} as Response;
			}
			if (url.includes('ci.nii.ac.jp')) {
				return {
					ok: true,
					text: async () =>
						MOCK_CINII_RSS('Rare Book Title', 'Some Author', 'Publisher Co', undefined)
				} as Response;
			}
			if (url.includes('openbd.jp')) {
				return { ok: true, json: async () => [null] } as Response;
			}
			return { ok: false, status: 404 } as Response;
		};

		const result = await searchBooks('Rare Book Title', 1, 5);
		assert.ok(result.books.length > 0);
		assert.equal(result.books[0].title, 'Rare Book Title');
	});

	it('returns CiNii books even when Open Library fails', async () => {
		globalThis.fetch = async (input: RequestInfo | URL) => {
			const url = String(input);
			if (url.includes('ci.nii.ac.jp')) {
				return {
					ok: true,
					text: async () =>
						MOCK_CINII_RSS(
							'リーダブルコード : より良いコードを書くためのシンプルな実践テクニック',
							'Dustin Boswell, Trevor Foucher',
							'オライリー・ジャパン',
							'9784873115658'
						)
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

		const result = await searchBooks('オライリー', 1, 5);
		assert.ok(result.books.length > 0);
		assert.equal(result.books[0].isbn13, '9784873115658');
		assert.equal(result.books[0].publisher, 'オライリー・ジャパン');
		assert.equal(result.books[0].coverUrl, 'https://cover.openbd.jp/9784873115658.jpg');
	});

	it('does not call googleapis.com (Google Books API key endpoint)', async () => {
		// Verify we only use the non-key Google Books content URL for images (not googleapis.com)
		let googleApiCalled = false;
		globalThis.fetch = async (input: RequestInfo | URL) => {
			const url = String(input);
			if (url.includes('googleapis.com')) {
				googleApiCalled = true;
				return { ok: false, status: 429 } as Response;
			}
			if (url.includes('openlibrary.org')) {
				return {
					ok: true,
					json: async () => ({
						numFound: 1,
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

		await searchBooks('Test Book', 1, 5);
		assert.equal(
			googleApiCalled,
			false,
			'googleapis.com (API key endpoint) should never be called'
		);
	});
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { searchBooks } from './bookSearch';

describe('BookSearch Service (TDD)', () => {
	it('returns empty array when query is empty or whitespace', async () => {
		const res1 = await searchBooks('');
		const res2 = await searchBooks('   ');
		assert.deepEqual(res1, []);
		assert.deepEqual(res2, []);
	});

	it('fetches books by keyword (e.g. Svelte)', async () => {
		const results = await searchBooks('SvelteKit', 5);
		assert.ok(Array.isArray(results));
		if (results.length > 0) {
			const book = results[0];
			assert.ok(typeof book.title === 'string');
			assert.ok(Array.isArray(book.authors));
		}
	});

	it('fetches books by ISBN-13 (e.g. 9784297126353)', async () => {
		const results = await searchBooks('978-4-297-12635-3');
		assert.ok(Array.isArray(results));
		if (results.length > 0) {
			const book = results[0];
			assert.ok(book.isbn13?.includes('9784297126353'));
			assert.ok(book.title.length > 0);
		}
	});
});

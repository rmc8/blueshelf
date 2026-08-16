import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { BookRef } from '$lib/types/book';
import { formatReadingStatusRecord, formatReviewRecord, generateRecordKey } from './pdsSync';

describe('PDS Record Formatter & Key Generator (TDD)', () => {
	const mockBook: BookRef = {
		isbn13: '9784297126353',
		title: 'Svelte実践ガイド',
		authors: ['著者名'],
		coverUrl: 'https://example.com/cover.jpg',
		pageCount: 320
	};

	it('generates deterministic record key for ISBN-13', () => {
		const rkey = generateRecordKey(mockBook);
		assert.equal(rkey, '9784297126353');
	});

	it('generates fallback record key for books without ISBN-13', () => {
		const bookWithoutIsbn: BookRef = {
			title: 'A Random Book Title',
			authors: ['Author A']
		};
		const rkey = generateRecordKey(bookWithoutIsbn);
		assert.ok(rkey.length > 0);
		assert.match(rkey, /^[a-z0-9-]+$/);
	});

	it('formats app.blueshelf.readingStatus record properly', () => {
		const record = formatReadingStatusRecord({
			book: mockBook,
			status: 'reading',
			currentPage: 150
		});

		assert.equal(record.$type, 'app.blueshelf.readingStatus');
		assert.equal(record.status, 'reading');
		assert.equal(record.currentPage, 150);
		assert.equal(record.book.isbn13, '9784297126353');
		assert.equal(record.book.title, 'Svelte実践ガイド');
		assert.ok(record.createdAt);
		assert.ok(record.updatedAt);
	});

	it('formats app.blueshelf.review record properly', () => {
		const record = formatReviewRecord({
			book: mockBook,
			rating: 5,
			content: 'とても読みやすくて実用的でした。',
			hasSpoiler: false,
			statusUri: 'at://did:plc:123/app.blueshelf.readingStatus/9784297126353'
		});

		assert.equal(record.$type, 'app.blueshelf.review');
		assert.equal(record.rating, 5);
		assert.equal(record.content, 'とても読みやすくて実用的でした。');
		assert.equal(record.hasSpoiler, false);
		assert.equal(
			record.readingStatusUri,
			'at://did:plc:123/app.blueshelf.readingStatus/9784297126353'
		);
		assert.ok(record.createdAt);
	});
});

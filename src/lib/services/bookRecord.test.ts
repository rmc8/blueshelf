import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { BookRef } from '$lib/types/book';
import { saveReadingRecord } from './bookRecord';

describe('Book Record & Status Management (TDD)', () => {
	const mockBook: BookRef = {
		isbn13: '9784297126353',
		title: 'Svelte実践ガイド',
		authors: ['著者名'],
		pageCount: 320
	};

	it('creates and returns valid ReadingStatusRecord', async () => {
		const res = await saveReadingRecord({
			book: mockBook,
			status: 'reading',
			currentPage: 150
		});

		assert.equal(res.statusRecord.status, 'reading');
		assert.equal(res.statusRecord.currentPage, 150);
		assert.equal(res.statusRecord.book.isbn13, '9784297126353');
		assert.ok(res.statusRecord.createdAt.length > 0);
	});

	it('creates and returns valid ReviewRecord with rating and spoiler flag', async () => {
		const res = await saveReadingRecord({
			book: mockBook,
			status: 'finished',
			rating: 5,
			reviewContent: '非常に実践的で素晴らしい入門書でした。',
			hasSpoiler: true
		});

		assert.equal(res.statusRecord.status, 'finished');
		assert.ok(res.reviewRecord);
		assert.equal(res.reviewRecord?.rating, 5);
		assert.equal(res.reviewRecord?.hasSpoiler, true);
		assert.equal(res.reviewRecord?.content, '非常に実践的で素晴らしい入門書でした。');
	});
});

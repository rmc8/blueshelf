import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { BookRef } from '$lib/types/book';
import { saveReadingRecord, filterAndSortShelfItems, type ShelfItem } from './bookRecord';

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

	it('filters and sorts ShelfItems correctly', () => {
		const items: ShelfItem[] = [
			{
				book: { title: 'B Book', authors: ['Author 1'] },
				statusRecord: {
					book: { title: 'B Book', authors: ['Author 1'] },
					status: 'reading',
					createdAt: '2026-01-01T00:00:00Z'
				},
				reviewRecord: {
					book: { title: 'B Book', authors: ['Author 1'] },
					rating: 3,
					createdAt: '2026-01-01T00:00:00Z'
				}
			},
			{
				book: { title: 'A Book', authors: ['Author 2'] },
				statusRecord: {
					book: { title: 'A Book', authors: ['Author 2'] },
					status: 'finished',
					createdAt: '2026-01-02T00:00:00Z'
				},
				reviewRecord: {
					book: { title: 'A Book', authors: ['Author 2'] },
					rating: 5,
					createdAt: '2026-01-02T00:00:00Z'
				}
			}
		];

		// Filter by status 'finished'
		const finishedOnly = filterAndSortShelfItems(items, 'finished', 'recent');
		assert.equal(finishedOnly.length, 1);
		assert.equal(finishedOnly[0].book.title, 'A Book');

		// Sort by title
		const sortedByTitle = filterAndSortShelfItems(items, 'all', 'title');
		assert.equal(sortedByTitle[0].book.title, 'A Book');
		assert.equal(sortedByTitle[1].book.title, 'B Book');

		// Sort by rating descending
		const sortedByRating = filterAndSortShelfItems(items, 'all', 'rating');
		assert.equal(sortedByRating[0].book.title, 'A Book'); // 5 stars
		assert.equal(sortedByRating[1].book.title, 'B Book'); // 3 stars
	});
});

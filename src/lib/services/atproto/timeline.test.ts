import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { sortTimelineItems, type TimelineItem, type TimelineActor } from './timeline';
import type { BookRef } from '$lib/types/book';

describe('Reading Timeline Service (TDD)', () => {
	const sampleActor1: TimelineActor = {
		did: 'did:plc:alice123',
		handle: 'alice.bsky.social',
		displayName: 'Alice'
	};

	const sampleActor2: TimelineActor = {
		did: 'did:plc:bob456',
		handle: 'bob.bsky.social',
		displayName: 'Bob'
	};

	const sampleBook: BookRef = {
		isbn13: '9784150123512',
		title: 'プロジェクト・ヘイル・メアリー (上)',
		authors: ['アンディ・ウィアー']
	};

	test('sorts timeline items by timestamp in descending order (latest first)', () => {
		const items: TimelineItem[] = [
			{
				actor: sampleActor1,
				type: 'status',
				book: sampleBook,
				statusRecord: {
					book: sampleBook,
					status: 'reading',
					createdAt: '2026-08-16T10:00:00Z'
				},
				timestamp: '2026-08-16T10:00:00Z'
			},
			{
				actor: sampleActor2,
				type: 'review',
				book: sampleBook,
				reviewRecord: {
					book: sampleBook,
					rating: 5,
					content: '最高でした',
					createdAt: '2026-08-16T14:30:00Z'
				},
				timestamp: '2026-08-16T14:30:00Z'
			},
			{
				actor: sampleActor1,
				type: 'quote',
				book: sampleBook,
				quoteRecord: {
					book: sampleBook,
					quoteText: '名言',
					createdAt: '2026-08-16T08:00:00Z'
				},
				timestamp: '2026-08-16T08:00:00Z'
			}
		];

		const sorted = sortTimelineItems(items);

		assert.equal(sorted.length, 3);
		assert.equal(sorted[0].actor.handle, 'bob.bsky.social'); // 14:30
		assert.equal(sorted[1].actor.handle, 'alice.bsky.social'); // 10:00
		assert.equal(sorted[2].actor.handle, 'alice.bsky.social'); // 08:00
	});

	test('handles empty timeline items array gracefully', () => {
		const sorted = sortTimelineItems([]);
		assert.deepEqual(sorted, []);
	});
});

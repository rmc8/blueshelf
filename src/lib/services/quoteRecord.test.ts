import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createQuoteRecord, formatQuoteForShare } from './quoteRecord';
import type { BookRef } from '$lib/types/book';

describe('Quote & Highlight Management (TDD)', () => {
	const sampleBook: BookRef = {
		isbn13: '9784150123512',
		title: 'プロジェクト・ヘイル・メアリー (上)',
		authors: ['アンディ・ウィアー']
	};

	test('creates valid app.blueshelf.quote record structure', () => {
		const record = createQuoteRecord({
			book: sampleBook,
			quoteText: '人類を救うのは、科学と友情だ。',
			pageNumber: 142,
			comment: 'このシーンで涙が出た'
		});

		assert.equal(record.$type, 'app.blueshelf.quote');
		assert.equal(record.book.title, 'プロジェクト・ヘイル・メアリー (上)');
		assert.equal(record.quoteText, '人類を救うのは、科学と友情だ。');
		assert.equal(record.pageNumber, 142);
		assert.equal(record.comment, 'このシーンで涙が出た');
		assert.ok(record.createdAt);
	});

	test('formats quote nicely for sharing', () => {
		const shareText = formatQuoteForShare({
			book: sampleBook,
			quoteText: '人生は短い。',
			pageNumber: 50
		});

		assert.ok(shareText.includes('『プロジェクト・ヘイル・メアリー (上)』 (p.50)'));
		assert.ok(shareText.includes('「人生は短い。」'));
		assert.ok(shareText.includes('#Blueshelf'));
	});
});

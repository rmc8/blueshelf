import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { buildCrosspostText, buildCrosspostFacets, buildExternalEmbed } from './crosspost.js';
import type { BookRef } from '$lib/types/book.js';

describe('Bluesky Crosspost Service (TDD)', () => {
	const sampleBook: BookRef = {
		isbn13: '9784150123512',
		title: 'プロジェクト・ヘイル・メアリー (上)',
		authors: ['アンディ・ウィアー'],
		publisher: '早川書房',
		coverUrl: 'https://books.google.com/cover.jpg'
	};

	test('builds rich post text for finished status with rating and review', () => {
		const text = buildCrosspostText({
			book: sampleBook,
			status: 'finished',
			rating: 5,
			reviewText: '最高のSF小説！ロッキーが最高に愛おしい。'
		});

		assert.ok(text.includes('『プロジェクト・ヘイル・メアリー (上)』を読み終わりました！ (★★★★★)'));
		assert.ok(text.includes('最高のSF小説！ロッキーが最高に愛おしい。'));
		assert.ok(text.includes('#Blueshelf'));
		assert.ok(text.includes('#読書記録'));
	});

	test('builds simple post text for reading status', () => {
		const text = buildCrosspostText({
			book: sampleBook,
			status: 'reading'
		});

		assert.ok(text.includes('『プロジェクト・ヘイル・メアリー (上)』を読み始めました'));
		assert.ok(text.includes('#Blueshelf'));
		assert.ok(text.includes('#読書中'));
	});

	test('builds post text for book quote', () => {
		const text = buildCrosspostText({
			book: sampleBook,
			quoteText: '人類を救うのは、科学と友情だ。',
			pageNumber: 142
		});

		assert.ok(text.includes('『プロジェクト・ヘイル・メアリー (上)』(p.142) より'));
		assert.ok(text.includes('「人類を救うのは、科学と友情だ。」'));
		assert.ok(text.includes('#Blueshelf'));
		assert.ok(text.includes('#読書'));
	});

	test('calculates correct UTF-8 byte facets for hashtags', () => {
		const text = '本を読みました！ #Blueshelf #読書記録';
		const facets = buildCrosspostFacets(text);

		assert.equal(facets.length, 2);
		assert.equal(facets[0].features[0].tag, 'Blueshelf');
		assert.equal(facets[1].features[0].tag, '読書記録');

		// UTF-8 byte offset checks
		const encoder = new TextEncoder();
		const bytes = encoder.encode(text);
		const tag1 = new TextDecoder().decode(
			bytes.slice(facets[0].index.byteStart, facets[0].index.byteEnd)
		);
		assert.equal(tag1, '#Blueshelf');
	});

	test('builds external embed object for rich book card', () => {
		const embed = buildExternalEmbed({
			book: sampleBook,
			url: 'https://bs.rmc-8.com/search?q=9784150123512',
			description: '最高のSF小説！'
		});

		assert.equal(embed.$type, 'app.bsky.embed.external');
		assert.equal(embed.external.uri, 'https://bs.rmc-8.com/search?q=9784150123512');
		assert.ok(embed.external.title.includes('プロジェクト・ヘイル・メアリー (上)'));
		assert.equal(embed.external.description, '最高のSF小説！');
	});
});

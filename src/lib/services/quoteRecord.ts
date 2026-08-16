import type { BookRef } from '$lib/types/book.js';
import type { Agent } from '@atproto/api';

export interface QuoteRecord {
	$type?: 'app.blueshelf.quote';
	book: BookRef;
	quoteText: string;
	pageNumber?: number;
	comment?: string;
	uri?: string;
	cid?: string;
	createdAt: string;
	updatedAt?: string;
}

/**
 * app.blueshelf.quote レコード構造の生成
 */
export function createQuoteRecord(params: {
	book: BookRef;
	quoteText: string;
	pageNumber?: number;
	comment?: string;
}): QuoteRecord {
	const now = new Date().toISOString();
	return {
		$type: 'app.blueshelf.quote',
		book: params.book,
		quoteText: params.quoteText.trim(),
		pageNumber: params.pageNumber,
		comment: params.comment ? params.comment.trim() : undefined,
		createdAt: now,
		updatedAt: now
	};
}

/**
 * 引用の共有テキスト生成
 */
export function formatQuoteForShare(params: {
	book: BookRef;
	quoteText: string;
	pageNumber?: number;
	comment?: string;
}): string {
	const { book, quoteText, pageNumber, comment } = params;
	const pageInfo = pageNumber ? ` (p.${pageNumber})` : '';
	const parts = [`『${book.title}』${pageInfo}`, `「${quoteText.trim()}」`];

	if (comment && comment.trim()) {
		parts.push(`💬 ${comment.trim()}`);
	}

	parts.push('#Blueshelf #読書 #引用');
	return parts.join('\n\n');
}

/**
 * 引用レコードをユーザーの PDS に保存
 */
export async function saveQuoteRecord(
	agent: Agent,
	quote: QuoteRecord
): Promise<{ uri: string; cid: string }> {
	const res = await agent.api.com.atproto.repo.createRecord({
		repo: agent.assertDid,
		collection: 'app.blueshelf.quote',
		record: {
			$type: 'app.blueshelf.quote',
			book: quote.book,
			quoteText: quote.quoteText,
			pageNumber: quote.pageNumber,
			comment: quote.comment,
			createdAt: quote.createdAt,
			updatedAt: new Date().toISOString()
		}
	});

	return {
		uri: res.data.uri,
		cid: res.data.cid
	};
}

/**
 * 指定ユーザーの引用レコード一覧を取得
 */
export async function fetchUserQuotes(agent: Agent, did: string): Promise<QuoteRecord[]> {
	try {
		const res = await agent.api.com.atproto.repo.listRecords({
			repo: did,
			collection: 'app.blueshelf.quote',
			limit: 50
		});

		return res.data.records.map((r) => {
			const value = r.value as unknown as QuoteRecord;
			return {
				...value,
				uri: r.uri,
				cid: r.cid
			};
		});
	} catch (err) {
		console.warn('Failed to fetch user quotes:', err);
		return [];
	}
}

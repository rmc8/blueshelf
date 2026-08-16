import type { BookRef, ReadingStatusType } from '$lib/types/book.js';
import type { Agent } from '@atproto/api';

export interface CrosspostOptions {
	book: BookRef;
	status?: ReadingStatusType;
	rating?: number;
	reviewText?: string;
	quoteText?: string;
	pageNumber?: number;
}

export interface ExternalEmbedParams {
	book: BookRef;
	url: string;
	description?: string;
	thumbBlob?: unknown;
}

/**
 * 読書記録や引用から Bluesky 投稿用のリッチ本文を生成
 */
export function buildCrosspostText(opts: CrosspostOptions): string {
	const { book, status, rating, reviewText, quoteText, pageNumber } = opts;
	const parts: string[] = [];

	if (quoteText) {
		const pageInfo = pageNumber ? `(p.${pageNumber}) ` : '';
		parts.push(`『${book.title}』${pageInfo}より\n\n「${quoteText.trim()}」`);
		parts.push('#Blueshelf #読書');
		return parts.join('\n\n');
	}

	const stars = rating ? ` (${'★'.repeat(rating)}${'☆'.repeat(5 - rating)})` : '';

	if (status === 'finished') {
		parts.push(`『${book.title}』を読み終わりました！${stars}`);
		if (reviewText && reviewText.trim()) {
			parts.push(reviewText.trim());
		}
		parts.push('#Blueshelf #読書記録');
	} else if (status === 'reading') {
		parts.push(`『${book.title}』を読み始めました。${stars}`);
		if (reviewText && reviewText.trim()) {
			parts.push(reviewText.trim());
		}
		parts.push('#Blueshelf #読書中');
	} else if (status === 'want') {
		parts.push(`『${book.title}』を読みたい本に追加しました。`);
		parts.push('#Blueshelf #読みたい本');
	} else if (status === 'backlog') {
		parts.push(`『${book.title}』を積読に追加しました。`);
		parts.push('#Blueshelf #積読');
	} else if (status === 'dropped') {
		parts.push(`『${book.title}』を中断しました。`);
		parts.push('#Blueshelf #読書');
	} else {
		parts.push(`『${book.title}』${stars}`);
		if (reviewText && reviewText.trim()) {
			parts.push(reviewText.trim());
		}
		parts.push('#Blueshelf #読書');
	}

	return parts.join('\n\n');
}

/**
 * UTF-8 バイトインデックスに基づきハッシュタグ Facets を生成
 */
export function buildCrosspostFacets(text: string): Array<{
	index: { byteStart: number; byteEnd: number };
	features: Array<{ $type: string; tag: string }>;
}> {
	const facets: Array<{
		index: { byteStart: number; byteEnd: number };
		features: Array<{ $type: string; tag: string }>;
	}> = [];

	const encoder = new TextEncoder();
	const hashtagRegex = /#([\p{L}\p{N}_]+)/gu;
	let match: RegExpExecArray | null;

	while ((match = hashtagRegex.exec(text)) !== null) {
		const fullTag = match[0];
		const tagValue = match[1];
		const charIndex = match.index;

		// UTF-8 バイト長を正確に算出
		const textBefore = text.slice(0, charIndex);
		const byteStart = encoder.encode(textBefore).length;
		const byteEnd = byteStart + encoder.encode(fullTag).length;

		facets.push({
			index: { byteStart, byteEnd },
			features: [
				{
					$type: 'app.bsky.richtext.facet#tag',
					tag: tagValue
				}
			]
		});
	}

	return facets;
}

export interface ExternalEmbedResult {
	$type: 'app.bsky.embed.external';
	external: {
		uri: string;
		title: string;
		description: string;
		thumb?: unknown;
	};
}

/**
 * 書影・タイトル付きリッチカード Embed (External Embed) を構築
 */
export function buildExternalEmbed(params: ExternalEmbedParams): ExternalEmbedResult {
	const { book, url, description, thumbBlob } = params;
	const authorsStr = book.authors && book.authors.length > 0 ? ` (${book.authors.join(', ')})` : '';

	const external: {
		uri: string;
		title: string;
		description: string;
		thumb?: unknown;
	} = {
		uri: url,
		title: `${book.title}${authorsStr}`,
		description: description || book.publisher || 'Blueshelf 読書記録'
	};

	if (thumbBlob) {
		external.thumb = thumbBlob;
	}

	return {
		$type: 'app.bsky.embed.external',
		external
	};
}

/**
 * Bluesky へポストを同時投稿
 */
export async function postToBluesky(
	agent: Agent,
	opts: {
		text: string;
		book?: BookRef;
		url?: string;
		description?: string;
		thumbBlob?: unknown;
	}
): Promise<{ uri: string; cid: string }> {
	const { text, book, url, description, thumbBlob } = opts;
	const facets = buildCrosspostFacets(text);

	let embed: unknown = undefined;
	if (book && url) {
		embed = buildExternalEmbed({
			book,
			url,
			description,
			thumbBlob
		});
	}

	const record: Record<string, unknown> = {
		$type: 'app.bsky.feed.post',
		text,
		facets: facets.length > 0 ? facets : undefined,
		embed,
		langs: ['ja'],
		createdAt: new Date().toISOString()
	};

	const res = await agent.post(record as Parameters<Agent['post']>[0]);
	return {
		uri: res.uri,
		cid: res.cid
	};
}

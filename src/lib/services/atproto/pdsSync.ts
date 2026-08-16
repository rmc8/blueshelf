import type {
	BookRef,
	ReadingStatusType,
	ReadingStatusRecord,
	ReviewRecord
} from '$lib/types/book';
import type { Agent } from '@atproto/api';

export const LEXICON_COLLECTIONS = {
	READING_STATUS: 'app.blueshelf.readingStatus',
	REVIEW: 'app.blueshelf.review'
} as const;

export interface FormatReadingStatusParams {
	book: BookRef;
	status: ReadingStatusType;
	currentPage?: number;
}

export interface FormatReviewParams {
	book: BookRef;
	rating?: number;
	content?: string;
	hasSpoiler?: boolean;
	statusUri?: string;
}

/**
 * 書籍から一意なレコードキー（rkey）を生成
 */
export function generateRecordKey(book: BookRef): string {
	if (book.isbn13) {
		return book.isbn13.replace(/[^0-9]/g, '');
	}
	// ISBNがない場合はタイトルと著者から正規化されたキーを生成
	const raw = `${book.title}-${book.authors?.[0] || ''}`
		.toLowerCase()
		.replace(/[\s\W_]+/g, '-')
		.replace(/^-+|-+$/g, '');
	return raw || 'unknown-book';
}

/**
 * app.blueshelf.readingStatus レコード形式に整形
 */
export function formatReadingStatusRecord(params: FormatReadingStatusParams) {
	const now = new Date().toISOString();
	return {
		$type: LEXICON_COLLECTIONS.READING_STATUS,
		book: params.book,
		status: params.status,
		currentPage: params.currentPage,
		createdAt: now,
		updatedAt: now
	};
}

/**
 * app.blueshelf.review レコード形式に整形
 */
export function formatReviewRecord(params: FormatReviewParams) {
	const now = new Date().toISOString();
	return {
		$type: LEXICON_COLLECTIONS.REVIEW,
		book: params.book,
		rating: params.rating,
		content: params.content,
		hasSpoiler: params.hasSpoiler ?? false,
		readingStatusUri: params.statusUri,
		createdAt: now,
		updatedAt: now
	};
}

/**
 * PDS に読書ステータスを保存（putRecord）
 */
export async function putReadingStatusToPds(
	agent: Agent,
	repo: string,
	params: FormatReadingStatusParams
): Promise<{ uri: string; cid: string }> {
	const rkey = generateRecordKey(params.book);
	const record = formatReadingStatusRecord(params);
	const res = await agent.com.atproto.repo.putRecord({
		repo,
		collection: LEXICON_COLLECTIONS.READING_STATUS,
		rkey,
		record
	});
	return { uri: res.data.uri, cid: res.data.cid };
}

/**
 * PDS に書評を保存（putRecord）
 */
export async function putReviewToPds(
	agent: Agent,
	repo: string,
	params: FormatReviewParams
): Promise<{ uri: string; cid: string }> {
	const rkey = generateRecordKey(params.book);
	const record = formatReviewRecord(params);
	const res = await agent.com.atproto.repo.putRecord({
		repo,
		collection: LEXICON_COLLECTIONS.REVIEW,
		rkey,
		record
	});
	return { uri: res.data.uri, cid: res.data.cid };
}

/**
 * PDS からレコードを削除（deleteRecord）
 */
export async function deleteRecordFromPds(
	agent: Agent,
	repo: string,
	collection: string,
	book: BookRef
): Promise<void> {
	const rkey = generateRecordKey(book);
	await agent.com.atproto.repo.deleteRecord({
		repo,
		collection,
		rkey
	});
}

/**
 * PDS からユーザーの全読書ステータスを取得（listRecords）
 */
export async function fetchPdsReadingStatuses(
	agent: Agent,
	repo: string
): Promise<ReadingStatusRecord[]> {
	try {
		const res = await agent.com.atproto.repo.listRecords({
			repo,
			collection: LEXICON_COLLECTIONS.READING_STATUS,
			limit: 100
		});
		return res.data.records.map((r) => ({
			uri: r.uri,
			cid: r.cid,
			...(r.value as Omit<ReadingStatusRecord, 'uri' | 'cid'>)
		}));
	} catch {
		return [];
	}
}

/**
 * PDS からユーザーの全書評を取得（listRecords）
 */
export async function fetchPdsReviews(agent: Agent, repo: string): Promise<ReviewRecord[]> {
	try {
		const res = await agent.com.atproto.repo.listRecords({
			repo,
			collection: LEXICON_COLLECTIONS.REVIEW,
			limit: 100
		});
		return res.data.records.map((r) => ({
			uri: r.uri,
			cid: r.cid,
			...(r.value as Omit<ReviewRecord, 'uri' | 'cid'>)
		}));
	} catch {
		return [];
	}
}

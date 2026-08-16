import { db } from '$lib/db';
import type {
	BookRef,
	ReadingStatusRecord,
	ReviewRecord,
	ReadingStatusType
} from '$lib/types/book';
import { getAgent, getSession } from '$lib/services/atproto/oauth';
import {
	putReadingStatusToPds,
	putReviewToPds,
	deleteRecordFromPds,
	LEXICON_COLLECTIONS
} from '$lib/services/atproto/pdsSync';

export interface SaveRecordParams {
	book: BookRef;
	status: ReadingStatusType;
	currentPage?: number;
	rating?: number;
	reviewContent?: string;
	hasSpoiler?: boolean;
}

export interface ShelfItem {
	book: BookRef;
	statusRecord: ReadingStatusRecord;
	reviewRecord?: ReviewRecord;
}

export type ShelfSortBy = 'recent' | 'title' | 'rating';
export type ShelfStatusFilter = 'all' | ReadingStatusType;

/**
 * 読書記録 & レビューを IndexedDB (Dexie) および PDS に保存
 */
export async function saveReadingRecord(params: SaveRecordParams): Promise<{
	statusRecord: ReadingStatusRecord;
	reviewRecord?: ReviewRecord;
}> {
	const now = new Date().toISOString();
	const bookKey = params.book.isbn13 || params.book.title;
	const statusUri = `local:status:${bookKey}`;

	const statusRecord: ReadingStatusRecord = {
		uri: statusUri,
		book: params.book,
		status: params.status,
		currentPage: params.currentPage,
		createdAt: now,
		updatedAt: now
	};

	if (typeof indexedDB !== 'undefined') {
		try {
			await db.readingStatuses.put(statusRecord);
		} catch {
			// Ignore in SSR / Node
		}
	}

	let reviewRecord: ReviewRecord | undefined;
	if (params.rating || params.reviewContent?.trim()) {
		const reviewUri = `local:review:${bookKey}`;
		reviewRecord = {
			uri: reviewUri,
			book: params.book,
			rating: params.rating,
			content: params.reviewContent?.trim(),
			hasSpoiler: params.hasSpoiler ?? false,
			readingStatusUri: statusUri,
			createdAt: now,
			updatedAt: now
		};

		if (typeof indexedDB !== 'undefined') {
			try {
				await db.reviews.put(reviewRecord);
			} catch {
				// Ignore in SSR / Node
			}
		}
	}

	// ログイン中の場合は PDS に非同期同期（バックグラウンド）
	const agent = getAgent();
	const session = getSession();
	if (agent && session?.did) {
		putReadingStatusToPds(agent, session.did, {
			book: params.book,
			status: params.status,
			currentPage: params.currentPage
		}).catch((err) => {
			console.warn('PDS readingStatus sync failed:', err);
		});

		if (reviewRecord) {
			putReviewToPds(agent, session.did, {
				book: params.book,
				rating: params.rating,
				content: params.reviewContent?.trim(),
				hasSpoiler: params.hasSpoiler,
				statusUri
			}).catch((err) => {
				console.warn('PDS review sync failed:', err);
			});
		}
	}

	return { statusRecord, reviewRecord };
}

/**
 * 指定した書籍の現在のステータスとレビューを取得
 */
export async function getBookRecord(bookKey: string): Promise<{
	statusRecord?: ReadingStatusRecord;
	reviewRecord?: ReviewRecord;
}> {
	if (typeof indexedDB === 'undefined') return {};

	try {
		const statusUri = `local:status:${bookKey}`;
		const reviewUri = `local:review:${bookKey}`;
		const [statusRecord, reviewRecord] = await Promise.all([
			db.readingStatuses.get(statusUri),
			db.reviews.get(reviewUri)
		]);
		return { statusRecord, reviewRecord };
	} catch {
		return {};
	}
}

/**
 * 本棚の全アイテムを取得
 */
export async function getAllReadingRecords(): Promise<ShelfItem[]> {
	if (typeof indexedDB === 'undefined') return [];

	try {
		const [statuses, reviews] = await Promise.all([
			db.readingStatuses.toArray(),
			db.reviews.toArray()
		]);

		const reviewMap = new Map<string, ReviewRecord>();
		for (const rev of reviews) {
			const key = rev.book?.isbn13 || rev.book?.title;
			if (key) reviewMap.set(key, rev);
		}

		return statuses.map((statusRecord) => {
			const key = statusRecord.book?.isbn13 || statusRecord.book?.title;
			return {
				book: statusRecord.book,
				statusRecord,
				reviewRecord: key ? reviewMap.get(key) : undefined
			};
		});
	} catch {
		return [];
	}
}

/**
 * 本棚から書籍記録を削除
 */
export async function deleteReadingRecord(book: BookRef): Promise<boolean> {
	const bookKey = book.isbn13 || book.title;
	if (typeof indexedDB !== 'undefined') {
		try {
			const statusUri = `local:status:${bookKey}`;
			const reviewUri = `local:review:${bookKey}`;
			await Promise.all([db.readingStatuses.delete(statusUri), db.reviews.delete(reviewUri)]);
		} catch {
			// Ignore
		}
	}

	// ログイン中の場合は PDS からも削除
	const agent = getAgent();
	const session = getSession();
	if (agent && session?.did) {
		Promise.all([
			deleteRecordFromPds(agent, session.did, LEXICON_COLLECTIONS.READING_STATUS, book),
			deleteRecordFromPds(agent, session.did, LEXICON_COLLECTIONS.REVIEW, book)
		]).catch((err) => {
			console.warn('PDS record deletion failed:', err);
		});
	}

	return true;
}

/**
 * 本棚アイテムのフィルタリング & ソート
 */
export function filterAndSortShelfItems(
	items: ShelfItem[],
	statusFilter: ShelfStatusFilter = 'all',
	sortBy: ShelfSortBy = 'recent'
): ShelfItem[] {
	let filtered = items;
	if (statusFilter !== 'all') {
		filtered = items.filter((item) => item.statusRecord.status === statusFilter);
	}

	return [...filtered].sort((a, b) => {
		if (sortBy === 'title') {
			return (a.book.title || '').localeCompare(b.book.title || '', 'ja');
		}
		if (sortBy === 'rating') {
			const ratingA = a.reviewRecord?.rating || 0;
			const ratingB = b.reviewRecord?.rating || 0;
			return ratingB - ratingA;
		}
		// 'recent' (default)
		const dateA = new Date(a.statusRecord.updatedAt || a.statusRecord.createdAt).getTime();
		const dateB = new Date(b.statusRecord.updatedAt || b.statusRecord.createdAt).getTime();
		return dateB - dateA;
	});
}

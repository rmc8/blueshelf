import { db } from '$lib/db';
import type {
	BookRef,
	ReadingStatusRecord,
	ReviewRecord,
	ReadingStatusType
} from '$lib/types/book';

export interface SaveRecordParams {
	book: BookRef;
	status: ReadingStatusType;
	currentPage?: number;
	rating?: number;
	reviewContent?: string;
	hasSpoiler?: boolean;
}

/**
 * 読書記録 & レビューを IndexedDB (Dexie) に即時保存
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

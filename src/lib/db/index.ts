import { Dexie, type Table } from 'dexie';
import type { ReadingStatusRecord, ReviewRecord } from '$lib/types/book';

export interface CachedBook {
	id: string; // isbn13 または googleBooksId
	isbn13?: string;
	title: string;
	authors: string[];
	publisher?: string;
	publishedDate?: string;
	coverUrl?: string;
	pageCount?: number;
	description?: string;
	cachedAt: number;
}

export interface OfflineMutation {
	id?: number;
	type: 'create_status' | 'update_status' | 'delete_status' | 'create_review';
	collection: string;
	rkey?: string;
	record: unknown;
	createdAt: number;
	synced: boolean;
}

export class BlueshelfDatabase extends Dexie {
	books!: Table<CachedBook, string>;
	readingStatuses!: Table<ReadingStatusRecord, string>;
	reviews!: Table<ReviewRecord, string>;
	offlineQueue!: Table<OfflineMutation, number>;

	constructor() {
		super('blueshelf_db');
		this.version(2).stores({
			books: 'id, isbn13, title, *authors, cachedAt',
			readingStatuses: 'uri, status, createdAt, updatedAt',
			reviews: 'uri, rating, createdAt',
			offlineQueue: '++id, type, collection, createdAt, synced'
		});
	}
}

// Node.js / SSR テスト実行時に Dexie のタイマー/MessagePort がプロセスをハングさせないよう保護
function createDatabaseInstance(): BlueshelfDatabase {
	if (typeof indexedDB === 'undefined') {
		const dummyTable = {
			get: async () => undefined,
			put: async () => undefined,
			delete: async () => undefined,
			toArray: async () => [],
			where: () => ({ equals: () => ({ toArray: async () => [] }) }),
			clear: async () => undefined
		};
		return new Proxy({} as BlueshelfDatabase, {
			get: (target, prop) => {
				if (prop === 'close') return () => {};
				if (prop === 'open') return async () => {};
				return dummyTable;
			}
		});
	}
	return new BlueshelfDatabase();
}

export const db = createDatabaseInstance();

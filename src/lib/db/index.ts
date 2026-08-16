import Dexie, { type Table } from 'dexie';
import type { BookRef, ReadingStatusRecord, ReviewRecord } from '$lib/types/book';

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
	record: any;
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
		this.version(1).stores({
			books: 'id, isbn13, title, *authors, cachedAt',
			readingStatuses: 'uri, status, [book.isbn13+status], createdAt, updatedAt',
			reviews: 'uri, [book.isbn13], rating, createdAt',
			offlineQueue: '++id, type, collection, createdAt, synced'
		});
	}
}

export const db = new BlueshelfDatabase();

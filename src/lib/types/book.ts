export type ReadingStatusType = 'want' | 'reading' | 'finished' | 'backlog' | 'dropped';

export interface BookRef {
	isbn13?: string;
	isbn10?: string;
	asin?: string;
	title: string;
	authors: string[];
	publisher?: string;
	publishedDate?: string;
	coverUrl?: string;
	pageCount?: number;
	description?: string;
}

export interface ReadingStatusRecord {
	uri?: string;
	cid?: string;
	book: BookRef;
	status: ReadingStatusType;
	currentPage?: number;
	startedAt?: string;
	finishedAt?: string;
	shelves?: string[];
	createdAt: string;
	updatedAt?: string;
}

export interface ReviewRecord {
	uri?: string;
	cid?: string;
	book: BookRef;
	rating?: number; // 1〜5
	content?: string;
	hasSpoiler?: boolean;
	readingStatusUri?: string;
	bskyPostUri?: string;
	createdAt: string;
	updatedAt?: string;
}

export interface CustomShelfRecord {
	uri?: string;
	cid?: string;
	name: string;
	slug: string;
	description?: string;
	color?: string;
	isPublic?: boolean;
	createdAt: string;
}

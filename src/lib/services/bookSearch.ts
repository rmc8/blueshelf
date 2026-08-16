import { db, type CachedBook } from '$lib/db';
import type { BookRef } from '$lib/types/book';

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30日

/**
 * ISBN または キーワードから書籍を検索
 */
export async function searchBooks(query: string, maxResults = 20): Promise<BookRef[]> {
	const trimmed = query.trim();
	if (!trimmed) return [];

	const isIsbn = /^(\d{10}|\d{13})$/.test(trimmed.replace(/-/g, ''));
	const cleanedIsbn = isIsbn ? trimmed.replace(/-/g, '') : null;

	if (cleanedIsbn) {
		const cached = await db.books.get(cleanedIsbn);
		if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
			return [cached];
		}
		return fetchByIsbn(cleanedIsbn);
	}

	return fetchByKeyword(trimmed, maxResults);
}

/**
 * ISBNによるハイブリッド取得（Google Books + openBD書影補完）
 */
async function fetchByIsbn(isbn: string): Promise<BookRef[]> {
	const [gbooksResult, openbdResult] = await Promise.allSettled([
		fetchGoogleBooks(`isbn:${isbn}`, 1),
		fetchOpenBd(isbn)
	]);

	const gbook = gbooksResult.status === 'fulfilled' ? gbooksResult.value[0] : null;
	const openbd = openbdResult.status === 'fulfilled' ? openbdResult.value : null;

	if (!gbook && !openbd) return [];

	const merged: BookRef = {
		isbn13: isbn.length === 13 ? isbn : openbd?.isbn13 || gbook?.isbn13,
		isbn10: isbn.length === 10 ? isbn : gbook?.isbn10,
		title: openbd?.title || gbook?.title || 'Unknown Title',
		authors: openbd?.authors?.length ? openbd.authors : gbook?.authors || ['Unknown Author'],
		publisher: openbd?.publisher || gbook?.publisher,
		publishedDate: openbd?.publishedDate || gbook?.publishedDate,
		coverUrl: openbd?.coverUrl || gbook?.coverUrl,
		pageCount: openbd?.pageCount || gbook?.pageCount,
		description: openbd?.description || gbook?.description
	};

	await saveToCache(merged.isbn13 || isbn, merged);
	return [merged];
}

/**
 * キーワードによるGoogle Books API検索
 */
async function fetchByKeyword(query: string, maxResults: number): Promise<BookRef[]> {
	return fetchGoogleBooks(query, maxResults);
}

async function fetchGoogleBooks(q: string, maxResults: number): Promise<BookRef[]> {
	const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=${maxResults}`;
	const res = await fetch(url);
	if (!res.ok) return [];

	const data = await res.json();
	if (!data.items?.length) return [];

	const books: BookRef[] = [];

	for (const item of data.items) {
		const info = item.volumeInfo || {};
		const industryIdentifiers = info.industryIdentifiers || [];
		const isbn13Obj = industryIdentifiers.find((id: any) => id.type === 'ISBN_13');
		const isbn10Obj = industryIdentifiers.find((id: any) => id.type === 'ISBN_10');

		const coverUrl =
			info.imageLinks?.thumbnail?.replace('http://', 'https://') ||
			info.imageLinks?.smallThumbnail?.replace('http://', 'https://');

		const book: BookRef = {
			isbn13: isbn13Obj?.identifier,
			isbn10: isbn10Obj?.identifier,
			title: info.title || 'Untitled',
			authors: info.authors || ['Unknown Author'],
			publisher: info.publisher,
			publishedDate: info.publishedDate,
			coverUrl,
			pageCount: info.pageCount,
			description: info.description
		};

		books.push(book);
		if (book.isbn13) {
			saveToCache(book.isbn13, book).catch(() => {});
		}
	}

	return books;
}

async function fetchOpenBd(isbn: string): Promise<BookRef | null> {
	const url = `https://api.openbd.jp/v1/get?isbn=${isbn}`;
	const res = await fetch(url);
	if (!res.ok) return null;

	const data = await res.json();
	const item = data?.[0];
	if (!item) return null;

	const summary = item.summary || {};
	const onix = item.onix || {};

	return {
		isbn13: summary.isbn,
		title: summary.title,
		authors: summary.author ? [summary.author] : [],
		publisher: summary.publisher,
		publishedDate: summary.pubdate,
		coverUrl: summary.cover || onix.CollateralDetail?.SupportingResource?.[0]?.ResourceVersion?.[0]?.ResourceLink,
		description: item.onix?.CollateralDetail?.TextContent?.[0]?.Text
	};
}

async function saveToCache(id: string, book: BookRef) {
	const cached: CachedBook = {
		id,
		...book,
		cachedAt: Date.now()
	};
	await db.books.put(cached);
}

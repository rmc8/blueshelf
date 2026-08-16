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
		if (typeof indexedDB !== 'undefined') {
			try {
				const cached = await db.books.get(cleanedIsbn);
				if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
					return [cached];
				}
			} catch {
				// IndexedDB missing in SSR / Node test
			}
		}
		return fetchByIsbn(cleanedIsbn);
	}

	return fetchByKeyword(trimmed, maxResults);
}

/**
 * ISBNによるハイブリッド取得（openBD + Google Books + Open Library）
 */
async function fetchByIsbn(isbn: string): Promise<BookRef[]> {
	const [openbdResult, gbooksResult, olResult] = await Promise.allSettled([
		fetchOpenBd(isbn),
		fetchGoogleBooks(`isbn:${isbn}`, 1),
		fetchOpenLibrary(`isbn/${isbn}`)
	]);

	const openbd = openbdResult.status === 'fulfilled' ? openbdResult.value : null;
	const gbook = gbooksResult.status === 'fulfilled' ? gbooksResult.value[0] : null;
	const ol = olResult.status === 'fulfilled' ? olResult.value[0] : null;

	if (!openbd && !gbook && !ol) return [];

	const merged: BookRef = {
		isbn13: isbn.length === 13 ? isbn : openbd?.isbn13 || gbook?.isbn13 || ol?.isbn13,
		isbn10: isbn.length === 10 ? isbn : gbook?.isbn10 || ol?.isbn10,
		title: openbd?.title || gbook?.title || ol?.title || 'Unknown Title',
		authors: openbd?.authors?.length
			? openbd.authors
			: gbook?.authors || ol?.authors || ['Unknown Author'],
		publisher: openbd?.publisher || gbook?.publisher || ol?.publisher,
		publishedDate: openbd?.publishedDate || gbook?.publishedDate || ol?.publishedDate,
		coverUrl: openbd?.coverUrl || gbook?.coverUrl || ol?.coverUrl,
		pageCount: openbd?.pageCount || gbook?.pageCount || ol?.pageCount,
		description: openbd?.description || gbook?.description || ol?.description
	};

	await saveToCache(merged.isbn13 || isbn, merged);
	return [merged];
}

/**
 * キーワードによるハイブリッド検索（Google Books -> NDL 国立国会図書館サーチ -> Open Library -> openBD 書影補完）
 */
async function fetchByKeyword(query: string, maxResults: number): Promise<BookRef[]> {
	// 1. Google Books API を試行
	const gbooks = await fetchGoogleBooks(query, maxResults);
	if (gbooks.length > 0) {
		return gbooks;
	}

	// 2. Google Books 制限(429) / ヒットなし時、NDL (国立国会図書館サーチ OpenSearch) + openBD 書影補完を実行
	const ndlBooks = await fetchNdlSearch(query, maxResults);
	if (ndlBooks.length > 0) {
		return ndlBooks;
	}

	// 3. Open Library API (洋書・グローバル書誌) をフォールバック実行
	const olBooks = await fetchOpenLibrary(query, maxResults);
	if (olBooks.length > 0) {
		return olBooks;
	}

	return [];
}

/**
 * 国立国会図書館サーチ (NDL OpenSearch API) + openBD 公式書影補完
 */
async function fetchNdlSearch(query: string, maxResults = 20): Promise<BookRef[]> {
	try {
		const url = `https://ndlsearch.ndl.go.jp/api/opensearch?any=${encodeURIComponent(query)}&cnt=${maxResults}`;
		const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
		if (!res.ok) return [];

		const xml = await res.text();
		const items = xml.split('<item>').slice(1);
		if (items.length === 0) return [];

		const isbnsToLookup: string[] = [];
		const rawBooks: BookRef[] = [];

		for (const itemXml of items) {
			const titleMatch = /<dc:title>([^<]+)<\/dc:title>|<title>([^<]+)<\/title>/.exec(itemXml);
			const title = titleMatch ? (titleMatch[1] || titleMatch[2]).trim() : '';
			if (!title) continue;

			// 著者名
			const authorMatch = /<dc:creator>([^<]+)<\/dc:creator>|<author>([^<]+)<\/author>/.exec(
				itemXml
			);
			const author = authorMatch ? (authorMatch[1] || authorMatch[2]).trim() : undefined;
			const authors = author ? [author.replace(/,\s*\d{4}-?/g, '')] : ['不明な著者'];

			// 出版社
			const pubMatch = /<dc:publisher>([^<]+)<\/dc:publisher>/.exec(itemXml);
			const publisher = pubMatch ? pubMatch[1].trim() : undefined;

			// 出版日
			const dateMatch =
				/<dcterms:issued>([^<]+)<\/dcterms:issued>|<dc:date[^>]*>([^<]+)<\/dc:date>/.exec(itemXml);
			const publishedDate = dateMatch ? (dateMatch[1] || dateMatch[2]).trim() : undefined;

			// ISBN
			const isbnMatch = /<dc:identifier[^>]*ISBN[^>]*>([0-9Xx-]+)<\/dc:identifier>/.exec(itemXml);
			const cleanedIsbn = isbnMatch ? isbnMatch[1].replace(/-/g, '').trim() : undefined;
			const isbn13 = cleanedIsbn && cleanedIsbn.length === 13 ? cleanedIsbn : undefined;
			const isbn10 = cleanedIsbn && cleanedIsbn.length === 10 ? cleanedIsbn : undefined;

			if (isbn13) {
				isbnsToLookup.push(isbn13);
			}

			rawBooks.push({
				isbn13,
				isbn10,
				title,
				authors,
				publisher,
				publishedDate
			});
		}

		// openBD から公式書影・解説を一括取得
		const openbdMap = await fetchOpenBdBatches(isbnsToLookup);

		return rawBooks.map((book) => {
			if (book.isbn13 && openbdMap.has(book.isbn13)) {
				const bd = openbdMap.get(book.isbn13)!;
				return {
					...book,
					coverUrl: bd.coverUrl || book.coverUrl,
					description: bd.description || book.description,
					publisher: bd.publisher || book.publisher
				};
			}
			return book;
		});
	} catch (e) {
		console.warn('NDL search failed:', e);
		return [];
	}
}

/**
 * Google Books API 検索
 */
async function fetchGoogleBooks(q: string, maxResults: number): Promise<BookRef[]> {
	try {
		const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=${maxResults}`;
		const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
		if (!res.ok) return [];

		const data = await res.json();
		if (!data.items?.length) return [];

		const books: BookRef[] = [];

		for (const item of data.items) {
			const info = item.volumeInfo || {};
			const industryIdentifiers = (info.industryIdentifiers || []) as Array<{
				type?: string;
				identifier?: string;
			}>;
			const isbn13Obj = industryIdentifiers.find((id) => id.type === 'ISBN_13');
			const isbn10Obj = industryIdentifiers.find((id) => id.type === 'ISBN_10');

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
	} catch {
		return [];
	}
}

/**
 * Open Library API 検索 (CORS 完全対応・無料・キー不要) + openBD 書影補完
 */
async function fetchOpenLibrary(query: string, maxResults = 20): Promise<BookRef[]> {
	try {
		const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=${maxResults}`;
		const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
		if (!res.ok) return [];

		const data = await res.json();
		if (!data.docs?.length) return [];

		const isbnsToLookup: string[] = [];
		const rawBooks: BookRef[] = [];

		for (const doc of data.docs) {
			const isbn13 = doc.isbn?.find((id: string) => id.length === 13);
			const isbn10 = doc.isbn?.find((id: string) => id.length === 10);
			const primaryIsbn = isbn13 || isbn10 || doc.isbn?.[0];

			let coverUrl: string | undefined;
			if (doc.cover_i) {
				coverUrl = `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`;
			} else if (primaryIsbn) {
				coverUrl = `https://covers.openlibrary.org/b/isbn/${primaryIsbn}-M.jpg`;
			}

			if (isbn13) isbnsToLookup.push(isbn13);

			rawBooks.push({
				isbn13,
				isbn10,
				title: doc.title || 'Untitled',
				authors: doc.author_name || ['Unknown Author'],
				publisher: doc.publisher?.[0],
				publishedDate: doc.first_publish_year ? String(doc.first_publish_year) : undefined,
				coverUrl
			});
		}

		// openBD から和書の公式書影を一括取得して補完
		const openbdMap = await fetchOpenBdBatches(isbnsToLookup);

		return rawBooks.map((book) => {
			if (book.isbn13 && openbdMap.has(book.isbn13)) {
				const bd = openbdMap.get(book.isbn13)!;
				return {
					...book,
					coverUrl: bd.coverUrl || book.coverUrl,
					description: bd.description || book.description,
					publisher: bd.publisher || book.publisher
				};
			}
			return book;
		});
	} catch (e) {
		console.warn('Open Library search failed:', e);
		return [];
	}
}

/**
 * openBD API (複数ISBNの一括書影・詳細取得)
 */
async function fetchOpenBdBatches(isbns: string[]): Promise<Map<string, Partial<BookRef>>> {
	const map = new Map<string, Partial<BookRef>>();
	if (isbns.length === 0) return map;

	try {
		const url = `https://api.openbd.jp/v1/get?isbn=${isbns.slice(0, 20).join(',')}`;
		const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
		if (!res.ok) return map;

		const data = await res.json();
		for (const item of data) {
			if (!item) continue;
			const summary = item.summary || {};
			const onix = item.onix || {};
			const isbn13 = summary.isbn;
			if (!isbn13) continue;

			map.set(isbn13, {
				coverUrl:
					summary.cover ||
					onix.CollateralDetail?.SupportingResource?.[0]?.ResourceVersion?.[0]?.ResourceLink,
				description: item.onix?.CollateralDetail?.TextContent?.[0]?.Text,
				publisher: summary.publisher
			});
		}
	} catch {
		// Ignore openBD batch error
	}
	return map;
}

/**
 * 単一ISBNによるopenBD取得
 */
async function fetchOpenBd(isbn: string): Promise<BookRef | null> {
	try {
		const res = await fetch(`https://api.openbd.jp/v1/get?isbn=${isbn}`, {
			signal: AbortSignal.timeout(5000)
		});
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
			coverUrl:
				summary.cover ||
				onix.CollateralDetail?.SupportingResource?.[0]?.ResourceVersion?.[0]?.ResourceLink,
			description: item.onix?.CollateralDetail?.TextContent?.[0]?.Text
		};
	} catch {
		return null;
	}
}

async function saveToCache(id: string, book: BookRef) {
	if (typeof indexedDB === 'undefined') return;
	try {
		const cached: CachedBook = {
			id,
			...book,
			cachedAt: Date.now()
		};
		await db.books.put(cached);
	} catch {
		// Ignore cache failure
	}
}

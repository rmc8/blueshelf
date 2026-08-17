import { db, type CachedBook } from '$lib/db';
import type { BookRef } from '$lib/types/book';

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30日

/**
 * ISBN または キーワードから書籍を検索
 *
 * 完全無料・APIキー不要・無制限の公開データ基盤:
 * - NDL (国立国会図書館サーチ OpenSearch API / mediatype=booklet): 和書100%網羅
 * - openBD: 和書の高品質公式書影・解説
 * - Open Library (Internet Archive): 洋書・グローバル書誌・ISBN書影配信
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
 * ISBNによるハイブリッド取得（openBD + Open Library 並列）
 */
async function fetchByIsbn(isbn: string): Promise<BookRef[]> {
	const [openbdResult, olResult] = await Promise.allSettled([
		fetchOpenBd(isbn),
		fetchOpenLibraryByIsbn(isbn)
	]);

	const openbd = openbdResult.status === 'fulfilled' ? openbdResult.value : null;
	const ol = olResult.status === 'fulfilled' ? olResult.value : null;

	if (!openbd && !ol) return [];

	const merged: BookRef = {
		isbn13: isbn.length === 13 ? isbn : openbd?.isbn13 || ol?.isbn13,
		isbn10: isbn.length === 10 ? isbn : ol?.isbn10,
		title: openbd?.title || ol?.title || 'Unknown Title',
		authors: openbd?.authors?.length ? openbd.authors : ol?.authors || ['Unknown Author'],
		publisher: openbd?.publisher || ol?.publisher,
		publishedDate: openbd?.publishedDate || ol?.publishedDate,
		coverUrl: openbd?.coverUrl || ol?.coverUrl,
		pageCount: openbd?.pageCount || ol?.pageCount,
		description: openbd?.description || ol?.description
	};

	// 書影補完
	if (!merged.coverUrl) {
		merged.coverUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`;
	}

	await saveToCache(merged.isbn13 || isbn, merged);
	return [merged];
}

/**
 * キーワードによるハイブリッド検索
 * - 日本語クエリ: NDL (国会図書館) -> CiNii Books (NII学術・書籍) -> Open Library の3段フォールバック + openBD 書影
 * - 洋書/英数字クエリ: Open Library -> CiNii Books -> NDL
 */
async function fetchByKeyword(query: string, maxResults: number): Promise<BookRef[]> {
	const containsJapanese = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/u.test(query);

	if (containsJapanese) {
		// 1. 和書は NDL + openBD を最優先
		const ndlBooks = await fetchNdlSearch(query, maxResults);
		if (ndlBooks.length > 0) {
			return ndlBooks;
		}

		// 2. NDL が 429・タイムアウト・0件の場合、CiNii Books (NII) + openBD フォールバック
		const ciniiBooks = await fetchCiniiBooks(query, maxResults);
		if (ciniiBooks.length > 0) {
			return ciniiBooks;
		}

		// 3. Open Library フォールバック
		return fetchOpenLibrary(query, maxResults);
	}

	// 洋書・英数字クエリの場合
	// 1. Open Library（洋書特化・無制限）
	const olBooks = await fetchOpenLibrary(query, maxResults);
	if (olBooks.length > 0) {
		return olBooks;
	}

	// 2. CiNii Books フォールバック
	const ciniiBooks = await fetchCiniiBooks(query, maxResults);
	if (ciniiBooks.length > 0) {
		return ciniiBooks;
	}

	// 3. NDL フォールバック
	return fetchNdlSearch(query, maxResults);
}

/**
 * 著者名テキストの正規化（NDL/CiNii特有の「著者名, 1971-,著者名 著」等の重複・ノイズを除去）
 */
function cleanAuthorName(raw: string): string[] {
	if (!raw) return ['不明な著者'];
	const parts = raw
		.split(/[,、;]/)
		.map((p) =>
			p
				.replace(/\s*\d{4}-?/g, '')
				.replace(/\s*(?:著|訳|編|原作|作画|写真|イラスト|監修|原案|絵|脚本)[\s\]]*$/g, '')
				.trim()
		)
		.filter((p) => p.length > 0 && !p.startsWith('['));

	const unique = Array.from(new Set(parts));
	return unique.length > 0 ? unique.slice(0, 3) : [raw.trim()];
}

/**
 * 国立情報学研究所 CiNii Books OpenSearch API + openBD 公式書影補完
 * - 完全無料・APIキー不要・CORS 対応・高レスポンス
 */
async function fetchCiniiBooks(query: string, maxResults = 20): Promise<BookRef[]> {
	try {
		const url = `https://ci.nii.ac.jp/books/opensearch/search?q=${encodeURIComponent(query)}&format=rss&count=${maxResults}`;
		const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
		if (!res.ok) return [];

		const xml = await res.text();
		const items = xml.split(/<item[\s>]/i).slice(1);
		if (items.length === 0) return [];

		const isbnsToLookup: string[] = [];
		const rawBooks: BookRef[] = [];
		const seenKeys = new Set<string>();

		for (const itemXml of items) {
			const titleMatch = /<title>([^<]+)<\/title>/.exec(itemXml);
			const rawTitle = titleMatch ? titleMatch[1].trim() : '';
			if (!rawTitle) continue;

			const authorMatch = /<dc:creator>([^<]+)<\/dc:creator>/.exec(itemXml);
			const rawAuthor = authorMatch ? authorMatch[1].trim() : '';
			const authors = cleanAuthorName(rawAuthor);

			const pubMatch = /<dc:publisher>([^<]+)<\/dc:publisher>/.exec(itemXml);
			const publisher = pubMatch ? pubMatch[1].trim() : undefined;

			const dateMatch =
				/<dc:date>([^<]+)<\/dc:date>|<prism:publicationDate>([^<]+)<\/prism:publicationDate>/.exec(
					itemXml
				);
			const publishedDate = dateMatch ? (dateMatch[1] || dateMatch[2]).trim() : undefined;

			const isbnMatch = /urn:isbn:([0-9Xx-]+)/.exec(itemXml);
			const cleanedIsbn = isbnMatch ? isbnMatch[1].replace(/-/g, '').trim() : undefined;
			const isbn13 = cleanedIsbn && cleanedIsbn.length === 13 ? cleanedIsbn : undefined;
			const isbn10 = cleanedIsbn && cleanedIsbn.length === 10 ? cleanedIsbn : undefined;

			const normTitle = rawTitle
				.split(/[:=＝]/)[0]
				.replace(/[\s\u3000]/g, '')
				.toLowerCase();
			const dedupeKey = isbn13 || `${normTitle}_${authors[0] || ''}`;
			if (seenKeys.has(dedupeKey)) continue;
			seenKeys.add(dedupeKey);

			if (isbn13) {
				isbnsToLookup.push(isbn13);
			}

			rawBooks.push({
				isbn13,
				isbn10,
				title: rawTitle,
				authors,
				publisher,
				publishedDate
			});
		}

		if (rawBooks.length === 0) return [];

		// openBD から公式書影・解説を一括取得
		const openbdMap = await fetchOpenBdBatches(isbnsToLookup);

		return rawBooks.map((book) => {
			let enriched = book;
			if (book.isbn13 && openbdMap.has(book.isbn13)) {
				const bd = openbdMap.get(book.isbn13)!;
				enriched = {
					...book,
					coverUrl: bd.coverUrl || book.coverUrl,
					description: bd.description || book.description,
					publisher: bd.publisher || book.publisher
				};
			}
			if (!enriched.coverUrl && (enriched.isbn13 || enriched.isbn10)) {
				const coverIsbn = enriched.isbn13 || enriched.isbn10;
				enriched = {
					...enriched,
					coverUrl: `https://covers.openlibrary.org/b/isbn/${coverIsbn}-M.jpg`
				};
			}
			return enriched;
		});
	} catch (e) {
		console.warn('CiNii Books search failed:', e);
		return [];
	}
}

/**
 * 国立国会図書館サーチ (NDL OpenSearch API) + openBD 公式書影補完
 * - 同時接続数制限 (429) を回避するため単一の any クエリで安全に取得
 */
async function fetchNdlSearch(query: string, maxResults = 20): Promise<BookRef[]> {
	try {
		const url = `https://ndlsearch.ndl.go.jp/api/opensearch?any=${encodeURIComponent(query)}&cnt=${maxResults}`;
		const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
		if (!res.ok) return [];

		const xml = await res.text();
		if (xml.includes('<code>429</code>') || xml.includes('<error>')) {
			console.warn('NDL returned error XML, falling back to CiNii / Open Library');
			return [];
		}

		const items = xml.split('<item>').slice(1);
		if (items.length === 0) return [];

		const isbnsToLookup: string[] = [];
		const rawBooks: BookRef[] = [];
		const seenKeys = new Set<string>();

		for (const itemXml of items) {
			// タイトル
			const titleMatch = /<dc:title>([^<]+)<\/dc:title>|<title>([^<]+)<\/title>/.exec(itemXml);
			const rawTitle = titleMatch ? (titleMatch[1] || titleMatch[2]).trim() : '';
			if (!rawTitle) continue;

			// 不要な目録・記事ノイズを除外
			if (
				rawTitle.includes('インタビュー') ||
				rawTitle.includes('目録') ||
				rawTitle.includes('ブックレビュー')
			) {
				continue;
			}

			// 著者名
			const authorMatch = /<dc:creator>([^<]+)<\/dc:creator>|<author>([^<]+)<\/author>/.exec(
				itemXml
			);
			const rawAuthor = authorMatch ? (authorMatch[1] || authorMatch[2]).trim() : '';
			const authors = cleanAuthorName(rawAuthor);

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

			// 重複排除（正規化タイトル + 主要著者）
			const normTitle = rawTitle
				.split(/[:=＝]/)[0]
				.replace(/[\s\u3000]/g, '')
				.toLowerCase();
			const dedupeKey = isbn13 || `${normTitle}_${authors[0] || ''}`;
			if (seenKeys.has(dedupeKey)) continue;
			seenKeys.add(dedupeKey);

			if (isbn13) {
				isbnsToLookup.push(isbn13);
			}

			rawBooks.push({
				isbn13,
				isbn10,
				title: rawTitle,
				authors,
				publisher,
				publishedDate
			});
		}

		if (rawBooks.length === 0) return [];

		// openBD から公式書影・解説を一括取得
		const openbdMap = await fetchOpenBdBatches(isbnsToLookup);

		return rawBooks
			.map((book) => {
				let enriched = book;
				if (book.isbn13 && openbdMap.has(book.isbn13)) {
					const bd = openbdMap.get(book.isbn13)!;
					enriched = {
						...book,
						coverUrl: bd.coverUrl || book.coverUrl,
						description: bd.description || book.description,
						publisher: bd.publisher || book.publisher
					};
				}
				// openBD で書影が取れなかった場合、Open Library の ISBN ベースカバー URL で補完
				if (!enriched.coverUrl && (enriched.isbn13 || enriched.isbn10)) {
					const coverIsbn = enriched.isbn13 || enriched.isbn10;
					enriched = {
						...enriched,
						coverUrl: `https://covers.openlibrary.org/b/isbn/${coverIsbn}-M.jpg`
					};
				}
				return enriched;
			})
			.slice(0, maxResults);
	} catch (e) {
		console.warn('NDL search failed:', e);
		return [];
	}
}

/**
 * Open Library API キーワード検索 (CORS 完全対応・無料・キー不要・無制限) + openBD 書影補完
 */
async function fetchOpenLibrary(query: string, maxResults = 20): Promise<BookRef[]> {
	try {
		const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=${maxResults}`;
		const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
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
 * Open Library ISBN 単体検索
 */
async function fetchOpenLibraryByIsbn(isbn: string): Promise<BookRef | null> {
	try {
		const url = `https://openlibrary.org/search.json?q=isbn:${isbn}&limit=1`;
		const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
		if (!res.ok) return null;

		const data = await res.json();
		const doc = data.docs?.[0];
		if (!doc) return null;

		const isbn13 = doc.isbn?.find((id: string) => id.length === 13);
		const isbn10 = doc.isbn?.find((id: string) => id.length === 10);

		let coverUrl: string | undefined;
		if (doc.cover_i) {
			coverUrl = `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`;
		} else {
			coverUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`;
		}

		return {
			isbn13,
			isbn10,
			title: doc.title || 'Untitled',
			authors: doc.author_name || ['Unknown Author'],
			publisher: doc.publisher?.[0],
			publishedDate: doc.first_publish_year ? String(doc.first_publish_year) : undefined,
			coverUrl,
			pageCount: doc.number_of_pages_median
		};
	} catch {
		return null;
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
		const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
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
			signal: AbortSignal.timeout(6000)
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

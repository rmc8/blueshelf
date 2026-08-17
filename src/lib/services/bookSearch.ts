import { db, type CachedBook } from '$lib/db';
import type { BookRef } from '$lib/types/book';
import isbn3 from 'isbn3';

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30日

/**
 * ISBN または キーワードから書籍を検索
 *
 * 完全無料・APIキー不要・無制限の公開データ基盤:
 * - NDL (国立国会図書館サーチ OpenSearch API): 和書納本データベース
 * - CiNii Books (国立情報学研究所): 全国の大学図書館・専門書・技術書
 * - openBD: 和書の高品質公式書影・解説
 * - Open Library (Internet Archive): 洋書・グローバル書誌・ISBN書影配信
 */
/**
 * ISBN または キーワードから書籍を検索（ページネーション対応）
 *
 * 完全無料・APIキー不要・無制限の公開データ基盤:
 * - CiNii Books (国立情報学研究所): 全国の大学図書館・専門書・技術書（CORS対応）
 * - openBD: 和書の高品質公式書影・解説
 * - NDL (国立国会図書館サーチ): 和書納本総合目録
 * - Open Library (Internet Archive): 洋書・グローバル書誌
 */
export async function searchBooks(query: string, page = 1, maxResults = 20): Promise<BookRef[]> {
	const trimmed = query.trim();
	if (!trimmed) return [];

	// isbn3 ライブラリで正確な ISBN 検証・正規化
	const parsedIsbn = isbn3.parse(trimmed);
	const isbn13 = parsedIsbn?.isValid ? parsedIsbn.isbn13 : null;

	if (isbn13) {
		if (typeof indexedDB !== 'undefined' && page === 1) {
			try {
				const cached = await db.books.get(isbn13);
				if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
					return [cached];
				}
			} catch {
				// IndexedDB missing in SSR / Node test
			}
		}
		return page === 1 ? fetchByIsbn(isbn13) : [];
	}

	return fetchByKeyword(trimmed, page, maxResults);
}

/**
 * ISBNによるハイブリッド取得（openBD + Open Library 並列）
 */
async function fetchByIsbn(isbn: string): Promise<BookRef[]> {
	const parsed = isbn3.parse(isbn);
	const isbn13 = parsed?.isbn13 || (isbn.length === 13 ? isbn : undefined);
	const isbn10 = parsed?.isbn10 || (isbn.length === 10 ? isbn : undefined);

	const [openbdResult, olResult] = await Promise.allSettled([
		fetchOpenBd(isbn13 || isbn),
		fetchOpenLibraryByIsbn(isbn13 || isbn)
	]);

	const openbd = openbdResult.status === 'fulfilled' ? openbdResult.value : null;
	const ol = olResult.status === 'fulfilled' ? olResult.value : null;

	if (!openbd && !ol) return [];

	const merged: BookRef = {
		isbn13: isbn.length === 13 ? isbn : openbd?.isbn13 || ol?.isbn13,
		isbn10: isbn10 || ol?.isbn10,
		title: openbd?.title || ol?.title || 'Unknown Title',
		authors: openbd?.authors?.length ? openbd.authors : ol?.authors || ['Unknown Author'],
		publisher: openbd?.publisher || ol?.publisher,
		publishedDate: openbd?.publishedDate || ol?.publishedDate,
		coverUrl: openbd?.coverUrl || ol?.coverUrl,
		pageCount: openbd?.pageCount || ol?.pageCount,
		description: openbd?.description || ol?.description
	};

	await saveToCache(merged.isbn13 || isbn, merged);
	return [merged];
}

/**
 * 書籍を【和書優先】＆【出版が新しい順（Newest First）】でソート
 */
function sortBooksByNewest(books: BookRef[]): BookRef[] {
	return [...books].sort((a, b) => {
		// 和書判定（タイトルまたは出版社に日本語が含まれる本）
		const aHasJa = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/u.test(
			(a.title || '') + (a.publisher || '')
		);
		const bHasJa = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/u.test(
			(b.title || '') + (b.publisher || '')
		);
		if (aHasJa && !bHasJa) return -1;
		if (!aHasJa && bHasJa) return 1;

		// 出版年（西暦）の新しい順（降順: 2026 -> 2025 -> 2024 ...）
		const yearA = parseInt((a.publishedDate || '').replace(/[^0-9]/g, '').slice(0, 4) || '0', 10);
		const yearB = parseInt((b.publishedDate || '').replace(/[^0-9]/g, '').slice(0, 4) || '0', 10);
		if (yearA !== yearB) {
			return yearB - yearA;
		}

		// 出版年が同じなら、書影があるものを優先
		if (a.coverUrl && !b.coverUrl) return -1;
		if (!a.coverUrl && b.coverUrl) return 1;

		return 0;
	});
}

/**
 * キーワードによるハイブリッド検索（ページネーション & 和書最優先）
 * - クエリの種類（日本語・英字技術用語）に関わらず、CiNii / NDL の和書を最優先に統合
 * - すべて【和書優先】＆【出版が新しい順（Newest First）】に自動整列
 */
async function fetchByKeyword(query: string, page: number, maxResults: number): Promise<BookRef[]> {
	// CiNii Books (学術・商業和書・CORS対応) と NDL (国会図書館) を並行探索
	const [ciniiResults, ndlResults, olResults] = await Promise.allSettled([
		fetchCiniiBooks(query, page, maxResults),
		fetchNdlSearch(query, page, maxResults),
		fetchOpenLibrary(query, page, maxResults)
	]);

	const ciniiBooks = ciniiResults.status === 'fulfilled' ? ciniiResults.value : [];
	const ndlBooks = ndlResults.status === 'fulfilled' ? ndlResults.value : [];
	const olBooks = olResults.status === 'fulfilled' ? olResults.value : [];

	// 重複排除しながら統合
	const combined: BookRef[] = [];
	const seenKeys = new Set<string>();

	for (const book of [...ciniiBooks, ...ndlBooks, ...olBooks]) {
		const normTitle = (book.title || '')
			.split(/[:=＝]/)[0]
			.replace(/[\s\u3000]/g, '')
			.toLowerCase();
		const dedupeKey = book.isbn13 || `${normTitle}_${book.authors?.[0] || ''}`;
		if (seenKeys.has(dedupeKey)) continue;
		seenKeys.add(dedupeKey);
		combined.push(book);
	}

	if (combined.length === 0) return [];

	return sortBooksByNewest(combined).slice(0, maxResults);
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
 * - 全項目(q)、出版社(publisher)、タイトル(title) を複合検索
 * - デフォルトで【出版が新しい順（Newest First）】にソート
 */
async function fetchCiniiBooks(query: string, page = 1, maxResults = 20): Promise<BookRef[]> {
	try {
		const isJapanese = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/u.test(query);

		// 複数フィールドを並行取得（全項目 + 出版社 + タイトル、すべて出版年降順: sortorder=1）
		// ページネーション: CiNii は p= パラメータでオフセット指定
		const p = page;
		const urls = [
			`https://ci.nii.ac.jp/books/opensearch/search?title=${encodeURIComponent(query)}&sortorder=1&format=rss&count=${maxResults}&p=${p}`,
			`https://ci.nii.ac.jp/books/opensearch/search?q=${encodeURIComponent(query)}&sortorder=1&format=rss&count=${maxResults}&p=${p}`
		];

		const responses = await Promise.allSettled(
			urls.map((u) => fetch(u, { signal: AbortSignal.timeout(6000) }))
		);

		const isbnsToLookup: string[] = [];
		const rawBooks: BookRef[] = [];
		const seenKeys = new Set<string>();

		for (const res of responses) {
			if (res.status !== 'fulfilled' || !res.value.ok) continue;

			const xml = await res.value.text();
			const items = xml.split(/<item[\s>]/i).slice(1);
			if (items.length === 0) continue;

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
					/<prism:publicationDate>([^<]+)<\/prism:publicationDate>|<dc:date>([^<]+)<\/dc:date>/.exec(
						itemXml
					);
				const publishedDate = dateMatch ? (dateMatch[1] || dateMatch[2]).trim() : undefined;

				// 全方位 ISBN 抽出 (urn:isbn, <prism:isbn>, <dc:identifier>, 10/13桁パターン)
				const isbnMatch =
					/(?:urn:isbn:|<prism:isbn>|<dc:identifier>)([0-9Xx-]{10,17})/i.exec(itemXml) ||
					/([0-9]{13}|[0-9]{9}[0-9Xx])/.exec(itemXml);
				const cleanedIsbn = isbnMatch ? isbnMatch[1].replace(/[^0-9Xx]/g, '') : undefined;
				const isbn13 = cleanedIsbn && cleanedIsbn.length === 13 ? cleanedIsbn : undefined;
				const isbn10 = cleanedIsbn && cleanedIsbn.length === 10 ? cleanedIsbn : undefined;

				// シリーズ名等のノイズ目録レコードを除外
				const isSeriesNoise =
					authors[0] === '不明な著者' &&
					!isbn13 &&
					(rawTitle.toLowerCase().endsWith('series') ||
						rawTitle.endsWith('シリーズ') ||
						rawTitle.toLowerCase().endsWith('library'));
				if (isSeriesNoise) continue;

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
		}

		if (rawBooks.length === 0) return [];

		// openBD から公式書影・解説を一括取得（openBDに書影があるもののみ確実にcoverUrlを設定）
		const openbdMap = await fetchOpenBdBatches(isbnsToLookup);

		const enrichedBooks = rawBooks.map((book) => {
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
			return enriched;
		});

		return enrichedBooks;
	} catch (e) {
		console.warn('CiNii Books search failed:', e);
		return [];
	}
}

/**
 * 国立国会図書館サーチ (NDL OpenSearch API) + openBD 公式書影補完
 * - 同時接続数制限 (429) を回避するため単一の any クエリで安全に取得
 */
async function fetchNdlSearch(query: string, page = 1, maxResults = 20): Promise<BookRef[]> {
	try {
		const idx = (page - 1) * maxResults + 1;
		const url = `https://ndlsearch.ndl.go.jp/api/opensearch?any=${encodeURIComponent(query)}&cnt=${maxResults}&idx=${idx}`;
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

		// openBD から公式書影・解説を一括取得（openBDに書影があるもののみ確実にcoverUrlを設定）
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
async function fetchOpenLibrary(query: string, page = 1, maxResults = 20): Promise<BookRef[]> {
	try {
		const offset = (page - 1) * maxResults;
		const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=${maxResults}&offset=${offset}`;
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

			// cover_i（数値ID）が存在する場合のみ書影URLを設定（存在が確実な画像のみ使用）
			let coverUrl: string | undefined;
			if (doc.cover_i) {
				coverUrl = `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`;
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

import type { ReadingStatusRecord, ReviewRecord } from '$lib/types/book';
import type { ShelfItem } from '$lib/services/bookRecord';
import { LEXICON_COLLECTIONS } from '$lib/services/atproto/pdsSync';

export interface PublicUserProfile {
	did: string;
	handle: string;
	displayName?: string;
	avatar?: string;
	description?: string;
	followersCount?: number;
	followsCount?: number;
	postsCount?: number;
}

export interface ShareOptions {
	handle: string;
	displayName?: string;
	finishedCount?: number;
}

/**
 * ハンドル文字列の正規化（@ や余分な空白の除去）
 */
export function parseActorHandle(input: string): string {
	return input.trim().replace(/^@/, '');
}

/**
 * Bluesky 共有用テキストの生成
 */
export function buildShareText(options: ShareOptions): string {
	const name = options.displayName
		? `${options.displayName} (@${options.handle})`
		: `@${options.handle}`;
	const countPart =
		options.finishedCount !== undefined ? `（読了: ${options.finishedCount} 冊）` : '';
	return `📚 ${name} の本棚${countPart}\n\n#Blueshelf #読書記録 #Bluesky読書部\nhttps://blueshelf.app/profile/${options.handle}`;
}

/**
 * 指定したユーザー（DIDまたはハンドル）の公開プロフィールを取得
 */
export async function fetchPublicProfile(actor: string): Promise<PublicUserProfile | null> {
	const cleanActor = parseActorHandle(actor);
	try {
		const res = await fetch(
			`https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(cleanActor)}`
		);
		if (!res.ok) return null;

		const data = await res.json();
		return {
			did: data.did,
			handle: data.handle,
			displayName: data.displayName || data.handle,
			avatar: data.avatar,
			description: data.description,
			followersCount: data.followersCount,
			followsCount: data.followsCount,
			postsCount: data.postsCount
		};
	} catch (err) {
		console.warn('Failed to fetch public profile:', err);
		return null;
	}
}

/**
 * 指定ユーザーの公開 PDS から全読書ステータス & 書評レコードを取得し ShelfItem 一覧を生成
 */
export async function fetchPublicShelfItems(did: string): Promise<ShelfItem[]> {
	try {
		const [statusesRes, reviewsRes] = await Promise.all([
			fetch(
				`https://public.api.bsky.app/xrpc/com.atproto.repo.listRecords?repo=${encodeURIComponent(did)}&collection=${LEXICON_COLLECTIONS.READING_STATUS}&limit=100`
			),
			fetch(
				`https://public.api.bsky.app/xrpc/com.atproto.repo.listRecords?repo=${encodeURIComponent(did)}&collection=${LEXICON_COLLECTIONS.REVIEW}&limit=100`
			)
		]);

		let statuses: ReadingStatusRecord[] = [];
		let reviews: ReviewRecord[] = [];

		if (statusesRes.ok) {
			const data = await statusesRes.json();
			statuses = (data.records || []).map((r: { uri: string; cid: string; value: unknown }) => ({
				uri: r.uri,
				cid: r.cid,
				...(r.value as object)
			})) as ReadingStatusRecord[];
		}

		if (reviewsRes.ok) {
			const data = await reviewsRes.json();
			reviews = (data.records || []).map((r: { uri: string; cid: string; value: unknown }) => ({
				uri: r.uri,
				cid: r.cid,
				...(r.value as object)
			})) as ReviewRecord[];
		}

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
	} catch (err) {
		console.warn('Failed to fetch public shelf items:', err);
		return [];
	}
}

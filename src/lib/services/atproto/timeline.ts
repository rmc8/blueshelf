import type { Agent } from '@atproto/api';
import type { BookRef } from '$lib/types/book.js';
import type { ReadingStatusRecord, ReviewRecord } from '$lib/services/bookRecord.js';
import type { QuoteRecord } from '$lib/services/quoteRecord.js';
import { fetchPublicShelfItems } from './publicShelf.js';

export interface TimelineActor {
	did: string;
	handle: string;
	displayName?: string;
	avatar?: string;
}

export interface TimelineItem {
	actor: TimelineActor;
	type: 'status' | 'review' | 'quote';
	book: BookRef;
	statusRecord?: ReadingStatusRecord;
	reviewRecord?: ReviewRecord;
	quoteRecord?: QuoteRecord;
	timestamp: string;
}

/**
 * タイムラインアイテムを時系列降順（最新順）にソート
 */
export function sortTimelineItems(items: TimelineItem[]): TimelineItem[] {
	return [...items].sort((a, b) => {
		const timeA = new Date(a.timestamp).getTime() || 0;
		const timeB = new Date(b.timestamp).getTime() || 0;
		return timeB - timeA;
	});
}

/**
 * Bluesky のフォロー中アクター一覧を取得
 */
export async function fetchFollows(
	agent: Agent,
	actorDid: string,
	limit = 50
): Promise<TimelineActor[]> {
	try {
		const res = await agent.api.app.bsky.graph.getFollows({
			actor: actorDid,
			limit
		});

		return res.data.follows.map((f) => ({
			did: f.did,
			handle: f.handle,
			displayName: f.displayName,
			avatar: f.avatar
		}));
	} catch (err) {
		console.warn('Failed to fetch follows:', err);
		return [];
	}
}

/**
 * フォロー中ユーザーの読書ログを分散集約してタイムラインを生成
 */
export async function fetchAggregatedTimeline(
	agent: Agent,
	userDid: string
): Promise<TimelineItem[]> {
	// 1. フォロー中ユーザー（+ 自分自身）のアクターリストを取得
	const follows = await fetchFollows(agent, userDid, 40);
	const targetActors: TimelineActor[] = [
		// 自分自身の情報
		{
			did: userDid,
			handle: agent.assertDid || userDid,
			displayName: 'You'
		},
		...follows
	];

	const timelineItems: TimelineItem[] = [];

	// 2. 並行して各ユーザーの公開読書レコードを取得（最大同時10並列）
	const fetchPromises = targetActors.map(async (actor) => {
		try {
			const shelfItems = await fetchPublicShelfItems(actor.did);
			for (const item of shelfItems) {
				// ステータス変更イベント
				timelineItems.push({
					actor,
					type: 'status',
					book: item.book,
					statusRecord: item.statusRecord,
					timestamp:
						item.statusRecord.updatedAt || item.statusRecord.createdAt || new Date().toISOString()
				});

				// レビューイベント
				if (item.reviewRecord) {
					timelineItems.push({
						actor,
						type: 'review',
						book: item.book,
						reviewRecord: item.reviewRecord,
						timestamp:
							item.reviewRecord.updatedAt || item.reviewRecord.createdAt || new Date().toISOString()
					});
				}
			}
		} catch (err) {
			// 個別ユーザーの取得エラーは全体のタイムライン表示を阻害しない
			console.warn(`Failed to fetch reading activities for ${actor.handle}:`, err);
		}
	});

	await Promise.allSettled(fetchPromises);

	// 3. タイムスタンプ降順にソートして最新順で返す
	return sortTimelineItems(timelineItems);
}

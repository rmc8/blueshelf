import { BrowserOAuthClient, type OAuthSession } from '@atproto/oauth-client-browser';
import { Agent } from '@atproto/api';

let oauthClient: BrowserOAuthClient | null = null;
let currentSession: OAuthSession | null = null;
let currentAgent: Agent | null = null;

function isLoopback(hostname: string): boolean {
	return (
		hostname === 'localhost' ||
		hostname === '127.0.0.1' ||
		hostname === '[::1]' ||
		hostname.endsWith('.localhost')
	);
}

/**
 * OAuthClient インスタンスの取得 / 初期化
 */
export async function getOAuthClient(): Promise<BrowserOAuthClient | null> {
	if (typeof window === 'undefined') return null;
	if (oauthClient) return oauthClient;

	try {
		const isDev = isLoopback(window.location.hostname);
		const origin = window.location.origin;

		if (isDev) {
			// ローカル開発環境: BrowserOAuthClient の自動 Loopback 初期化（scope: 'atproto'）
			oauthClient = new BrowserOAuthClient({
				handleResolver: 'https://bsky.social'
			});
		} else {
			// 本番環境: HTTPS client-metadata.json からロード
			const clientId = `${origin}/oauth/client-metadata.json`;
			oauthClient = await BrowserOAuthClient.load({
				clientId,
				handleResolver: 'https://bsky.social'
			});
		}

		return oauthClient;
	} catch (err) {
		console.error('Failed to initialize BrowserOAuthClient:', err);
		throw err;
	}
}

/**
 * アプリ起動時の既存セッション解決
 */
export async function initSession(): Promise<{
	session: OAuthSession | null;
	agent: Agent | null;
}> {
	if (typeof window === 'undefined') return { session: null, agent: null };

	try {
		const client = await getOAuthClient();
		if (!client) return { session: null, agent: null };

		const result = await client.init();
		if (result?.session) {
			currentSession = result.session;
			currentAgent = new Agent(result.session);
			return { session: currentSession, agent: currentAgent };
		}
	} catch (err) {
		console.warn('OAuth session init error:', err);
	}

	return { session: null, agent: null };
}

/**
 * ログイン開始（Bluesky認可画面へリダイレクト）
 */
export async function signIn(handle: string): Promise<void> {
	const client = await getOAuthClient();
	if (!client) throw new Error('OAuthクライアントの初期化に失敗しました');

	// ハンドル名のクリーンアップ（@があれば削除）
	const cleanHandle = handle.trim().replace(/^@/, '');
	if (!cleanHandle) throw new Error('Bluesky のハンドル名を入力してください');

	// 認可フローの開始（clientMetadata に定義された 'atproto' スコープを使用）
	await client.signIn(cleanHandle);
}

/**
 * ログアウト
 */
export async function signOut(): Promise<void> {
	if (currentSession) {
		try {
			await currentSession.signOut();
		} catch (err) {
			console.warn('Sign out error:', err);
		}
	}
	currentSession = null;
	currentAgent = null;
}

/**
 * 現在の認証済み Agent を取得
 */
export function getAgent(): Agent | null {
	return currentAgent;
}

/**
 * 現在の OAuthSession を取得
 */
export function getSession(): OAuthSession | null {
	return currentSession;
}

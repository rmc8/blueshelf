import { BrowserOAuthClient, type OAuthSession } from '@atproto/oauth-client-browser';
import { Agent } from '@atproto/api';

let oauthClient: BrowserOAuthClient | null = null;
let currentSession: OAuthSession | null = null;
let currentAgent: Agent | null = null;

/**
 * 現在のクライアントメタデータURLを判定
 */
export function getClientMetadataUrl(): string {
	if (typeof window === 'undefined') {
		return 'https://blueshelf.app/oauth/client-metadata.json';
	}
	const origin = window.location.origin;
	// 開発環境（127.0.0.1 / localhost）対応
	if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
		// ATProto OAuth の仕様では loopback は http://127.0.0.1:port/oauth/client-metadata.json 形式
		return `${origin}/oauth/client-metadata.json`;
	}
	return 'https://blueshelf.app/oauth/client-metadata.json';
}

/**
 * OAuthClient インスタンスの取得 / 初期化
 */
export async function getOAuthClient(): Promise<BrowserOAuthClient | null> {
	if (typeof window === 'undefined') return null;
	if (oauthClient) return oauthClient;

	try {
		const clientId = getClientMetadataUrl();
		oauthClient = new BrowserOAuthClient({
			clientMetadata: {
				client_id: clientId,
				client_name: 'Blueshelf',
				client_uri: window.location.origin,
				logo_uri: `${window.location.origin}/img/logo/shelfsky.svg`,
				redirect_uris: [`${window.location.origin}/oauth/callback`],
				grant_types: ['authorization_code', 'refresh_token'],
				response_types: ['code'],
				scope: 'atproto transition:generic',
				token_endpoint_auth_method: 'none',
				dpop_bound_access_tokens: true
			},
			handleResolver: 'https://bsky.social'
		});
		return oauthClient;
	} catch (err) {
		console.warn('Failed to initialize BrowserOAuthClient:', err);
		return null;
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

	const client = await getOAuthClient();
	if (!client) return { session: null, agent: null };

	try {
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
	if (!client) throw new Error('OAuth Client not initialized');

	// ハンドル名のクリーンアップ（@があれば削除）
	const cleanHandle = handle.trim().replace(/^@/, '');
	if (!cleanHandle) throw new Error('ハンドル名を入力してください');

	// 認可フローの開始
	await client.signIn(cleanHandle, {
		scope: 'atproto transition:generic'
	});
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

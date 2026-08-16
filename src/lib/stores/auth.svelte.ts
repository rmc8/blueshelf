import {
	initSession,
	signIn as oauthSignIn,
	signOut as oauthSignOut
} from '$lib/services/atproto/oauth';
import type { Agent } from '@atproto/api';

export interface BlueskyProfile {
	did: string;
	handle: string;
	displayName?: string;
	avatar?: string;
	description?: string;
}

/**
 * AppView (public.api.bsky.app) を用いてアクターの公開プロフィールを高信頼に取得
 */
export async function resolveActorProfile(
	actor: string,
	agent?: Agent | null
): Promise<BlueskyProfile | null> {
	// 1. 認証済み Agent を試行
	if (agent) {
		try {
			const res = await agent.getProfile({ actor });
			return {
				did: res.data.did,
				handle: res.data.handle,
				displayName: res.data.displayName || res.data.handle,
				avatar: res.data.avatar,
				description: res.data.description
			};
		} catch {
			// fallback to public AppView
		}
	}

	// 2. 公式パブリック AppView API への直接フォールバック
	try {
		const res = await fetch(
			`https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(actor)}`
		);
		if (res.ok) {
			const data = await res.json();
			return {
				did: data.did,
				handle: data.handle,
				displayName: data.displayName || data.handle,
				avatar: data.avatar,
				description: data.description
			};
		}
	} catch (err) {
		console.warn('Failed to resolve profile from AppView:', err);
	}

	return null;
}

class AuthState {
	user = $state<BlueskyProfile | null>(null);
	agent = $state<Agent | null>(null);
	isLoading = $state(true);
	isInitialized = $state(false);
	initError = $state<string | null>(null);
	private initPromise: Promise<void> | null = null;

	get isAuthenticated(): boolean {
		return this.user !== null;
	}

	/**
	 * アプリ起動時にセッションを復元し、プロフィールを取得 (競合防止シングルトン)
	 */
	async init(): Promise<void> {
		if (this.isInitialized) return;
		if (this.initPromise) return this.initPromise;

		this.initPromise = (async () => {
			this.isLoading = true;
			this.initError = null;

			try {
				const { session, agent } = await initSession();
				if (session && agent) {
					this.agent = agent;
					const profile = await resolveActorProfile(session.did, agent);
					if (profile) {
						this.user = profile;
					} else {
						this.user = {
							did: session.did,
							handle: session.did,
							displayName: session.did.slice(0, 16) + '...'
						};
					}
				} else {
					this.user = null;
					this.agent = null;
				}
			} catch (err) {
				console.warn('Auth initialization error:', err);
				this.initError = err instanceof Error ? err.message : String(err);
				this.user = null;
				this.agent = null;
			} finally {
				this.isLoading = false;
				this.isInitialized = true;
				this.initPromise = null;
			}
		})();

		return this.initPromise;
	}

	/**
	 * ログイン開始
	 */
	async login(handle: string) {
		await oauthSignIn(handle);
	}

	/**
	 * ログアウト
	 */
	async logout() {
		await oauthSignOut();
		this.user = null;
		this.agent = null;
	}
}

export const authState = new AuthState();

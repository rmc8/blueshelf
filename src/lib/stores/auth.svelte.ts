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

class AuthState {
	user = $state<BlueskyProfile | null>(null);
	agent = $state<Agent | null>(null);
	isLoading = $state(true);
	isInitialized = $state(false);

	get isAuthenticated(): boolean {
		return this.user !== null;
	}

	/**
	 * アプリ起動時にセッションを復元し、プロフィールを取得
	 */
	async init() {
		if (this.isInitialized) return;
		this.isLoading = true;

		try {
			const { session, agent } = await initSession();
			if (session && agent) {
				this.agent = agent;
				try {
					const profileRes = await agent.getProfile({ actor: session.did });
					this.user = {
						did: session.did,
						handle: profileRes.data.handle,
						displayName: profileRes.data.displayName,
						avatar: profileRes.data.avatar,
						description: profileRes.data.description
					};
				} catch {
					this.user = {
						did: session.did,
						handle: session.did
					};
				}
			} else {
				this.user = null;
				this.agent = null;
			}
		} catch (err) {
			console.warn('Auth initialization error:', err);
			this.user = null;
			this.agent = null;
		} finally {
			this.isLoading = false;
			this.isInitialized = true;
		}
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

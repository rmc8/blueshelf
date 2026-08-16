<script lang="ts">
	import { authState } from '$lib/stores/auth.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { X, LogIn, AlertCircle, ShieldCheck } from '@lucide/svelte';
	import * as m from '$lib/paraglide/messages';

	interface Props {
		isOpen: boolean;
		onClose: () => void;
	}

	let { isOpen, onClose }: Props = $props();

	let handleInput = $state('');
	let isSubmitting = $state(false);
	let errorText = $state<string | null>(null);

	async function handleSubmit(e: Event) {
		e.preventDefault();
		errorText = null;

		const cleanHandle = handleInput.trim().replace(/^@/, '');
		if (!cleanHandle) {
			errorText = 'Bluesky のハンドル名を入力してください（例: handle.bsky.social）';
			return;
		}

		isSubmitting = true;
		try {
			await authState.login(cleanHandle);
		} catch (err) {
			errorText = err instanceof Error ? err.message : 'ログインの開始に失敗しました。';
			isSubmitting = false;
		}
	}

	function handleBackdrop(e: MouseEvent) {
		if (e.target === e.currentTarget && !isSubmitting) {
			onClose();
		}
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Escape' && !isSubmitting) {
			onClose();
		}
	}
</script>

<svelte:window onkeydown={handleKeyDown} />

{#if isOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<!-- Backdrop -->
		<button
			type="button"
			class="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
			onclick={handleBackdrop}
			aria-label="Close login modal"
			tabindex="-1"
		></button>

		<!-- Modal Content Box -->
		<div
			class="relative z-10 w-full max-w-md space-y-5 rounded-2xl border border-border bg-card p-6 shadow-2xl"
			role="dialog"
			aria-modal="true"
			aria-labelledby="login-modal-title"
		>
			<!-- Close Button -->
			<button
				type="button"
				onclick={onClose}
				disabled={isSubmitting}
				class="absolute top-4 right-4 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
				aria-label="Close modal"
			>
				<X class="h-4 w-4" />
			</button>

			<!-- Header -->
			<div class="space-y-1.5 text-center">
				<div
					class="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-xs"
				>
					<LogIn class="h-6 w-6" />
				</div>
				<h2 id="login-modal-title" class="text-xl font-bold tracking-tight text-foreground">
					{m.login_dialog_title()}
				</h2>
				<p class="text-xs leading-relaxed text-muted-foreground">
					{m.login_dialog_desc()}
				</p>
			</div>

			<!-- Form -->
			<form onsubmit={handleSubmit} class="space-y-4 pt-1">
				<div class="space-y-1.5">
					<label for="bsky-handle" class="block text-xs font-semibold text-foreground">
						{m.login_handle_label()}
					</label>
					<div class="relative">
						<Input
							id="bsky-handle"
							type="text"
							placeholder="yourname.bsky.social"
							bind:value={handleInput}
							disabled={isSubmitting}
							class="h-10 rounded-xl text-sm"
							autofocus
						/>
					</div>
					<p class="text-[10px] text-muted-foreground">
						{m.login_handle_hint()}
					</p>
				</div>

				{#if errorText}
					<div
						class="flex items-center gap-2 rounded-xl bg-destructive/10 p-2.5 text-xs text-destructive"
					>
						<AlertCircle class="h-4 w-4 shrink-0" />
						<span>{errorText}</span>
					</div>
				{/if}

				<!-- Security note -->
				<div
					class="flex items-start gap-2 rounded-xl border border-border/60 bg-muted/30 p-2.5 text-[11px] text-muted-foreground"
				>
					<ShieldCheck class="mt-0.5 h-4 w-4 shrink-0 text-primary" />
					<span>
						{m.login_zero_secret_notice()}
					</span>
				</div>

				<div class="pt-1">
					<Button
						type="submit"
						disabled={isSubmitting}
						class="h-10 w-full rounded-xl text-sm font-semibold shadow-sm"
					>
						{#if isSubmitting}
							<span
								class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
							></span>
							<span>{m.login()}...</span>
						{:else}
							<span>{m.login()}</span>
						{/if}
					</Button>
				</div>
			</form>
		</div>
	</div>
{/if}

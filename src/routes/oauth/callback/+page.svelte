<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { authState } from '$lib/stores/auth.svelte';
	import * as m from '$lib/paraglide/messages';
	import { Library, CheckCircle, AlertCircle } from '@lucide/svelte';

	let status = $state<'processing' | 'success' | 'error'>('processing');
	let errorMessage = $state<string | null>(null);

	onMount(async () => {
		try {
			await authState.init();
			if (authState.isAuthenticated) {
				status = 'success';
				setTimeout(() => {
					goto('/shelf');
				}, 1000);
			} else {
				status = 'error';
				errorMessage = m.auth_failed_title();
			}
		} catch (err) {
			status = 'error';
			errorMessage = err instanceof Error ? err.message : m.auth_failed_title();
		}
	});
</script>

<svelte:head>
	<title>{m.auth_in_progress_title()} | {m.app_name()}</title>
</svelte:head>

<div
	class="container mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-4 text-center"
>
	{#if status === 'processing'}
		<div class="space-y-4">
			<div
				class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm"
			>
				<Library class="h-7 w-7 animate-pulse" />
			</div>
			<div class="space-y-1">
				<h1 class="text-xl font-bold text-foreground">{m.auth_in_progress_title()}</h1>
				<p class="text-xs text-muted-foreground">{m.auth_in_progress_desc()}</p>
			</div>
			<div class="flex justify-center pt-2">
				<span class="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent"
				></span>
			</div>
		</div>
	{:else if status === 'success'}
		<div class="space-y-4">
			<div
				class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 shadow-sm dark:text-emerald-400"
			>
				<CheckCircle class="h-7 w-7" />
			</div>
			<div class="space-y-1">
				<h1 class="text-xl font-bold text-foreground">{m.auth_success_title()}</h1>
				<p class="text-xs text-muted-foreground">{m.auth_success_desc()}</p>
			</div>
		</div>
	{:else}
		<div class="space-y-4">
			<div
				class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/15 text-destructive shadow-sm"
			>
				<AlertCircle class="h-7 w-7" />
			</div>
			<div class="space-y-1">
				<h1 class="text-xl font-bold text-foreground">{m.auth_failed_title()}</h1>
				<p class="text-xs text-muted-foreground">{errorMessage}</p>
			</div>
			<div class="pt-2">
				<a
					href="/"
					class="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
				>
					{m.back_to_home()}
				</a>
			</div>
		</div>
	{/if}
</div>

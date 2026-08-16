<script lang="ts">
	import { onMount } from 'svelte';
	import { authState } from '$lib/stores/auth.svelte';
	import { fetchAggregatedTimeline, type TimelineItem } from '$lib/services/atproto/timeline';
	import type { BookRef } from '$lib/types/book';
	import * as m from '$lib/paraglide/messages.js';
	import { Button } from '$lib/components/ui/button';
	import TimelineCard from '$lib/components/timeline/TimelineCard.svelte';
	import BookRecordModal from '$lib/components/book/BookRecordModal.svelte';
	import LoginModal from '$lib/components/auth/LoginModal.svelte';
	import { Sparkles, RotateCw, Users, BookOpen, LogIn } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

	let items = $state<TimelineItem[]>([]);
	let isLoading = $state(true);
	let isRefreshing = $state(false);

	let selectedBookForRecord = $state<BookRef | null>(null);
	let isRecordModalOpen = $state(false);
	let isLoginModalOpen = $state(false);

	onMount(async () => {
		await authState.init();
		if (authState.isAuthenticated) {
			await loadTimeline();
		} else {
			isLoading = false;
		}
	});

	// 認証状態の変化を監視
	$effect(() => {
		if (authState.isAuthenticated && items.length === 0 && !isLoading) {
			loadTimeline();
		}
	});

	async function loadTimeline() {
		if (!authState.agent || !authState.user) return;
		isLoading = true;
		try {
			const res = await fetchAggregatedTimeline(authState.agent, authState.user.did);
			items = res;
		} catch (err) {
			console.error('Failed to load timeline:', err);
			toast.error('タイムラインの読み込みに失敗しました');
		} finally {
			isLoading = false;
			isRefreshing = false;
		}
	}

	async function handleRefresh() {
		isRefreshing = true;
		await loadTimeline();
	}

	function handleAddToMyShelf(book: BookRef) {
		selectedBookForRecord = book;
		isRecordModalOpen = true;
	}
</script>

<svelte:head>
	<title>{m.timeline_title()} | {m.app_name()}</title>
	<meta name="description" content={m.timeline_desc()} />
</svelte:head>

<div class="container mx-auto max-w-3xl space-y-6 px-4 py-6 sm:py-8">
	<!-- Page Header -->
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<div class="space-y-1">
			<div class="flex items-center gap-2">
				<div class="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
					<Sparkles class="h-4 w-4" />
				</div>
				<h1 class="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
					{m.timeline_title()}
				</h1>
			</div>
			<p class="text-xs text-muted-foreground sm:text-sm">
				{m.timeline_desc()}
			</p>
		</div>

		{#if authState.isAuthenticated}
			<Button
				variant="outline"
				size="sm"
				onclick={handleRefresh}
				disabled={isLoading || isRefreshing}
				class="h-8 gap-1.5 rounded-xl text-xs"
			>
				<RotateCw class="h-3.5 w-3.5 {isRefreshing ? 'animate-spin' : ''}" />
				<span>更新</span>
			</Button>
		{/if}
	</div>

	<!-- Content Area -->
	{#if !authState.isAuthenticated}
		<!-- Not Authenticated State -->
		<div
			class="flex flex-col items-center justify-center space-y-4 rounded-2xl border border-border/60 bg-card/40 py-16 text-center"
		>
			<div
				class="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"
			>
				<Users class="h-7 w-7" />
			</div>
			<div class="max-w-sm space-y-1.5 px-4">
				<h2 class="text-base font-bold text-foreground">{m.timeline_login_required()}</h2>
				<p class="text-xs text-muted-foreground">{m.timeline_empty_desc()}</p>
			</div>
			<Button
				size="sm"
				onclick={() => (isLoginModalOpen = true)}
				class="gap-1.5 rounded-xl text-xs font-semibold shadow-xs"
			>
				<LogIn class="h-3.5 w-3.5" />
				<span>{m.login()}</span>
			</Button>
		</div>
	{:else if isLoading}
		<!-- Loading Skeleton -->
		<div class="space-y-4">
			{#each [1, 2, 3] as skel (skel)}
				<div class="animate-pulse rounded-2xl border border-border/40 bg-card/40 p-5">
					<div class="flex items-center gap-3">
						<div class="h-10 w-10 rounded-full bg-muted"></div>
						<div class="space-y-1.5">
							<div class="h-3.5 w-32 rounded-md bg-muted"></div>
							<div class="h-2.5 w-20 rounded-md bg-muted"></div>
						</div>
					</div>
					<div class="mt-4 flex gap-4 rounded-xl bg-muted/30 p-3">
						<div class="h-24 w-16 rounded-lg bg-muted"></div>
						<div class="flex-1 space-y-2">
							<div class="h-4 w-48 rounded-md bg-muted"></div>
							<div class="h-3 w-28 rounded-md bg-muted"></div>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{:else if items.length === 0}
		<!-- Empty State -->
		<div
			class="flex flex-col items-center justify-center space-y-3 rounded-2xl border border-border/60 bg-card/40 py-16 text-center"
		>
			<div
				class="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground"
			>
				<BookOpen class="h-6 w-6 opacity-40" />
			</div>
			<div class="max-w-sm space-y-1 px-4">
				<h2 class="text-sm font-bold text-foreground">{m.timeline_empty()}</h2>
				<p class="text-xs text-muted-foreground">{m.timeline_empty_desc()}</p>
			</div>
			<div class="pt-2">
				<Button href="/search" size="sm" class="gap-1.5 rounded-xl text-xs shadow-xs">
					<span>{m.search_books_cta()}</span>
				</Button>
			</div>
		</div>
	{:else}
		<!-- Timeline Feed List -->
		<div class="space-y-3.5 sm:space-y-4">
			{#each items as item (item.actor.did + item.type + (item.book.isbn13 || item.book.title) + item.timestamp)}
				<TimelineCard {item} onAddToMyShelf={handleAddToMyShelf} />
			{/each}
		</div>
	{/if}
</div>

<!-- Modal to Record Book -->
<BookRecordModal
	book={selectedBookForRecord}
	isOpen={isRecordModalOpen}
	onClose={() => (isRecordModalOpen = false)}
	onSaved={() => toast.success(m.save_success())}
/>

<!-- Login Modal -->
<LoginModal isOpen={isLoginModalOpen} onClose={() => (isLoginModalOpen = false)} />

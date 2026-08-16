<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { SvelteMap } from 'svelte/reactivity';
	import * as m from '$lib/paraglide/messages';
	import {
		fetchPublicProfile,
		fetchPublicShelfItems,
		buildShareText,
		type PublicUserProfile
	} from '$lib/services/atproto/publicShelf';
	import {
		filterAndSortShelfItems,
		type ShelfItem,
		type ShelfStatusFilter,
		type ShelfSortBy
	} from '$lib/services/bookRecord';
	import type { BookRef, ReadingStatusType } from '$lib/types/book';
	import { Button } from '$lib/components/ui/button';
	import BookGrid from '$lib/components/book/BookGrid.svelte';
	import ShelfListItem from '$lib/components/shelf/ShelfListItem.svelte';
	import BookDetailModal from '$lib/components/shelf/BookDetailModal.svelte';
	import BookRecordModal from '$lib/components/book/BookRecordModal.svelte';
	import {
		LayoutGrid,
		List,
		ArrowUpDown,
		Share2,
		Copy,
		Check,
		ExternalLink,
		BookMarked,
		User,
		UserX,
		ArrowLeft,
		Search
	} from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

	let handleParam = $derived(page.params.handle || '');
	let profile = $state<PublicUserProfile | null>(null);
	let rawItems = $state<ShelfItem[]>([]);
	let activeTab = $state<ShelfStatusFilter>('all');
	let viewMode = $state<'grid' | 'list'>('grid');
	let sortBy = $state<ShelfSortBy>('recent');
	let isLoading = $state(true);
	let isCopied = $state(false);

	let selectedItemForDetail = $state<ShelfItem | null>(null);
	let isDetailModalOpen = $state(false);

	let bookForRecordModal = $state<BookRef | null>(null);
	let isRecordModalOpen = $state(false);

	const tabs: Array<{ id: ShelfStatusFilter; label: () => string }> = [
		{ id: 'all', label: () => m.all() },
		{ id: 'reading', label: () => m.status_reading() },
		{ id: 'finished', label: () => m.status_finished() },
		{ id: 'backlog', label: () => m.status_backlog() },
		{ id: 'want', label: () => m.status_want() },
		{ id: 'dropped', label: () => m.status_dropped() }
	];

	const sortOptions: Array<{ id: ShelfSortBy; label: () => string }> = [
		{ id: 'recent', label: () => m.sort_recent() },
		{ id: 'title', label: () => m.sort_title() },
		{ id: 'rating', label: () => m.sort_rating() }
	];

	const filteredItems = $derived(filterAndSortShelfItems(rawItems, activeTab, sortBy));

	const counts = $derived.by(() => {
		const c: Record<string, number> = {
			all: rawItems.length,
			reading: 0,
			finished: 0,
			backlog: 0,
			want: 0,
			dropped: 0
		};
		for (const item of rawItems) {
			const s = item.statusRecord.status;
			if (c[s] !== undefined) c[s]++;
		}
		return c;
	});

	const statusMap = $derived.by(() => {
		const map = new SvelteMap<string, ReadingStatusType>();
		for (const item of rawItems) {
			const key = item.book.isbn13 || item.book.title;
			if (key) map.set(key, item.statusRecord.status);
		}
		return map;
	});

	onMount(async () => {
		await loadPublicShelf();
	});

	async function loadPublicShelf() {
		if (!handleParam) return;
		isLoading = true;
		try {
			const prof = await fetchPublicProfile(handleParam);
			profile = prof;
			if (prof?.did) {
				rawItems = await fetchPublicShelfItems(prof.did);
			}
		} finally {
			isLoading = false;
		}
	}

	function handleSelectBook(book: BookRef) {
		const found = rawItems.find(
			(i) => (i.book.isbn13 && i.book.isbn13 === book.isbn13) || i.book.title === book.title
		);
		if (found) {
			selectedItemForDetail = found;
			isDetailModalOpen = true;
		}
	}

	function handleShareBluesky() {
		if (!profile) return;
		const shareText = buildShareText({
			handle: profile.handle,
			displayName: profile.displayName,
			finishedCount: counts.finished
		});
		const url = `https://bsky.app/intent/compose?text=${encodeURIComponent(shareText)}`;
		window.open(url, '_blank', 'noreferrer');
	}

	async function handleCopyLink() {
		try {
			await navigator.clipboard.writeText(window.location.href);
			isCopied = true;
			toast.success(m.copied());
			setTimeout(() => {
				isCopied = false;
			}, 2000);
		} catch {
			toast.error('URL copy failed');
		}
	}

	function handleAddToMyShelf(book: BookRef) {
		bookForRecordModal = book;
		isRecordModalOpen = true;
	}
</script>

<svelte:head>
	<title>
		{profile ? `${profile.displayName || profile.handle} - ${m.my_shelf()}` : m.user_not_found()} | {m.app_name()}
	</title>
	{#if profile}
		<meta
			name="description"
			content="{profile.displayName || profile.handle} ({rawItems.length} {m.pages()})"
		/>
		<meta
			property="og:title"
			content="{profile.displayName || profile.handle} - {m.my_shelf()} | Blueshelf"
		/>
		<meta
			property="og:description"
			content="{profile.displayName || profile.handle} ({rawItems.length} {m.pages()})"
		/>
		{#if profile.avatar}
			<meta property="og:image" content={profile.avatar} />
		{/if}
	{/if}
</svelte:head>

<div class="container mx-auto max-w-6xl space-y-6 px-4 py-6 sm:py-8">
	{#if isLoading}
		<!-- Loading State -->
		<div class="flex h-64 flex-col items-center justify-center space-y-3">
			<span class="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
			></span>
			<p class="text-xs text-muted-foreground">Loading...</p>
		</div>
	{:else if !profile}
		<!-- Not Found (404) State -->
		<div class="flex flex-col items-center justify-center space-y-4 py-20 text-center">
			<div
				class="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground"
			>
				<UserX class="h-8 w-8 text-destructive opacity-60" />
			</div>
			<div class="max-w-md space-y-1.5">
				<h1 class="text-xl font-bold text-foreground">{m.user_not_found()}</h1>
				<p class="text-xs leading-relaxed text-muted-foreground">
					{m.user_not_found_desc()} (<span class="font-mono text-foreground">@{handleParam}</span>)
				</p>
			</div>
			<div class="flex flex-wrap items-center justify-center gap-2 pt-2">
				<Button href="/" variant="outline" size="sm" class="gap-1.5 rounded-xl text-xs">
					<ArrowLeft class="h-3.5 w-3.5" />
					<span>{m.back_to_home()}</span>
				</Button>
				<Button href="/search" size="sm" class="gap-1.5 rounded-xl text-xs shadow-xs">
					<Search class="h-3.5 w-3.5" />
					<span>{m.search_books_cta()}</span>
				</Button>
			</div>
		</div>
	{:else}
		<!-- Profile Card Header -->
		<div
			class="relative overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-5 shadow-sm sm:p-6"
		>
			<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<!-- Left: Avatar & User Info -->
				<div class="flex items-center gap-4">
					<div class="relative h-16 w-16 shrink-0 sm:h-20 sm:w-20">
						{#if profile.avatar}
							<img
								src={profile.avatar}
								alt={profile.handle}
								class="h-full w-full rounded-full border-2 border-primary/20 object-cover shadow-sm"
							/>
						{:else}
							<div
								class="flex h-full w-full items-center justify-center rounded-full bg-primary/10 text-primary"
							>
								<User class="h-8 w-8" />
							</div>
						{/if}
					</div>

					<div class="space-y-1">
						<h1 class="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
							{profile.displayName || profile.handle}
						</h1>
						<div class="flex items-center gap-2">
							<a
								href="https://bsky.app/profile/{profile.handle}"
								target="_blank"
								rel="noreferrer"
								class="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
							>
								<span>@{profile.handle}</span>
								<ExternalLink class="h-3 w-3" />
							</a>
						</div>
						{#if profile.description}
							<p class="line-clamp-2 max-w-xl text-xs leading-relaxed text-muted-foreground">
								{profile.description}
							</p>
						{/if}
					</div>
				</div>

				<!-- Right: Social Actions (Share) -->
				<div class="flex flex-wrap items-center gap-2 pt-2 sm:pt-0">
					<Button
						variant="outline"
						size="sm"
						onclick={handleCopyLink}
						class="gap-1.5 rounded-xl text-xs"
					>
						{#if isCopied}
							<Check class="h-3.5 w-3.5 text-emerald-500" />
							<span>{m.copied()}</span>
						{:else}
							<Copy class="h-3.5 w-3.5" />
							<span>{m.copy_link()}</span>
						{/if}
					</Button>

					<Button
						size="sm"
						onclick={handleShareBluesky}
						class="gap-1.5 rounded-xl text-xs font-semibold shadow-xs"
					>
						<Share2 class="h-3.5 w-3.5" />
						<span>{m.share_on_bluesky()}</span>
					</Button>
				</div>
			</div>
		</div>

		<!-- Controls: Tabs & View/Sort Switchers -->
		<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<!-- Status Tabs -->
			<div class="no-scrollbar flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
				{#each tabs as tab (tab.id)}
					{@const isSelected = activeTab === tab.id}
					{@const count = counts[tab.id] || 0}
					<button
						type="button"
						onclick={() => (activeTab = tab.id)}
						class="flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all {isSelected
							? 'border-primary bg-primary text-primary-foreground shadow-xs'
							: 'border-border/60 bg-card/50 text-muted-foreground hover:bg-muted hover:text-foreground'}"
					>
						<span>{tab.label()}</span>
						<span
							class="py-0.2 rounded-full px-1.5 text-[10px] {isSelected
								? 'bg-primary-foreground/20 text-primary-foreground'
								: 'bg-muted text-muted-foreground'}"
						>
							{count}
						</span>
					</button>
				{/each}
			</div>

			<!-- View Switcher & Sort Selector -->
			<div class="flex shrink-0 items-center justify-between gap-2 sm:justify-end">
				<!-- Sort Dropdown/Select -->
				<div
					class="flex items-center gap-1.5 rounded-xl border border-border/60 bg-card/60 px-2.5 py-1 text-xs text-muted-foreground"
				>
					<ArrowUpDown class="h-3.5 w-3.5" />
					<select
						bind:value={sortBy}
						class="cursor-pointer bg-transparent text-xs text-foreground focus:outline-none"
						aria-label="Sort options"
					>
						{#each sortOptions as opt (opt.id)}
							<option value={opt.id} class="bg-background text-foreground">{opt.label()}</option>
						{/each}
					</select>
				</div>

				<!-- View Mode Toggle -->
				<div class="flex items-center rounded-xl border border-border/60 bg-card/60 p-0.5">
					<button
						type="button"
						onclick={() => (viewMode = 'grid')}
						class="rounded-lg p-1.5 transition-colors {viewMode === 'grid'
							? 'bg-primary text-primary-foreground shadow-xs'
							: 'text-muted-foreground hover:text-foreground'}"
						title={m.grid_view()}
						aria-label="Grid view"
					>
						<LayoutGrid class="h-4 w-4" />
					</button>
					<button
						type="button"
						onclick={() => (viewMode = 'list')}
						class="rounded-lg p-1.5 transition-colors {viewMode === 'list'
							? 'bg-primary text-primary-foreground shadow-xs'
							: 'text-muted-foreground hover:text-foreground'}"
						title={m.list_view()}
						aria-label="List view"
					>
						<List class="h-4 w-4" />
					</button>
				</div>
			</div>
		</div>

		<!-- Shelf Content Area -->
		<div class="pt-2">
			{#if filteredItems.length > 0}
				{#if viewMode === 'grid'}
					<BookGrid
						books={filteredItems.map((item) => item.book)}
						{statusMap}
						onSelectBook={handleSelectBook}
					/>
				{:else}
					<div class="space-y-2.5">
						{#each filteredItems as item (item.book.isbn13 || item.book.title)}
							<ShelfListItem {item} onSelect={() => handleSelectBook(item.book)} />
						{/each}
					</div>
				{/if}
			{:else}
				<!-- Empty State -->
				<div class="flex flex-col items-center justify-center space-y-3 py-16 text-center">
					<div
						class="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground"
					>
						<BookMarked class="h-6 w-6 opacity-50" />
					</div>
					<h2 class="text-base font-bold text-foreground">
						{activeTab === 'all'
							? m.empty_shelf()
							: `「${tabs.find((t) => t.id === activeTab)?.label()}」`}
					</h2>
				</div>
			{/if}
		</div>
	{/if}
</div>

<!-- Book Detail Modal -->
<BookDetailModal
	item={selectedItemForDetail}
	isOpen={isDetailModalOpen}
	onClose={() => (isDetailModalOpen = false)}
	onAddToMyShelf={handleAddToMyShelf}
/>

<!-- Modal to add to my shelf -->
<BookRecordModal
	book={bookForRecordModal}
	isOpen={isRecordModalOpen}
	onClose={() => (isRecordModalOpen = false)}
	onSaved={() => toast.success(m.save())}
/>

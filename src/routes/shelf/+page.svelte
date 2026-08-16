<script lang="ts">
	import { onMount } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import * as m from '$lib/paraglide/messages';
	import {
		getAllReadingRecords,
		filterAndSortShelfItems,
		type ShelfItem,
		type ShelfStatusFilter,
		type ShelfSortBy
	} from '$lib/services/bookRecord';
	import type { BookRef, ReadingStatusType } from '$lib/types/book';
	import { Button } from '$lib/components/ui/button';
	import BookGrid from '$lib/components/book/BookGrid.svelte';
	import ShelfListItem from '$lib/components/shelf/ShelfListItem.svelte';
	import BookRecordModal from '$lib/components/book/BookRecordModal.svelte';
	import { Library, LayoutGrid, List, ArrowUpDown, Plus, Search, BookMarked } from '@lucide/svelte';

	let rawItems = $state<ShelfItem[]>([]);
	let activeTab = $state<ShelfStatusFilter>('all');
	let viewMode = $state<'grid' | 'list'>('grid');
	let sortBy = $state<ShelfSortBy>('recent');
	let isLoading = $state(true);

	let selectedBookForModal = $state<BookRef | null>(null);
	let isModalOpen = $state(false);

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
		await loadShelf();
	});

	async function loadShelf() {
		isLoading = true;
		try {
			rawItems = await getAllReadingRecords();
		} finally {
			isLoading = false;
		}
	}

	function handleSelectBook(book: BookRef) {
		selectedBookForModal = book;
		isModalOpen = true;
	}

	function handleModalSaved() {
		loadShelf();
	}
</script>

<svelte:head>
	<title>{m.my_shelf()} | {m.app_name()}</title>
</svelte:head>

<div class="container mx-auto max-w-6xl space-y-6 px-4 py-6 sm:py-8">
	<!-- Shelf Header -->
	<div
		class="flex flex-col gap-4 border-b border-border/40 pb-5 sm:flex-row sm:items-center sm:justify-between"
	>
		<div>
			<h1
				class="flex items-center gap-2.5 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl"
			>
				<Library class="h-7 w-7 text-primary" />
				<span>{m.my_shelf()}</span>
			</h1>
			<p class="pt-1 text-xs text-muted-foreground sm:text-sm">
				{m.shelf_subtitle({ count: rawItems.length })}
			</p>
		</div>

		<div class="flex items-center gap-2">
			<a href="/search">
				<Button size="sm" class="gap-1.5 rounded-xl shadow-sm">
					<Plus class="h-4 w-4" />
					<span>{m.add_book_btn()}</span>
				</Button>
			</a>
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
		{#if isLoading}
			<div class="flex h-48 items-center justify-center">
				<span class="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"
				></span>
			</div>
		{:else if filteredItems.length > 0}
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
			<div class="flex flex-col items-center justify-center space-y-4 py-20 text-center">
				<div
					class="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground"
				>
					<BookMarked class="h-7 w-7 opacity-50" />
				</div>
				<div class="space-y-1">
					<h2 class="text-base font-bold text-foreground">
						{activeTab === 'all'
							? m.empty_shelf()
							: `「${tabs.find((t) => t.id === activeTab)?.label()}」`}
					</h2>
					<p class="max-w-sm text-xs text-muted-foreground">
						{m.empty_shelf_hint()}
					</p>
				</div>
				<a href="/search" class="pt-2">
					<Button size="sm" class="gap-2 rounded-xl">
						<Search class="h-4 w-4" />
						<span>{m.search()}</span>
					</Button>
				</a>
			</div>
		{/if}
	</div>
</div>

<!-- Edit Modal -->
<BookRecordModal
	book={selectedBookForModal}
	isOpen={isModalOpen}
	onClose={() => (isModalOpen = false)}
	onSaved={handleModalSaved}
/>

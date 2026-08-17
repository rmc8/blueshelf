<script lang="ts">
	import { SvelteMap } from 'svelte/reactivity';
	import * as m from '$lib/paraglide/messages.js';
	import { getLocale } from '$lib/paraglide/runtime';
	import { searchBooks } from '$lib/services/bookSearch';
	import { getAllReadingRecords } from '$lib/services/bookRecord';
	import type { BookRef, ReadingStatusType } from '$lib/types/book';
	import { Input } from '$lib/components/ui/input';
	import BookGrid from '$lib/components/book/BookGrid.svelte';
	import BookSkeleton from '$lib/components/book/BookSkeleton.svelte';
	import BookRecordModal from '$lib/components/book/BookRecordModal.svelte';
	import { Search, Sparkles, X, BookX } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { onMount } from 'svelte';

	let searchQuery = $state('');
	let searchResults = $state<BookRef[]>([]);
	let isLoading = $state(false);
	let hasSearched = $state(false);

	let selectedBookForModal = $state<BookRef | null>(null);
	let isModalOpen = $state(false);

	const statusMap = new SvelteMap<string, ReadingStatusType>();

	const jaSuggestions = [
		'村上春樹',
		'東野圭吾',
		'伊坂幸太郎',
		'宮部みゆき',
		'小川洋子',
		'川上未映子',
		'朝井リョウ',
		'三島由紀夫',
		'太宰治',
		'プロジェクト・ヘイル・メアリー'
	];

	const enSuggestions = [
		'Haruki Murakami',
		'Andy Weir',
		'Kazuo Ishiguro',
		'Ted Chiang',
		'Sally Rooney',
		'George Orwell',
		'Stephen King',
		'Neil Gaiman',
		'Brandon Sanderson'
	];

	const popularSuggestions = $derived.by(() => {
		return getLocale() === 'ja' ? jaSuggestions : enSuggestions;
	});

	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	onMount(async () => {
		try {
			const shelfItems = await getAllReadingRecords();
			for (const item of shelfItems) {
				const key = item.book.isbn13 || item.book.title;
				if (key) {
					statusMap.set(key, item.statusRecord.status);
				}
			}
		} catch (err) {
			console.warn('Failed to load shelf status cache for search view:', err);
		}
	});

	async function performSearch(query: string) {
		const trimmed = query.trim();
		if (!trimmed) {
			searchResults = [];
			hasSearched = false;
			isLoading = false;
			return;
		}

		isLoading = true;
		hasSearched = true;

		try {
			const results = await searchBooks(trimmed);
			searchResults = results;
		} catch (err) {
			console.error('Book search error:', err);
			toast.error(m.search_error());
			searchResults = [];
		} finally {
			isLoading = false;
		}
	}

	function onQueryChange(e: Event) {
		const target = e.target as HTMLInputElement;
		searchQuery = target.value;

		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			performSearch(searchQuery);
		}, 300);
	}

	function handleSuggestionClick(term: string) {
		searchQuery = term;
		performSearch(term);
	}

	function clearSearch() {
		searchQuery = '';
		searchResults = [];
		hasSearched = false;
	}

	function handleSelectBook(book: BookRef) {
		selectedBookForModal = book;
		isModalOpen = true;
	}

	function handleModalSaved(newStatus: ReadingStatusType) {
		if (selectedBookForModal) {
			const key = selectedBookForModal.isbn13 || selectedBookForModal.title;
			if (key) {
				statusMap.set(key, newStatus);
			}
		}
	}
</script>

<svelte:head>
	<title>{m.search()} | {m.app_name()}</title>
</svelte:head>

<div class="container mx-auto max-w-6xl space-y-6 px-4 py-6 sm:py-8">
	<!-- Search Header & Input Bar -->
	<div class="mx-auto max-w-2xl space-y-4 text-center">
		<h1 class="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
			{m.search()}
		</h1>
		<p class="text-xs text-muted-foreground sm:text-sm">
			{m.search_subtitle()}
		</p>

		<!-- Search Input Box -->
		<div class="relative flex items-center shadow-xs">
			<div
				class="pointer-events-none absolute left-3.5 z-10 flex items-center text-muted-foreground"
			>
				<Search class="h-4 w-4" />
			</div>

			<Input
				type="text"
				placeholder={m.search_placeholder()}
				bind:value={searchQuery}
				oninput={onQueryChange}
				class="h-11 rounded-xl border-border/80 bg-card pr-10 pl-10 text-sm text-foreground shadow-xs focus-visible:ring-primary"
				autofocus
			/>

			{#if searchQuery}
				<button
					type="button"
					onclick={clearSearch}
					class="absolute right-3.5 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
					aria-label="Clear search"
				>
					<X class="h-3.5 w-3.5" />
				</button>
			{/if}
		</div>

		<!-- Popular Search Suggestions -->
		<div class="flex flex-wrap items-center justify-center gap-1.5 pt-1">
			<span class="mr-1 flex items-center gap-1 text-xs text-muted-foreground">
				<Sparkles class="h-3 w-3 text-sky-500" />
				{m.search_recommended()}
			</span>
			{#each popularSuggestions as suggestion (suggestion)}
				<button
					type="button"
					onclick={() => handleSuggestionClick(suggestion)}
					class="rounded-full border border-border/60 bg-muted/40 px-2.5 py-0.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
				>
					{suggestion}
				</button>
			{/each}
		</div>
	</div>

	<!-- Results Area -->
	<div class="pt-4">
		{#if isLoading}
			<BookSkeleton count={10} />
		{:else if searchResults.length > 0}
			<div class="space-y-4">
				<div class="flex items-center justify-between px-1 text-xs text-muted-foreground">
					<span>{m.search_results_count({ count: searchResults.length })}</span>
				</div>
				<BookGrid books={searchResults} {statusMap} onSelectBook={handleSelectBook} />
			</div>
		{:else if hasSearched}
			<!-- Empty State -->
			<div class="flex flex-col items-center justify-center space-y-3 py-16 text-center">
				<div
					class="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground"
				>
					<BookX class="h-6 w-6 opacity-60" />
				</div>
				<h2 class="text-base font-bold text-foreground">{m.search_not_found_title()}</h2>
				<p class="max-w-sm text-xs text-muted-foreground">
					{m.search_not_found_desc()}
				</p>
			</div>
		{:else}
			<!-- Initial Search Hint State -->
			<div class="flex flex-col items-center justify-center space-y-3 py-16 text-center">
				<div
					class="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400"
				>
					<Search class="h-6 w-6" />
				</div>
				<h2 class="text-base font-semibold text-foreground">{m.search_hint_title()}</h2>
				<p class="max-w-sm text-xs text-muted-foreground">
					{m.search_hint_desc()}
				</p>
			</div>
		{/if}
	</div>
</div>

<!-- Book Record & Review Modal -->
<BookRecordModal
	book={selectedBookForModal}
	isOpen={isModalOpen}
	onClose={() => (isModalOpen = false)}
	onSaved={handleModalSaved}
/>

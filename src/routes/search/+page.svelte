<script lang="ts">
	import { onMount } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import * as m from '$lib/paraglide/messages';
	import { searchBooks } from '$lib/services/bookSearch';
	import type { BookRef, ReadingStatusType } from '$lib/types/book';
	import { db } from '$lib/db';
	import { Input } from '$lib/components/ui/input';
	import BookGrid from '$lib/components/book/BookGrid.svelte';
	import BookSkeleton from '$lib/components/book/BookSkeleton.svelte';
	import BookRecordModal from '$lib/components/book/BookRecordModal.svelte';
	import { Search, Sparkles, BookX, X } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

	let searchQuery = $state('');
	let searchResults = $state<BookRef[]>([]);
	let isLoading = $state(false);
	let hasSearched = $state(false);
	let debounceTimer: ReturnType<typeof setTimeout>;

	let statusMap = new SvelteMap<string, ReadingStatusType>();
	let selectedBookForModal = $state<BookRef | null>(null);
	let isModalOpen = $state(false);

	const popularSuggestions = [
		'SvelteKit',
		'TypeScript',
		'Deno',
		'村上春樹',
		'SF小説',
		'デザインシステム'
	];

	onMount(async () => {
		await loadStatusMap();
	});

	async function loadStatusMap() {
		if (typeof indexedDB === 'undefined') return;
		try {
			const statuses = await db.readingStatuses.toArray();
			statusMap.clear();
			for (const item of statuses) {
				const key = item.book?.isbn13 || item.book?.title;
				if (key) {
					statusMap.set(key, item.status);
				}
			}
		} catch {
			// Ignore
		}
	}

	function onQueryChange() {
		clearTimeout(debounceTimer);
		const q = searchQuery.trim();
		if (!q) {
			searchResults = [];
			hasSearched = false;
			isLoading = false;
			return;
		}

		isLoading = true;
		debounceTimer = setTimeout(() => {
			executeSearch(q);
		}, 300);
	}

	async function executeSearch(query: string) {
		const q = query.trim();
		if (!q) return;

		isLoading = true;
		hasSearched = true;

		try {
			const books = await searchBooks(q);
			searchResults = books;
		} catch (error) {
			console.error('Search failed:', error);
			toast.error('検索中にエラーが発生しました');
		} finally {
			isLoading = false;
		}
	}

	function handleSuggestionClick(term: string) {
		searchQuery = term;
		executeSearch(term);
	}

	function clearSearch() {
		searchQuery = '';
		searchResults = [];
		hasSearched = false;
		isLoading = false;
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
			Google Books と openBD を横断し、和書・洋書の書誌・書影を高精度に検索します。
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
				おすすめ:
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
					<span>検索結果: {searchResults.length} 件</span>
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
				<h2 class="text-base font-bold text-foreground">該当する本が見つかりませんでした</h2>
				<p class="max-w-sm text-xs text-muted-foreground">
					キーワードやISBN（ハイフン有無どちらでも可）をご確認の上、もう一度お試しください。
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
				<h2 class="text-base font-semibold text-foreground">気になる本を探してみましょう</h2>
				<p class="max-w-sm text-xs text-muted-foreground">
					タイトル、著者名、または13桁/10桁のISBNを入力すると、自動で書誌情報を取得します。
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

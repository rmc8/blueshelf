<script lang="ts">
	import { onMount } from 'svelte';
	import * as m from '$lib/paraglide/messages';
	import { searchBooks } from '$lib/services/bookSearch';
	import type { BookRef } from '$lib/types/book';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import BookGrid from '$lib/components/book/BookGrid.svelte';
	import BookSkeleton from '$lib/components/book/BookSkeleton.svelte';
	import { Search, Sparkles, BookX, X } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

	let searchQuery = $state('');
	let searchResults = $state<BookRef[]>([]);
	let isLoading = $state(false);
	let hasSearched = $state(false);
	let debounceTimer: ReturnType<typeof setTimeout>;

	const popularSuggestions = [
		'SvelteKit',
		'TypeScript',
		'Deno',
		'村上春樹',
		'SF小説',
		'デザインシステム'
	];

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
		toast.info(`「${book.title}」を選択しました (記録モーダルはStep 3で実装)`);
	}
</script>

<svelte:head>
	<title>{m.search()} | {m.app_name()}</title>
</svelte:head>

<div class="container mx-auto max-w-6xl px-4 py-6 sm:py-8 space-y-6">
	<!-- Search Header & Input Bar -->
	<div class="mx-auto max-w-2xl text-center space-y-4">
		<h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
			{m.search()}
		</h1>
		<p class="text-xs sm:text-sm text-muted-foreground">
			Google Books と openBD を横断し、和書・洋書の書誌・書影を高精度に検索します。
		</p>

		<!-- Search Input Box -->
		<div class="relative flex items-center shadow-sm">
			<div class="absolute left-3.5 flex items-center pointer-events-none text-muted-foreground">
				<Search class="h-4 w-4" />
			</div>

			<Input
				type="text"
				placeholder={m.search_placeholder()}
				bind:value={searchQuery}
				oninput={onQueryChange}
				class="h-11 pl-10 pr-10 text-sm rounded-xl border-border/60 bg-card/60 backdrop-blur-sm focus-visible:ring-primary"
				autofocus
			/>

			{#if searchQuery}
				<button
					type="button"
					onclick={clearSearch}
					class="absolute right-3.5 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
					aria-label="Clear search"
				>
					<X class="h-3.5 w-3.5" />
				</button>
			{/if}
		</div>

		<!-- Popular Search Suggestions -->
		<div class="flex flex-wrap items-center justify-center gap-1.5 pt-1">
			<span class="text-xs text-muted-foreground mr-1 flex items-center gap-1">
				<Sparkles class="h-3 w-3 text-sky-500" />
				おすすめ:
			</span>
			{#each popularSuggestions as suggestion}
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
				<div class="flex items-center justify-between text-xs text-muted-foreground px-1">
					<span>検索結果: {searchResults.length} 件</span>
				</div>
				<BookGrid books={searchResults} onSelectBook={handleSelectBook} />
			</div>
		{:else if hasSearched}
			<!-- Empty State -->
			<div class="flex flex-col items-center justify-center py-16 text-center space-y-3">
				<div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground">
					<BookX class="h-6 w-6 opacity-60" />
				</div>
				<h2 class="font-bold text-base text-foreground">該当する本が見つかりませんでした</h2>
				<p class="max-w-sm text-xs text-muted-foreground">
					キーワードやISBN（ハイフン有無どちらでも可）をご確認の上、もう一度お試しください。
				</p>
			</div>
		{:else}
			<!-- Initial Search Hint State -->
			<div class="flex flex-col items-center justify-center py-16 text-center space-y-3">
				<div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
					<Search class="h-6 w-6" />
				</div>
				<h2 class="font-semibold text-base text-foreground">気になる本を探してみましょう</h2>
				<p class="max-w-sm text-xs text-muted-foreground">
					タイトル、著者名、または13桁/10桁のISBNを入力すると、自動で書誌情報を取得します。
				</p>
			</div>
		{/if}
	</div>
</div>

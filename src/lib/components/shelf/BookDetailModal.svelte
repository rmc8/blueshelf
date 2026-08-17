<script lang="ts">
	import type { ShelfItem } from '$lib/services/bookRecord';
	import type { BookRef } from '$lib/types/book';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import StarRating from '$lib/components/book/StarRating.svelte';
	import BookCoverPlaceholder from '$lib/components/book/BookCoverPlaceholder.svelte';
	import { X, Plus, ExternalLink, AlertTriangle } from '@lucide/svelte';
	import * as m from '$lib/paraglide/messages';

	interface Props {
		item: ShelfItem | null;
		isOpen: boolean;
		onClose: () => void;
		onAddToMyShelf?: (book: BookRef) => void;
	}

	let { item, isOpen, onClose, onAddToMyShelf }: Props = $props();

	let revealSpoiler = $state(false);
	let imageError = $state(false);

	$effect(() => {
		if (isOpen) {
			revealSpoiler = false;
			imageError = false;
		}
	});

	function getStatusLabel(s: string) {
		switch (s) {
			case 'want':
				return m.status_want();
			case 'reading':
				return m.status_reading();
			case 'finished':
				return m.status_finished();
			case 'backlog':
				return m.status_backlog();
			case 'dropped':
				return m.status_dropped();
			default:
				return '';
		}
	}

	function handleBackdrop(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onClose();
		}
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		}
	}
</script>

<svelte:window onkeydown={handleKeyDown} />

{#if isOpen && item}
	{@const book = item.book}
	{@const status = item.statusRecord.status}
	{@const review = item.reviewRecord}

	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<!-- Backdrop -->
		<button
			type="button"
			class="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
			onclick={handleBackdrop}
			aria-label="Close modal overlay"
			tabindex="-1"
		></button>

		<!-- Modal Content Box -->
		<div
			class="relative z-10 max-h-[90vh] w-full max-w-lg space-y-5 overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl"
			role="dialog"
			aria-modal="true"
			aria-labelledby="book-detail-title"
		>
			<!-- Close Button -->
			<button
				type="button"
				onclick={onClose}
				class="absolute top-4 right-4 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
				aria-label="Close modal"
			>
				<X class="h-4 w-4" />
			</button>

			<!-- Book Header -->
			<div class="flex items-start gap-4 pr-6">
				<div
					class="relative aspect-2/3 w-24 shrink-0 overflow-hidden rounded-lg border border-border/40 bg-muted/60 shadow-sm"
				>
					{#if book.coverUrl && !imageError}
						<img
							src={book.coverUrl}
							alt={book.title}
							class="h-full w-full object-cover"
							onerror={() => (imageError = true)}
						/>
					{:else}
						<BookCoverPlaceholder
							title={book.title}
							author={book.authors?.[0]}
							publisher={book.publisher}
						/>
					{/if}
				</div>

				<div class="min-w-0 flex-1 space-y-1.5">
					<div class="flex items-center gap-2">
						<Badge variant={status} class="px-2.5 py-0.5 text-xs font-semibold">
							{getStatusLabel(status)}
						</Badge>
					</div>

					<h2
						id="book-detail-title"
						class="line-clamp-2 text-lg leading-snug font-bold text-foreground"
					>
						{book.title}
					</h2>

					<div class="space-y-0.5 text-xs text-muted-foreground">
						{#if book.authors?.length}
							<p class="truncate font-medium text-foreground/80">{book.authors.join(', ')}</p>
						{/if}
						<div class="flex flex-wrap items-center gap-2 text-[11px]">
							{#if book.publisher}
								<span>{book.publisher}</span>
							{/if}
							{#if book.publishedDate}
								<span>• {book.publishedDate}</span>
							{/if}
							{#if book.pageCount}
								<span>• {book.pageCount} {m.pages()}</span>
							{/if}
						</div>
					</div>
				</div>
			</div>

			<!-- Reading Progress (if reading) -->
			{#if status === 'reading' && item.statusRecord.currentPage}
				<div class="space-y-1.5 rounded-xl border border-border/60 bg-muted/30 p-3.5 text-xs">
					<div class="flex justify-between font-medium">
						<span class="text-muted-foreground">{m.reading_progress()}</span>
						<span class="font-bold text-primary">
							{item.statusRecord.currentPage} / {book.pageCount || '?'}
							{m.pages()}
						</span>
					</div>
					{#if book.pageCount}
						<div class="h-2 w-full overflow-hidden rounded-full bg-muted">
							<div
								class="h-full rounded-full bg-primary transition-all"
								style="width: {Math.min(
									100,
									Math.round((item.statusRecord.currentPage / book.pageCount) * 100)
								)}%"
							></div>
						</div>
					{/if}
				</div>
			{/if}

			<!-- Review Section -->
			{#if review?.rating || review?.content}
				<div class="space-y-2.5 rounded-xl border border-border/60 bg-card/60 p-4 shadow-xs">
					<div class="flex items-center justify-between">
						<span class="text-xs font-bold text-foreground">{m.rating_and_review()}</span>
						{#if review?.rating}
							<StarRating rating={review.rating} readonly maxRating={5} />
						{/if}
					</div>

					{#if review?.content}
						{#if review.hasSpoiler && !revealSpoiler}
							<div
								class="space-y-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-center"
							>
								<div
									class="flex items-center justify-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400"
								>
									<AlertTriangle class="h-4 w-4" />
									<span>{m.contains_spoiler_warning()}</span>
								</div>
								<Button
									size="sm"
									variant="outline"
									class="h-7 text-xs"
									onclick={() => (revealSpoiler = true)}
								>
									{m.show_spoiler()}
								</Button>
							</div>
						{:else}
							<p class="text-xs leading-relaxed whitespace-pre-wrap text-foreground/90">
								{review.content}
							</p>
						{/if}
					{/if}
				</div>
			{/if}

			<!-- Actions -->
			<div class="flex items-center justify-between border-t border-border/40 pt-2">
				{#if book.isbn13}
					<a
						href="https://openlibrary.org/isbn/{book.isbn13}"
						target="_blank"
						rel="noreferrer"
						class="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
					>
						<ExternalLink class="h-3.5 w-3.5" />
						<span>{m.open_in_openlibrary()}</span>
					</a>
				{:else}
					<div></div>
				{/if}

				<div class="flex items-center gap-2">
					{#if onAddToMyShelf}
						<Button
							size="sm"
							class="gap-1.5 rounded-xl shadow-xs"
							onclick={() => {
								onAddToMyShelf(book);
								onClose();
							}}
						>
							<Plus class="h-4 w-4" />
							<span>{m.add_to_my_shelf()}</span>
						</Button>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}

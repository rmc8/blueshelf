<script lang="ts">
	import type { BookRef, ReadingStatusType } from '$lib/types/book';
	import { saveReadingRecord, getBookRecord } from '$lib/services/bookRecord';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import StarRating from '$lib/components/book/StarRating.svelte';
	import BookCoverPlaceholder from '$lib/components/book/BookCoverPlaceholder.svelte';
	import {
		X,
		Book,
		Bookmark,
		BookOpen,
		CheckCircle,
		Clock,
		Ban,
		Share2,
		Save
	} from '@lucide/svelte';
	import * as m from '$lib/paraglide/messages.js';
	import { toast } from 'svelte-sonner';

	interface Props {
		book: BookRef | null;
		isOpen: boolean;
		onClose: () => void;
		onSaved?: (newStatus: ReadingStatusType) => void;
	}

	let { book, isOpen, onClose, onSaved }: Props = $props();

	let selectedStatus = $state<ReadingStatusType>('want');
	let currentPage = $state(0);
	let totalPages = $state(0);
	let rating = $state(0);
	let reviewContent = $state('');
	let hasSpoiler = $state(false);
	let crosspostToBluesky = $state(false);
	let isSaving = $state(false);

	const statuses: Array<{
		type: ReadingStatusType;
		label: () => string;
		icon: typeof Bookmark;
		color: string;
	}> = [
		{
			type: 'want',
			label: () => m.status_want(),
			icon: Bookmark,
			color: 'text-amber-600 bg-amber-500/10 border-amber-500/30'
		},
		{
			type: 'reading',
			label: () => m.status_reading(),
			icon: BookOpen,
			color: 'text-blue-600 bg-blue-500/10 border-blue-500/30'
		},
		{
			type: 'finished',
			label: () => m.status_finished(),
			icon: CheckCircle,
			color: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/30'
		},
		{
			type: 'backlog',
			label: () => m.status_backlog(),
			icon: Clock,
			color: 'text-purple-600 bg-purple-500/10 border-purple-500/30'
		},
		{
			type: 'dropped',
			label: () => m.status_dropped(),
			icon: Ban,
			color: 'text-zinc-600 bg-zinc-500/10 border-zinc-500/30'
		}
	];

	// モーダルが開かれたとき、既存レコードを取得してフォームを初期化
	$effect(() => {
		if (isOpen && book) {
			totalPages = book.pageCount || 0;
			loadExistingData(book);
		}
	});

	async function loadExistingData(targetBook: BookRef) {
		try {
			const bookKey = targetBook.isbn13 || targetBook.title;
			if (!bookKey) return;
			const { statusRecord, reviewRecord } = await getBookRecord(bookKey);
			if (statusRecord) {
				selectedStatus = statusRecord.status;
				currentPage = statusRecord.currentPage || 0;
			} else {
				selectedStatus = 'want';
				currentPage = 0;
			}
			if (reviewRecord) {
				rating = reviewRecord.rating || 0;
				reviewContent = reviewRecord.content || '';
				hasSpoiler = reviewRecord.hasSpoiler || false;
			} else {
				rating = 0;
				reviewContent = '';
				hasSpoiler = false;
			}
		} catch (err) {
			console.warn('Failed to load existing record:', err);
		}
	}

	import { authState } from '$lib/stores/auth.svelte';
	import { postToBluesky, buildCrosspostText } from '$lib/services/atproto/crosspost';
	import { saveQuoteRecord, createQuoteRecord } from '$lib/services/quoteRecord';

	let activeModalTab = $state<'record' | 'quote'>('record');
	let quoteText = $state('');
	let quotePage = $state<number | undefined>(undefined);
	let quoteComment = $state('');

	async function handleSave() {
		if (!book) return;
		isSaving = true;

		try {
			if (activeModalTab === 'record') {
				// 1. PDS への読書記録保存
				await saveReadingRecord({
					book,
					status: selectedStatus,
					currentPage: selectedStatus === 'reading' ? currentPage : undefined,
					rating: rating > 0 ? rating : undefined,
					reviewContent: reviewContent.trim() || undefined,
					hasSpoiler: reviewContent.trim() ? hasSpoiler : undefined
				});

				// 2. Bluesky クロスポスト
				if (crosspostToBluesky && authState.agent) {
					try {
						const text = buildCrosspostText({
							book,
							status: selectedStatus,
							rating: rating > 0 ? rating : undefined,
							reviewText: reviewContent.trim() || undefined
						});
						const currentUrl =
							typeof window !== 'undefined' ? window.location.origin : 'https://bs.rmc-8.com';
						const detailUrl = `${currentUrl}/search?q=${encodeURIComponent(book.isbn13 || book.title)}`;

						await postToBluesky(authState.agent, {
							text,
							book,
							url: detailUrl,
							description: reviewContent.trim() || undefined
						});
						toast.success(m.crosspost_success());
					} catch (crosspostErr) {
						console.warn('Crosspost failed:', crosspostErr);
					}
				}

				toast.success(m.save_success());

				if (onSaved) {
					onSaved(selectedStatus);
				}
			} else {
				// 引用・フレーズの保存
				if (!quoteText.trim()) {
					toast.error('引用フレーズを入力してください');
					isSaving = false;
					return;
				}

				if (authState.agent) {
					const quote = createQuoteRecord({
						book,
						quoteText,
						pageNumber: quotePage,
						comment: quoteComment
					});
					await saveQuoteRecord(authState.agent, quote);

					if (crosspostToBluesky) {
						const text = buildCrosspostText({
							book,
							quoteText,
							pageNumber: quotePage
						});
						const currentUrl =
							typeof window !== 'undefined' ? window.location.origin : 'https://bs.rmc-8.com';
						await postToBluesky(authState.agent, {
							text,
							book,
							url: `${currentUrl}/search?q=${encodeURIComponent(book.isbn13 || book.title)}`,
							description: quoteComment.trim() || undefined
						});
						toast.success(m.crosspost_success());
					}

					toast.success(m.quote_save_success());
				}
			}

			onClose();
		} catch (err) {
			console.error('Failed to save book record / quote:', err);
			toast.error(m.save_error());
		} finally {
			isSaving = false;
		}
	}

	function handleBackdrop(e: MouseEvent) {
		if (e.target === e.currentTarget && !isSaving) {
			onClose();
		}
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Escape' && !isSaving) {
			onClose();
		}
	}
</script>

<svelte:window onkeydown={handleKeyDown} />

{#if isOpen && book}
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
			aria-labelledby="modal-book-title"
		>
			<!-- Close Button -->
			<button
				type="button"
				onclick={onClose}
				disabled={isSaving}
				class="absolute top-4 right-4 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
				aria-label="Close modal"
			>
				<X class="h-4 w-4" />
			</button>

			<!-- Book Header -->
			<div class="flex items-start gap-4 pr-6">
				<div
					class="relative aspect-2/3 w-20 shrink-0 overflow-hidden rounded-lg border border-border/40 bg-muted/60 shadow-sm"
				>
					{#if book.coverUrl}
						<img src={book.coverUrl} alt={book.title} class="h-full w-full object-cover" />
					{:else}
						<BookCoverPlaceholder
							title={book.title}
							author={book.authors?.[0]}
							publisher={book.publisher}
						/>
					{/if}
				</div>

				<div class="min-w-0 flex-1 space-y-1">
					<h2
						id="modal-book-title"
						class="line-clamp-2 text-base leading-snug font-bold text-foreground sm:text-lg"
					>
						{book.title}
					</h2>
					{#if book.authors?.length}
						<p class="truncate text-xs font-medium text-muted-foreground">
							{book.authors.join(', ')}
						</p>
					{/if}
					<div class="flex flex-wrap items-center gap-2 pt-0.5 text-[11px] text-muted-foreground">
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

			<!-- Modal Tab Switcher -->
			<div class="flex rounded-xl border border-border/60 bg-muted/40 p-1">
				<button
					type="button"
					onclick={() => (activeModalTab = 'record')}
					class="flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all {activeModalTab ===
					'record'
						? 'bg-card text-foreground shadow-xs'
						: 'text-muted-foreground hover:text-foreground'}"
				>
					{m.my_shelf()}
				</button>
				<button
					type="button"
					onclick={() => (activeModalTab = 'quote')}
					class="flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all {activeModalTab ===
					'quote'
						? 'bg-card text-foreground shadow-xs'
						: 'text-muted-foreground hover:text-foreground'}"
				>
					{m.quotes_title()}
				</button>
			</div>

			{#if activeModalTab === 'record'}
				<!-- Status Selector -->
				<div class="space-y-2">
					<span class="text-xs font-semibold text-foreground">{m.status_label()}</span>
					<div class="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
						{#each statuses as s (s.type)}
							{@const isSelected = selectedStatus === s.type}
							{@const Icon = s.icon}
							<button
								type="button"
								onclick={() => (selectedStatus = s.type)}
								class="flex flex-col items-center justify-center gap-1.5 rounded-xl border px-1 py-2.5 text-xs font-medium transition-all {isSelected
									? `${s.color} scale-102 border-current font-bold shadow-xs`
									: 'border-border/60 bg-card/40 text-muted-foreground hover:bg-muted/60 hover:text-foreground'}"
							>
								<Icon class="h-4 w-4" />
								<span class="text-[11px]">{s.label()}</span>
							</button>
						{/each}
					</div>
				</div>

				<!-- Reading Progress (If Reading) -->
				{#if selectedStatus === 'reading'}
					<div class="space-y-2 rounded-xl border border-blue-500/20 bg-blue-500/5 p-3.5">
						<div class="flex items-center justify-between text-xs font-medium">
							<span class="text-blue-700 dark:text-blue-300">{m.progress_pages()}</span>
							<span class="font-bold text-foreground">
								{currentPage} / {totalPages || '?'}
								{m.pages()}
								{#if totalPages > 0}
									({Math.round((currentPage / totalPages) * 100)}%)
								{/if}
							</span>
						</div>
						{#if totalPages > 0}
							<input
								type="range"
								min="0"
								max={totalPages}
								bind:value={currentPage}
								class="h-1.5 w-full cursor-pointer rounded-lg bg-muted accent-blue-600"
							/>
						{/if}
						<div class="flex items-center gap-2 pt-1">
							<Input
								type="number"
								min="0"
								max={totalPages || 9999}
								bind:value={currentPage}
								class="h-8 w-24 text-xs"
							/>
							<span class="text-xs text-muted-foreground">{m.read_up_to_page()}</span>
						</div>
					</div>
				{/if}

				<!-- Star Rating -->
				<div class="space-y-1.5">
					<span class="text-xs font-semibold text-foreground">{m.rating()}</span>
					<StarRating {rating} onChange={(r) => (rating = r)} />
				</div>

				<!-- Review & Thoughts Area -->
				<div class="space-y-2">
					<div class="flex items-center justify-between">
						<span class="text-xs font-semibold text-foreground">{m.write_review()}</span>
						<span class="text-[11px] text-muted-foreground">{reviewContent.length} / 1000</span>
					</div>
					<textarea
						bind:value={reviewContent}
						rows="3"
						maxlength="1000"
						placeholder={m.review_placeholder()}
						class="w-full rounded-xl border border-border/60 bg-card/60 p-3 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none sm:text-sm"
					></textarea>

					<!-- Spoiler Checkbox -->
					<label class="flex cursor-pointer items-center gap-2 pt-0.5">
						<input
							type="checkbox"
							bind:checked={hasSpoiler}
							class="h-4 w-4 rounded border-border text-primary focus:ring-primary"
						/>
						<span class="text-xs text-muted-foreground">{m.spoiler_warning()}</span>
					</label>
				</div>
			{:else}
				<!-- Quote Recording Form -->
				<div class="space-y-3">
					<div class="space-y-1">
						<label for="quote-text" class="text-xs font-semibold text-foreground">
							{m.quote_label()} <span class="text-destructive">*</span>
						</label>
						<textarea
							id="quote-text"
							bind:value={quoteText}
							rows="4"
							maxlength="1000"
							placeholder="心に残った文章や名言を入力..."
							class="w-full rounded-xl border border-border/60 bg-card/60 p-3 text-xs text-foreground italic placeholder:text-muted-foreground/60 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none sm:text-sm"
						></textarea>
					</div>

					<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
						<div class="space-y-1">
							<label for="quote-page" class="text-xs font-semibold text-foreground">
								{m.quote_page_label()}
							</label>
							<Input
								id="quote-page"
								type="number"
								min="1"
								bind:value={quotePage}
								placeholder="例: 142"
								class="h-8 text-xs"
							/>
						</div>

						<div class="space-y-1 sm:col-span-2">
							<label for="quote-comment" class="text-xs font-semibold text-foreground">
								{m.quote_comment_label()}
							</label>
							<Input
								id="quote-comment"
								type="text"
								bind:value={quoteComment}
								placeholder="自分用のメモや感想..."
								class="h-8 text-xs"
							/>
						</div>
					</div>
				</div>
			{/if}

			<!-- Crosspost Toggle -->
			<div
				class="flex items-center justify-between rounded-xl border border-border/60 bg-card/40 p-3 text-xs"
			>
				<div class="flex items-center gap-2">
					<Share2 class="h-4 w-4 text-sky-500" />
					<span class="font-medium text-foreground">{m.crosspost_to_bluesky()}</span>
				</div>
				<input
					type="checkbox"
					bind:checked={crosspostToBluesky}
					class="h-4 w-4 rounded border-border text-primary focus:ring-primary"
				/>
			</div>

			<!-- Modal Footer Actions -->
			<div class="flex items-center justify-end gap-2 border-t border-border/40 pt-4">
				<Button variant="outline" size="sm" onclick={onClose} disabled={isSaving}>
					{m.cancel()}
				</Button>

				<Button
					size="sm"
					onclick={handleSave}
					disabled={isSaving}
					class="gap-1.5 font-semibold shadow-xs"
				>
					{#if isSaving}
						<span
							class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"
						></span>
						<span>{m.save()}...</span>
					{:else}
						<Save class="h-3.5 w-3.5" />
						<span>{m.save_to_pds()}</span>
					{/if}
				</Button>
			</div>
		</div>
	</div>
{/if}

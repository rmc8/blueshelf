<script lang="ts">
	import type { BookRef, ReadingStatusType } from '$lib/types/book';
	import { saveReadingRecord, getBookRecord } from '$lib/services/bookRecord';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import StarRating from './StarRating.svelte';
	import { X, Book, Check, Bookmark, BookOpen, CheckCircle, Clock, Ban } from '@lucide/svelte';
	import * as m from '$lib/paraglide/messages';
	import { toast } from 'svelte-sonner';

	interface Props {
		book: BookRef | null;
		isOpen: boolean;
		onClose: () => void;
		onSaved?: (status: ReadingStatusType) => void;
	}

	let { book, isOpen, onClose, onSaved }: Props = $props();

	let selectedStatus = $state<ReadingStatusType>('want');
	let currentPage = $state<number>(0);
	let totalPages = $state<number>(0);
	let rating = $state<number>(0);
	let reviewContent = $state('');
	let hasSpoiler = $state(false);
	let isSaving = $state(false);

	const statuses: Array<{
		type: ReadingStatusType;
		label: string;
		icon: typeof Bookmark;
		color: string;
	}> = [
		{
			type: 'want',
			label: m.status_want(),
			icon: Bookmark,
			color: 'text-amber-600 bg-amber-500/10 border-amber-500/30'
		},
		{
			type: 'reading',
			label: m.status_reading(),
			icon: BookOpen,
			color: 'text-blue-600 bg-blue-500/10 border-blue-500/30'
		},
		{
			type: 'finished',
			label: m.status_finished(),
			icon: CheckCircle,
			color: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/30'
		},
		{
			type: 'backlog',
			label: m.status_backlog(),
			icon: Clock,
			color: 'text-purple-600 bg-purple-500/10 border-purple-500/30'
		},
		{
			type: 'dropped',
			label: m.status_dropped(),
			icon: Ban,
			color: 'text-zinc-600 bg-zinc-500/10 border-zinc-500/30'
		}
	];

	// モーダルが開かれたとき、既存レコードを取得してフォームを初期化
	$effect(() => {
		if (isOpen && book) {
			totalPages = book.pageCount || 0;
			const key = book.isbn13 || book.title;
			getBookRecord(key).then(({ statusRecord, reviewRecord }) => {
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
			});
		}
	});

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && isOpen) {
			onClose();
		}
	}

	async function handleSave() {
		if (!book) return;
		isSaving = true;

		try {
			await saveReadingRecord({
				book,
				status: selectedStatus,
				currentPage: selectedStatus === 'finished' ? totalPages : currentPage,
				rating,
				reviewContent,
				hasSpoiler
			});

			toast.success(
				`「${book.title}」を【${statuses.find((s) => s.type === selectedStatus)?.label}】として保存しました！`
			);
			onSaved?.(selectedStatus);
			onClose();
		} catch (e) {
			console.error('Failed to save record:', e);
			toast.error('保存中にエラーが発生しました');
		} finally {
			isSaving = false;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen && book}
	<!-- Modal Overlay Container -->
	<div class="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
		<!-- Backdrop -->
		<button
			type="button"
			class="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
			onclick={onClose}
			aria-label="Close modal overlay"
			tabindex="-1"
		></button>

		<!-- Modal Content Box -->
		<div
			class="relative z-10 max-h-[90vh] w-full max-w-lg space-y-6 overflow-y-auto rounded-t-2xl border border-border bg-card p-5 shadow-2xl sm:rounded-2xl sm:p-6"
			role="dialog"
			aria-modal="true"
			aria-labelledby="modal-book-title"
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

			<!-- Book Header Info -->
			<div class="flex items-start gap-4 pr-6">
				<div
					class="relative aspect-2/3 w-20 shrink-0 overflow-hidden rounded-lg border border-border/40 bg-muted/60 shadow-sm"
				>
					{#if book.coverUrl}
						<img src={book.coverUrl} alt={book.title} class="h-full w-full object-cover" />
					{:else}
						<div class="flex h-full w-full items-center justify-center text-muted-foreground">
							<Book class="h-6 w-6 opacity-30" />
						</div>
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
						<p class="line-clamp-1 text-xs text-muted-foreground">
							{book.authors.join(', ')}
						</p>
					{/if}
					<div class="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-muted-foreground/80">
						{#if book.publisher}
							<span>{book.publisher}</span>
						{/if}
						{#if book.publishedDate}
							<span>• {book.publishedDate.slice(0, 4)}</span>
						{/if}
						{#if book.pageCount}
							<span>• {book.pageCount} {m.pages()}</span>
						{/if}
					</div>
				</div>
			</div>

			<!-- Status Selector -->
			<div class="space-y-2">
				<span class="text-xs font-semibold text-foreground">ステータス</span>
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
							<span class="text-[11px]">{s.label}</span>
						</button>
					{/each}
				</div>
			</div>

			<!-- Reading Progress (If Reading) -->
			{#if selectedStatus === 'reading'}
				<div class="space-y-2 rounded-xl border border-blue-500/20 bg-blue-500/5 p-3.5">
					<div class="flex items-center justify-between text-xs font-medium">
						<span class="text-blue-700 dark:text-blue-300">進捗ページ数</span>
						<span class="font-bold text-foreground">
							{currentPage} / {totalPages || '?'} ページ
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
						<span class="text-xs text-muted-foreground">ページまで読んだ</span>
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
					placeholder="読んだ感想や心に残ったフレーズをメモ..."
					class="w-full rounded-xl border border-border/60 bg-card/60 p-3 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none sm:text-sm"
				></textarea>

				<!-- Spoiler Checkbox -->
				<label class="flex cursor-pointer items-center gap-2 pt-0.5">
					<input
						type="checkbox"
						bind:checked={hasSpoiler}
						class="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary"
					/>
					<span class="text-xs text-muted-foreground">{m.spoiler_warning()}</span>
				</label>
			</div>

			<!-- Actions -->
			<div class="flex items-center justify-end gap-2 border-t border-border/40 pt-2">
				<Button variant="outline" size="sm" onclick={onClose} disabled={isSaving}>
					{m.cancel()}
				</Button>
				<Button size="sm" onclick={handleSave} disabled={isSaving} class="gap-1.5 px-5">
					{#if isSaving}
						<span
							class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
						></span>
					{:else}
						<Check class="h-3.5 w-3.5" />
					{/if}
					<span>{m.save()}</span>
				</Button>
			</div>
		</div>
	</div>
{/if}

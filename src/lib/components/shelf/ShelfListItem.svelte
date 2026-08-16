<script lang="ts">
	import type { ShelfItem } from '$lib/services/bookRecord';
	import { Badge } from '$lib/components/ui/badge';
	import StarRating from '$lib/components/book/StarRating.svelte';
	import { Book, ChevronRight } from '@lucide/svelte';
	import * as m from '$lib/paraglide/messages';

	interface Props {
		item: ShelfItem;
		onSelect?: (item: ShelfItem) => void;
	}

	let { item, onSelect }: Props = $props();

	const status = $derived(item.statusRecord.status);
	const book = $derived(item.book);
	const review = $derived(item.reviewRecord);

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
</script>

<div
	class="group flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-border/60 bg-card/70 p-3.5 transition-all hover:border-primary/50 hover:shadow-md"
	onclick={() => onSelect?.(item)}
	role="button"
	tabindex="0"
	onkeydown={(e) => e.key === 'Enter' && onSelect?.(item)}
>
	<div class="flex min-w-0 flex-1 items-center gap-3.5">
		<!-- Cover -->
		<div
			class="relative aspect-2/3 w-14 shrink-0 overflow-hidden rounded-lg border border-border/40 bg-muted/60 shadow-xs"
		>
			{#if book.coverUrl}
				<img src={book.coverUrl} alt={book.title} class="h-full w-full object-cover" />
			{:else}
				<div class="flex h-full w-full items-center justify-center text-muted-foreground">
					<Book class="h-5 w-5 opacity-30" />
				</div>
			{/if}
		</div>

		<!-- Book Info -->
		<div class="min-w-0 flex-1 space-y-1">
			<div class="flex flex-wrap items-center gap-2">
				<Badge variant={status} class="px-2 py-0.5 text-[10px] font-semibold">
					{getStatusLabel(status)}
				</Badge>
				{#if review?.rating}
					<div class="flex items-center">
						<StarRating rating={review.rating} readonly maxRating={5} />
					</div>
				{/if}
			</div>

			<h3
				class="line-clamp-1 text-sm leading-snug font-bold text-foreground transition-colors group-hover:text-primary"
			>
				{book.title}
			</h3>

			<div class="flex items-center gap-2 text-xs text-muted-foreground">
				{#if book.authors?.length}
					<span class="max-w-40 truncate">{book.authors.join(', ')}</span>
				{/if}
				{#if book.pageCount}
					<span>• {book.pageCount} {m.pages()}</span>
				{/if}
			</div>

			<!-- Reading Progress (If Reading) -->
			{#if status === 'reading' && item.statusRecord.currentPage}
				<div class="max-w-xs pt-1">
					<div class="flex justify-between pb-0.5 text-[10px] text-muted-foreground">
						<span>進捗</span>
						<span class="font-medium"
							>{item.statusRecord.currentPage} / {book.pageCount || '?'} p</span
						>
					</div>
					{#if book.pageCount}
						<div class="h-1.5 w-full overflow-hidden rounded-full bg-muted">
							<div
								class="h-full rounded-full bg-blue-600"
								style="width: {Math.min(
									100,
									Math.round((item.statusRecord.currentPage / book.pageCount) * 100)
								)}%"
							></div>
						</div>
					{/if}
				</div>
			{/if}

			<!-- Review Note snippet -->
			{#if review?.content}
				<p class="line-clamp-1 pt-0.5 text-xs text-muted-foreground/80 italic">
					"{review.content}"
				</p>
			{/if}
		</div>
	</div>

	<ChevronRight
		class="h-5 w-5 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
	/>
</div>

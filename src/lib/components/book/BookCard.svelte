<script lang="ts">
	import type { BookRef, ReadingStatus } from '$lib/types/book';
	import { Badge } from '$lib/components/ui/badge';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Book, Plus } from '@lucide/svelte';
	import * as m from '$lib/paraglide/messages';

	interface Props {
		book: BookRef;
		status?: ReadingStatus;
		onSelect?: (book: BookRef) => void;
	}

	let { book, status, onSelect }: Props = $props();

	function getStatusLabel(s: ReadingStatus) {
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

<Card
	class="group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border border-border/60 bg-card/80 transition-all hover:border-primary/50 hover:shadow-md"
	onclick={() => onSelect?.(book)}
>
	<!-- Cover Image (2:3 Aspect Ratio) -->
	<div class="relative aspect-2/3 w-full overflow-hidden bg-muted/60">
		{#if book.coverUrl}
			<img
				src={book.coverUrl}
				alt={book.title}
				class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
				loading="lazy"
			/>
		{:else}
			<div
				class="flex h-full w-full flex-col items-center justify-center bg-muted/40 p-4 text-center text-muted-foreground"
			>
				<Book class="mb-2 h-10 w-10 opacity-30" />
				<span class="line-clamp-2 px-1 text-xs font-medium">{book.title}</span>
			</div>
		{/if}

		<!-- Reading Status Badge (if already on shelf) -->
		{#if status}
			<Badge
				variant={status}
				class="absolute top-2 left-2 px-2 py-0.5 text-[10px] font-semibold backdrop-blur-md shadow-xs rounded-md"
			>
				{getStatusLabel(status)}
			</Badge>
		{/if}

		<!-- Hover Action Overlay -->
		<div
			class="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 backdrop-blur-[2px] transition-opacity duration-200 group-hover:opacity-100"
		>
			<span
				class="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-lg"
			>
				<Plus class="h-3.5 w-3.5" />
				<span>{m.my_shelf()}</span>
			</span>
		</div>
	</div>

	<!-- Book Info -->
	<CardContent class="flex flex-1 flex-col justify-between p-3">
		<div class="space-y-1">
			<h2 class="line-clamp-2 text-sm leading-tight font-bold text-foreground" title={book.title}>
				{book.title}
			</h2>
			{#if book.authors?.length}
				<p class="line-clamp-1 text-xs text-muted-foreground">
					{book.authors.join(', ')}
				</p>
			{/if}
		</div>

		<div
			class="mt-2 flex items-center justify-between border-t border-border/40 pt-1.5 text-[11px] text-muted-foreground/80"
		>
			{#if book.publisher}
				<span class="max-w-30 truncate">{book.publisher}</span>
			{/if}
			{#if book.publishedDate}
				<span class="shrink-0">{book.publishedDate.slice(0, 4)}</span>
			{/if}
		</div>
	</CardContent>
</Card>

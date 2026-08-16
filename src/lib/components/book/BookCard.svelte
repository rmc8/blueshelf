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
	class="group border-border/60 bg-card/80 hover:border-primary/50 relative flex cursor-pointer flex-col overflow-hidden rounded-xl border transition-all hover:shadow-md"
	onclick={() => onSelect?.(book)}
>
	<!-- Cover Image (2:3 Aspect Ratio) -->
	<div class="bg-muted/60 relative aspect-2/3 w-full overflow-hidden">
		{#if book.coverUrl}
			<img
				src={book.coverUrl}
				alt={book.title}
				class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
				loading="lazy"
			/>
		{:else}
			<div
				class="text-muted-foreground bg-muted/40 flex h-full w-full flex-col items-center justify-center p-4 text-center"
			>
				<Book class="mb-2 h-10 w-10 opacity-30" />
				<span class="line-clamp-2 px-1 text-xs font-medium">{book.title}</span>
			</div>
		{/if}

		<!-- Reading Status Badge (if already on shelf) -->
		{#if status}
			<div class="absolute top-2 left-2 shadow-sm">
				<Badge variant={status} class="px-2 py-0.5 text-[10px] font-semibold backdrop-blur-md">
					{getStatusLabel(status)}
				</Badge>
			</div>
		{/if}

		<!-- Hover Action Overlay -->
		<div
			class="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 backdrop-blur-[2px] transition-opacity duration-200 group-hover:opacity-100"
		>
			<span
				class="bg-primary text-primary-foreground inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold shadow-lg"
			>
				<Plus class="h-3.5 w-3.5" />
				<span>{m.my_shelf()}</span>
			</span>
		</div>
	</div>

	<!-- Book Info -->
	<CardContent class="flex flex-1 flex-col justify-between p-3">
		<div class="space-y-1">
			<h2 class="text-foreground line-clamp-2 text-sm leading-tight font-bold" title={book.title}>
				{book.title}
			</h2>
			{#if book.authors?.length}
				<p class="text-muted-foreground line-clamp-1 text-xs">
					{book.authors.join(', ')}
				</p>
			{/if}
		</div>

		<div
			class="text-muted-foreground/80 border-border/40 mt-2 flex items-center justify-between border-t pt-1.5 text-[11px]"
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

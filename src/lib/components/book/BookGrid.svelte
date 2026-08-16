<script lang="ts">
	import type { BookRef, ReadingStatus } from '$lib/types/book';
	import BookCard from './BookCard.svelte';

	interface Props {
		books: BookRef[];
		statusMap?: Map<string, ReadingStatus>;
		onSelectBook?: (book: BookRef) => void;
	}

	let { books, statusMap = new Map(), onSelectBook }: Props = $props();
</script>

<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
	{#each books as book (book.isbn13 || book.title)}
		{@const key = book.isbn13 || book.title}
		{@const status = key ? statusMap.get(key) : undefined}
		<BookCard {book} {status} onSelect={onSelectBook} />
	{/each}
</div>

<script lang="ts">
	import type { TimelineItem } from '$lib/services/atproto/timeline';
	import type { BookRef } from '$lib/types/book';
	import * as m from '$lib/paraglide/messages.js';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import StarRating from '$lib/components/book/StarRating.svelte';
	import { User, ExternalLink, BookPlus, BookOpen, Sparkles, Eye } from '@lucide/svelte';

	let {
		item,
		onAddToMyShelf
	}: {
		item: TimelineItem;
		onAddToMyShelf?: (book: BookRef) => void;
	} = $props();

	let showSpoiler = $state(false);

	const statusLabel = $derived.by(() => {
		if (item.type === 'review') return m.status_finished();
		if (!item.statusRecord) return '';
		switch (item.statusRecord.status) {
			case 'reading':
				return m.status_reading();
			case 'finished':
				return m.status_finished();
			case 'want':
				return m.status_want();
			case 'backlog':
				return m.status_backlog();
			case 'dropped':
				return m.status_dropped();
			default:
				return '';
		}
	});

	const actionDescription = $derived.by(() => {
		if (item.type === 'review') return m.activity_finished();
		if (!item.statusRecord) return '';
		switch (item.statusRecord.status) {
			case 'reading':
				return m.activity_reading();
			case 'finished':
				return m.activity_finished();
			case 'want':
				return m.activity_want();
			case 'backlog':
				return m.activity_backlog();
			case 'dropped':
				return m.activity_dropped();
			default:
				return '';
		}
	});

	const formattedDate = $derived.by(() => {
		try {
			const d = new Date(item.timestamp);
			return d.toLocaleDateString(undefined, {
				month: 'short',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit'
			});
		} catch {
			return '';
		}
	});
</script>

<div
	class="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-4 transition-all duration-200 hover:border-primary/40 hover:bg-card hover:shadow-md sm:p-5"
>
	<!-- Header: User info & Time -->
	<div class="flex items-center justify-between gap-3">
		<a
			href="/profile/{item.actor.handle}"
			class="flex items-center gap-2.5 transition-opacity hover:opacity-80"
		>
			<div class="relative h-9 w-9 shrink-0 sm:h-10 sm:w-10">
				{#if item.actor.avatar}
					<img
						src={item.actor.avatar}
						alt={item.actor.handle}
						class="h-full w-full rounded-full border border-border/80 object-cover shadow-xs"
					/>
				{:else}
					<div
						class="flex h-full w-full items-center justify-center rounded-full bg-primary/10 text-primary"
					>
						<User class="h-4 w-4" />
					</div>
				{/if}
			</div>
			<div class="truncate">
				<p class="truncate text-xs font-bold text-foreground sm:text-sm">
					{item.actor.displayName || item.actor.handle}
				</p>
				<p class="truncate text-[10px] text-muted-foreground sm:text-xs">
					@{item.actor.handle}
				</p>
			</div>
		</a>

		<div class="flex items-center gap-2">
			{#if statusLabel}
				<Badge
					variant={item.statusRecord?.status || 'finished'}
					class="px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase"
				>
					{statusLabel}
				</Badge>
			{/if}
			<span class="text-[10px] text-muted-foreground">{formattedDate}</span>
		</div>
	</div>

	<!-- Activity Banner -->
	<div class="mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground">
		<Sparkles class="h-3.5 w-3.5 text-primary" />
		<span class="font-medium text-foreground">『{item.book.title}』</span>
		<span>{actionDescription}</span>
	</div>

	<!-- Book Content Box -->
	<div
		class="mt-3 flex gap-3.5 rounded-xl border border-border/40 bg-muted/20 p-3 sm:gap-4 sm:p-3.5"
	>
		<!-- Book Cover -->
		<div class="relative h-24 w-16 shrink-0 overflow-hidden rounded-lg shadow-sm sm:h-28 sm:w-20">
			{#if item.book.coverUrl}
				<img
					src={item.book.coverUrl}
					alt={item.book.title}
					class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
					loading="lazy"
				/>
			{:else}
				<div
					class="flex h-full w-full flex-col items-center justify-center bg-muted p-2 text-center"
				>
					<BookOpen class="h-6 w-6 text-muted-foreground/50" />
				</div>
			{/if}
		</div>

		<!-- Book Details & Review -->
		<div class="flex flex-1 flex-col justify-between overflow-hidden">
			<div class="space-y-1">
				<h3 class="line-clamp-1 text-sm font-bold text-foreground sm:text-base">
					{item.book.title}
				</h3>
				{#if item.book.authors && item.book.authors.length > 0}
					<p class="line-clamp-1 text-xs text-muted-foreground">
						{item.book.authors.join(', ')}
					</p>
				{/if}

				<!-- Rating -->
				{#if item.reviewRecord?.rating}
					<div class="pt-0.5">
						<StarRating rating={item.reviewRecord.rating} readonly size="sm" />
					</div>
				{/if}

				<!-- Review Content -->
				{#if item.reviewRecord?.content}
					{#if item.reviewRecord.hasSpoiler && !showSpoiler}
						<div
							class="mt-1.5 flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-600 dark:text-amber-400"
						>
							<span class="text-[11px] font-medium">{m.spoiler_warning()}</span>
							<button
								type="button"
								onclick={() => (showSpoiler = true)}
								class="flex items-center gap-1 text-[11px] font-bold underline hover:opacity-80"
							>
								<Eye class="h-3 w-3" />
								<span>{m.show_spoiler()}</span>
							</button>
						</div>
					{:else}
						<p
							class="mt-1 line-clamp-3 text-xs leading-relaxed whitespace-pre-wrap text-foreground/90 sm:text-sm"
						>
							{item.reviewRecord.content}
						</p>
					{/if}
				{/if}
			</div>

			<!-- Quick Actions -->
			<div class="flex items-center justify-between pt-2">
				{#if onAddToMyShelf}
					<Button
						variant="outline"
						size="sm"
						onclick={() => onAddToMyShelf(item.book)}
						class="h-7 gap-1.5 rounded-lg px-2.5 text-xs text-primary hover:bg-primary/10"
					>
						<BookPlus class="h-3.5 w-3.5" />
						<span>{m.add_to_my_shelf()}</span>
					</Button>
				{/if}

				<a
					href="https://bsky.app/profile/{item.actor.handle}"
					target="_blank"
					rel="noreferrer"
					class="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground hover:underline"
				>
					<span>Bluesky</span>
					<ExternalLink class="h-3 w-3" />
				</a>
			</div>
		</div>
	</div>
</div>

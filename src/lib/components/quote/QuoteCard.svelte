<script lang="ts">
	import type { QuoteRecord } from '$lib/services/quoteRecord';
	import { formatQuoteForShare } from '$lib/services/quoteRecord';
	import * as m from '$lib/paraglide/messages.js';
	import { Button } from '$lib/components/ui/button';
	import { Quote, Share2, Copy, Check } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

	let { quote }: { quote: QuoteRecord } = $props();

	let isCopied = $state(false);

	async function handleCopy() {
		try {
			const text = formatQuoteForShare(quote);
			await navigator.clipboard.writeText(text);
			isCopied = true;
			toast.success(m.copied());
			setTimeout(() => (isCopied = false), 2000);
		} catch {
			toast.error('Copy failed');
		}
	}

	function handleShareBluesky() {
		const text = formatQuoteForShare(quote);
		const url = `https://bsky.app/intent/compose?text=${encodeURIComponent(text)}`;
		window.open(url, '_blank', 'noreferrer');
	}
</script>

<div
	class="relative overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-4 transition-all hover:border-primary/40 hover:bg-card hover:shadow-md sm:p-5"
>
	<div class="flex items-start gap-3">
		<div
			class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
		>
			<Quote class="h-4 w-4" />
		</div>

		<div class="flex-1 space-y-2">
			<!-- Quote Text -->
			<blockquote
				class="text-sm leading-relaxed font-medium whitespace-pre-wrap text-foreground italic sm:text-base"
			>
				「{quote.quoteText}」
			</blockquote>

			<!-- Book & Page -->
			<div class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
				<span class="font-bold text-foreground">『{quote.book.title}』</span>
				{#if quote.pageNumber}
					<span class="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px]">
						p.{quote.pageNumber}
					</span>
				{/if}
			</div>

			<!-- Comment / Note -->
			{#if quote.comment}
				<div class="rounded-lg bg-muted/40 p-2.5 text-xs text-muted-foreground">
					<p class="leading-relaxed">{quote.comment}</p>
				</div>
			{/if}

			<!-- Actions -->
			<div class="flex items-center justify-end gap-1.5 pt-2">
				<Button
					variant="ghost"
					size="sm"
					onclick={handleCopy}
					class="h-7 gap-1 rounded-lg px-2 text-xs text-muted-foreground hover:text-foreground"
				>
					{#if isCopied}
						<Check class="h-3.5 w-3.5 text-emerald-500" />
						<span>{m.copied()}</span>
					{:else}
						<Copy class="h-3.5 w-3.5" />
						<span>{m.copy_link()}</span>
					{/if}
				</Button>

				<Button
					variant="outline"
					size="sm"
					onclick={handleShareBluesky}
					class="h-7 gap-1 rounded-lg px-2.5 text-xs font-semibold text-primary shadow-2xs hover:bg-primary/10"
				>
					<Share2 class="h-3.5 w-3.5" />
					<span>Bluesky</span>
				</Button>
			</div>
		</div>
	</div>
</div>

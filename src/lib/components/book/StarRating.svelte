<script lang="ts">
	import { Star } from '@lucide/svelte';

	interface Props {
		rating?: number; // 0〜5
		maxRating?: number;
		readonly?: boolean;
		onChange?: (rating: number) => void;
	}

	let { rating = 0, maxRating = 5, readonly = false, onChange }: Props = $props();

	let hoverRating = $state(0);

	function handleMouseEnter(starIndex: number) {
		if (readonly) return;
		hoverRating = starIndex;
	}

	function handleMouseLeave() {
		if (readonly) return;
		hoverRating = 0;
	}

	function handleClick(starIndex: number) {
		if (readonly) return;
		const newRating = rating === starIndex ? 0 : starIndex;
		onChange?.(newRating);
	}
</script>

<div
	class="flex items-center gap-1"
	onmouseleave={handleMouseLeave}
	role="group"
	aria-label="Star Rating"
>
	{#each Array.from({ length: maxRating }, (_, i) => i + 1) as star (star)}
		{@const current = hoverRating || rating}
		{@const isFilled = star <= current}
		<button
			type="button"
			disabled={readonly}
			onclick={() => handleClick(star)}
			onmouseenter={() => handleMouseEnter(star)}
			class="focus-visible:ring-primary rounded p-0.5 transition-transform hover:scale-110 focus-visible:ring-1 focus-visible:outline-none disabled:cursor-default"
			aria-label="{star} stars"
		>
			<Star
				class="h-6 w-6 transition-colors {isFilled
					? 'fill-amber-400 text-amber-400 dark:fill-amber-400 dark:text-amber-400'
					: 'text-muted-foreground/40 fill-transparent hover:text-amber-400/60'}"
			/>
		</button>
	{/each}
	{#if rating > 0 && !readonly}
		<span class="ml-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
			{rating}.0
		</span>
	{/if}
</div>

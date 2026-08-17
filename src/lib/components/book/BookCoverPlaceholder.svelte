<script lang="ts">
	import { getBookCoverTheme } from '$lib/utils';
	import { BookOpen } from '@lucide/svelte';

	interface Props {
		title: string;
		author?: string;
		publisher?: string;
		class?: string;
	}

	let { title, author, publisher, class: className = '' }: Props = $props();

	const theme = $derived(getBookCoverTheme(title));
</script>

<div
	class="relative flex h-full w-full flex-col justify-between overflow-hidden bg-gradient-to-br p-3.5 text-white shadow-inner select-none {theme.bg} {className}"
>
	<!-- Spine Binding Line (Left edge highlight) -->
	<div
		class="shadow-r pointer-events-none absolute inset-y-0 left-0 w-2.5 bg-gradient-to-r from-black/40 via-white/10 to-transparent"
	></div>

	<!-- Top Accent & Icon -->
	<div class="relative z-10 flex items-center justify-between pl-1">
		<div class="h-1.5 w-6 rounded-full {theme.accent} opacity-80"></div>
		<BookOpen class="h-3.5 w-3.5 opacity-60" />
	</div>

	<!-- Center Title & Subtitle -->
	<div class="relative z-10 my-auto space-y-1.5 pl-1.5">
		<p
			class="line-clamp-3 text-xs leading-snug font-bold tracking-tight text-white/95 drop-shadow-xs sm:text-sm"
		>
			{title}
		</p>
		{#if author}
			<p class="line-clamp-1 text-[10px] font-medium text-white/70 drop-shadow-xs">
				{author}
			</p>
		{/if}
	</div>

	<!-- Bottom Publisher Tag -->
	<div class="relative z-10 flex items-center justify-between pt-1 pl-1 text-[9px] text-white/60">
		{#if publisher}
			<span class="max-w-[80%] truncate font-medium">{publisher}</span>
		{:else}
			<span></span>
		{/if}
		<span class="font-mono text-[8px] opacity-40">Blueshelf</span>
	</div>

	<!-- Subtle Grain / Book Texture Overlay -->
	<div
		class="pointer-events-none absolute inset-0 bg-radial from-transparent to-black/30 opacity-60"
	></div>
</div>

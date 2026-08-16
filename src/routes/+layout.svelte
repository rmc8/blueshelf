<script lang="ts">
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { locales, localizeHref } from '$lib/paraglide/runtime';
	import { ModeWatcher } from 'mode-watcher';
	import { Toaster } from 'svelte-sonner';
	import Header from '$lib/components/layout/Header.svelte';
	import BottomNav from '$lib/components/layout/BottomNav.svelte';
	import './layout.css';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" type="image/svg+xml" href="/img/logo/shelfsky.svg" />
</svelte:head>

<ModeWatcher />
<Toaster position="bottom-right" richColors />

<div
	class="bg-background text-foreground selection:bg-primary/20 selection:text-primary relative flex min-h-screen flex-col pb-20 md:pb-0"
>
	<Header />
	<main class="flex-1">
		{@render children()}
	</main>
	<BottomNav />
</div>

<div style="display:none">
	{#each locales as locale (locale)}
		<a href={resolve(localizeHref(page.url.pathname, { locale }) as Pathname)}>{locale}</a>
	{/each}
</div>

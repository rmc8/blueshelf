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
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<ModeWatcher />
<Toaster position="bottom-right" richColors />

<div class="relative flex min-h-screen flex-col bg-background text-foreground selection:bg-primary/20 selection:text-primary pb-20 md:pb-0">
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

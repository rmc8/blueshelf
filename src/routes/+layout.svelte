<script lang="ts">
	import { page } from '$app/state';
	import { locales, localizeHref } from '$lib/paraglide/runtime';
	import { ModeWatcher } from 'mode-watcher';
	import { Toaster } from 'svelte-sonner';
	import Header from '$lib/components/layout/Header.svelte';
	import Footer from '$lib/components/layout/Footer.svelte';
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
	class="relative flex min-h-screen flex-col bg-background text-foreground selection:bg-primary/20 selection:text-primary"
>
	<Header />
	<main class="flex-1">
		{@render children()}
	</main>
	<Footer />
	<BottomNav />
</div>

<div style="display:none">
	{#each locales as locale (locale)}
		<a href={localizeHref(page.url.pathname, { locale })}>{locale}</a>
	{/each}
</div>

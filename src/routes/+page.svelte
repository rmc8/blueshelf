<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Search, Library, Sparkles, ShieldCheck, Share2, Database } from '@lucide/svelte';
</script>

<svelte:head>
	<title>{m.app_name()} - Decentralized Social Bookshelf</title>
</svelte:head>

<div class="container mx-auto max-w-6xl px-4 py-8 sm:py-12">
	<!-- Hero Section -->
	<section class="flex flex-col items-center justify-center space-y-6 py-6 text-center sm:py-12">
		<div
			class="inline-flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/10 px-3.5 py-1.5 text-xs font-semibold text-sky-600 dark:text-sky-400"
		>
			<Sparkles class="h-3.5 w-3.5" />
			<span>Own Your Bookshelf on AT Protocol</span>
		</div>

		<h1 class="max-w-3xl text-3xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
			{m.tagline_lead()}<br class="hidden sm:inline" />
			<span
				class="bg-linear-to-r from-sky-500 via-blue-600 to-indigo-600 bg-clip-text text-transparent"
			>
				{m.tagline_highlight()}
			</span>
			{m.tagline_end()}
		</h1>

		<p class="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
			{m.hero_desc()}
		</p>

		<div class="flex flex-wrap items-center justify-center gap-3 pt-2">
			<a href="/search">
				<Button size="lg" class="gap-2 font-medium shadow-md shadow-primary/20">
					<Search class="h-4 w-4" />
					<span>{m.search()}</span>
				</Button>
			</a>
			<a href="/shelf">
				<Button variant="outline" size="lg" class="gap-2 font-medium">
					<Library class="h-4 w-4" />
					<span>{m.my_shelf()}</span>
				</Button>
			</a>
		</div>
	</section>

	<!-- Feature Highlights -->
	<section class="grid grid-cols-1 gap-4 pt-8 sm:grid-cols-3 sm:pt-12">
		<Card
			class="border-border/60 bg-card/60 backdrop-blur-sm transition-colors hover:border-primary/40"
		>
			<CardHeader class="pb-2">
				<div
					class="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400"
				>
					<Database class="h-5 w-5" />
				</div>
				<CardTitle level={2} class="text-base font-semibold">{m.feature_pds_title()}</CardTitle>
				<CardDescription>{m.feature_pds_desc()}</CardDescription>
			</CardHeader>
		</Card>

		<Card
			class="border-border/60 bg-card/60 backdrop-blur-sm transition-colors hover:border-primary/40"
		>
			<CardHeader class="pb-2">
				<div
					class="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
				>
					<Share2 class="h-5 w-5" />
				</div>
				<CardTitle level={2} class="text-base font-semibold">{m.feature_social_title()}</CardTitle>
				<CardDescription>{m.feature_social_desc()}</CardDescription>
			</CardHeader>
		</Card>

		<Card
			class="border-border/60 bg-card/60 backdrop-blur-sm transition-colors hover:border-primary/40"
		>
			<CardHeader class="pb-2">
				<div
					class="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
				>
					<ShieldCheck class="h-5 w-5" />
				</div>
				<CardTitle level={2} class="text-base font-semibold"
					>{m.feature_zero_secret_title()}</CardTitle
				>
				<CardDescription>{m.feature_zero_secret_desc()}</CardDescription>
			</CardHeader>
		</Card>
	</section>
</div>

<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Search, Library, Sparkles, ShieldCheck, Globe2, BookOpen } from '@lucide/svelte';
</script>

<svelte:head>
	<title>{m.app_name()} - Decentralized Social Bookshelf</title>
</svelte:head>

<div class="container mx-auto max-w-6xl px-4 py-8 sm:py-12">
	<!-- Hero Section -->
	<section class="flex flex-col items-center justify-center text-center space-y-6 py-6 sm:py-12">
		<div class="inline-flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/10 px-3.5 py-1.5 text-xs font-semibold text-sky-600 dark:text-sky-400">
			<Sparkles class="h-3.5 w-3.5" />
			<span>Own Your Bookshelf on AT Protocol</span>
		</div>

		<h1 class="max-w-3xl text-3xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
			AT Protocol 上に、<br class="hidden sm:inline" />
			<span class="bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
				あなただけの本棚
			</span>
			を。
		</h1>

		<p class="max-w-2xl text-sm sm:text-base text-muted-foreground leading-relaxed">
			読書ログ・書評・積読データを自分の PDS に永続保存。<br class="hidden sm:inline" />
			広告レスで美しい、新世代の分散型ソーシャル本棚アプリケーション。
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
	<section class="grid grid-cols-1 gap-4 sm:grid-cols-3 pt-8 sm:pt-12">
		<Card class="border-border/60 bg-card/60 backdrop-blur-sm hover:border-primary/40 transition-colors">
			<CardHeader class="pb-2">
				<div class="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 mb-2">
					<ShieldCheck class="h-5 w-5" />
				</div>
				<CardTitle level={2} class="text-base font-semibold">自己主権データ (PDS)</CardTitle>
				<CardDescription>サービス終了リスクなし。読書記録はすべてあなたの PDS に保存。</CardDescription>
			</CardHeader>
		</Card>

		<Card class="border-border/60 bg-card/60 backdrop-blur-sm hover:border-primary/40 transition-colors">
			<CardHeader class="pb-2">
				<div class="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 mb-2">
					<Globe2 class="h-5 w-5" />
				</div>
				<CardTitle level={2} class="text-base font-semibold">和書・洋書ハイブリッド</CardTitle>
				<CardDescription>Google Books & openBD で全世界の書籍を高速・高精度に検索。</CardDescription>
			</CardHeader>
		</Card>

		<Card class="border-border/60 bg-card/60 backdrop-blur-sm hover:border-primary/40 transition-colors">
			<CardHeader class="pb-2">
				<div class="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-2">
					<BookOpen class="h-5 w-5" />
				</div>
				<CardTitle level={2} class="text-base font-semibold">オフライン PWA 対応</CardTitle>
				<CardDescription>地下鉄や飛行機でも本棚を閲覧・記録。オンライン復帰時に自動同期。</CardDescription>
			</CardHeader>
		</Card>
	</section>
</div>

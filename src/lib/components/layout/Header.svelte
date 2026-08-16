<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import { Search, LogIn } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import LanguageToggle from './LanguageToggle.svelte';
	import ThemeToggle from './ThemeToggle.svelte';
</script>

<header class="sticky top-0 z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
	<div class="container mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
		<!-- Brand Logo & Title -->
		<div class="flex items-center gap-6">
			<a href="/" class="flex items-center gap-2.5 transition-opacity hover:opacity-90">
				<img src="/img/logo/shelfsky.svg" alt="Blueshelf Logo" class="h-8 w-8 rounded-lg object-contain shadow-sm" />
				<span class="font-bold tracking-tight text-base sm:text-lg bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
					{m.app_name()}
				</span>
			</a>

			<!-- Desktop Nav Links -->
			<nav class="hidden md:flex items-center gap-5 text-sm font-medium text-muted-foreground">
				<a href="/shelf" class="transition-colors hover:text-foreground">
					{m.my_shelf()}
				</a>
				<a href="/search" class="transition-colors hover:text-foreground">
					{m.search()}
				</a>
			</nav>
		</div>

		<!-- Action Controls -->
		<div class="flex items-center gap-1.5 sm:gap-2">
			<!-- Quick Search Button (Desktop) -->
			<a href="/search" class="hidden sm:inline-flex">
				<Button variant="outline" size="sm" class="h-8 gap-2 px-3 text-xs text-muted-foreground">
					<Search class="h-3.5 w-3.5" />
					<span>{m.search()}...</span>
					<kbd class="pointer-events-none hidden h-4 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
						/
					</kbd>
				</Button>
			</a>

			<!-- Language Toggle -->
			<LanguageToggle />

			<!-- Theme Toggle -->
			<ThemeToggle />

			<!-- Login Button -->
			<a href="/login">
				<Button size="sm" class="h-8 gap-1.5 px-3 text-xs shadow-sm">
					<LogIn class="h-3.5 w-3.5" />
					<span class="hidden xs:inline">{m.login()}</span>
				</Button>
			</a>
		</div>
	</div>
</header>

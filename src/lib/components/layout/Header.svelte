<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import { Search, LogIn } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import LanguageToggle from './LanguageToggle.svelte';
	import ThemeToggle from './ThemeToggle.svelte';
</script>

<header
	class="border-border/40 bg-background/80 sticky top-0 z-40 w-full border-b backdrop-blur-md"
>
	<div class="container mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
		<!-- Brand Logo & Title -->
		<div class="flex items-center gap-6">
			<a href="/" class="flex shrink-0 items-center gap-2.5 transition-opacity hover:opacity-90">
				<img
					src="/img/logo/shelfsky.svg"
					alt="Blueshelf Logo"
					class="h-8 w-8 rounded-lg object-contain shadow-sm"
				/>
				<span class="text-foreground text-base font-bold tracking-tight sm:text-lg">
					{m.app_name()}
				</span>
			</a>

			<!-- Desktop Nav Links -->
			<nav class="text-muted-foreground hidden items-center gap-5 text-sm font-medium md:flex">
				<a href="/shelf" class="hover:text-foreground transition-colors">
					{m.my_shelf()}
				</a>
				<a href="/search" class="hover:text-foreground transition-colors">
					{m.search()}
				</a>
			</nav>
		</div>

		<!-- Action Controls -->
		<div class="flex items-center gap-1.5 sm:gap-2">
			<!-- Quick Search Button (Desktop) -->
			<a href="/search" class="hidden sm:inline-flex">
				<Button variant="outline" size="sm" class="text-muted-foreground h-8 gap-2 px-3 text-xs">
					<Search class="h-3.5 w-3.5" />
					<span>{m.search()}...</span>
					<kbd
						class="bg-muted pointer-events-none hidden h-4 items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-medium opacity-100 select-none sm:flex"
					>
						/
					</kbd>
				</Button>
			</a>

			<!-- Language Toggle (Icon only) -->
			<LanguageToggle />

			<!-- Theme Toggle -->
			<ThemeToggle />

			<!-- Login Button -->
			<a href="/login">
				<Button size="sm" class="h-8 gap-1.5 px-3 text-xs shadow-sm">
					<LogIn class="h-3.5 w-3.5" />
					<span class="xs:inline hidden">{m.login()}</span>
				</Button>
			</a>
		</div>
	</div>
</header>

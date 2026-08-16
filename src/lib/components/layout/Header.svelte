<script lang="ts">
	import { onMount } from 'svelte';
	import * as m from '$lib/paraglide/messages';
	import { Search, LogIn, LogOut, User as UserIcon } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { authState } from '$lib/stores/auth.svelte';
	import LanguageToggle from './LanguageToggle.svelte';
	import ThemeToggle from './ThemeToggle.svelte';
	import LoginModal from '$lib/components/auth/LoginModal.svelte';

	let isLoginModalOpen = $state(false);
	let isUserMenuOpen = $state(false);

	onMount(() => {
		authState.init();
	});

	function handleLogout() {
		isUserMenuOpen = false;
		authState.logout();
	}
</script>

<header
	class="sticky top-0 z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur-md"
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
				<span class="text-base font-bold tracking-tight text-foreground sm:text-lg">
					{m.app_name()}
				</span>
			</a>

			<!-- Desktop Nav Links -->
			<nav class="hidden items-center gap-5 text-sm font-medium text-muted-foreground md:flex">
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
					<kbd
						class="pointer-events-none hidden h-4 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 select-none sm:flex"
					>
						/
					</kbd>
				</Button>
			</a>

			<!-- Language Toggle (Icon only) -->
			<LanguageToggle />

			<!-- Theme Toggle -->
			<ThemeToggle />

			<!-- Auth Section -->
			{#if authState.isAuthenticated && authState.user}
				<div class="relative">
					<button
						type="button"
						onclick={() => (isUserMenuOpen = !isUserMenuOpen)}
						class="flex items-center gap-2 rounded-full border border-border/60 p-0.5 transition-opacity hover:opacity-80"
						aria-label="User menu"
					>
						{#if authState.user.avatar}
							<img
								src={authState.user.avatar}
								alt={authState.user.handle}
								class="h-7 w-7 rounded-full object-cover"
							/>
						{:else}
							<div
								class="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary"
							>
								<UserIcon class="h-4 w-4" />
							</div>
						{/if}
					</button>

					{#if isUserMenuOpen}
						<!-- Invisible backdrop to close menu on click outside -->
						<button
							type="button"
							class="fixed inset-0 z-40 cursor-default"
							onclick={() => (isUserMenuOpen = false)}
							aria-label="Close user menu"
							tabindex="-1"
						></button>

						<div
							class="absolute top-10 right-0 z-50 w-52 rounded-xl border border-border/80 bg-card p-1.5 shadow-xl"
						>
							<div class="border-b border-border/50 px-3 py-2.5">
								<p class="truncate text-xs font-bold text-foreground">
									{authState.user.displayName || authState.user.handle}
								</p>
								<p class="truncate pt-0.5 text-[10px] text-muted-foreground">
									@{authState.user.handle}
								</p>
							</div>
							<div class="p-1">
								<button
									type="button"
									onclick={handleLogout}
									class="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-destructive transition-colors hover:bg-destructive/10"
								>
									<LogOut class="h-3.5 w-3.5" />
									<span>{m.logout()}</span>
								</button>
							</div>
						</div>
					{/if}
				</div>
			{:else}
				<Button
					size="sm"
					onclick={() => (isLoginModalOpen = true)}
					class="h-8 cursor-pointer gap-1.5 px-3 text-xs shadow-sm"
				>
					<LogIn class="h-3.5 w-3.5" />
					<span class="xs:inline hidden">{m.login()}</span>
				</Button>
			{/if}
		</div>
	</div>
</header>

<!-- Login Modal -->
<LoginModal isOpen={isLoginModalOpen} onClose={() => (isLoginModalOpen = false)} />

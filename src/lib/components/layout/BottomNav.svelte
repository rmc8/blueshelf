<script lang="ts">
	import { page } from '$app/state';
	import * as m from '$lib/paraglide/messages';
	import { Home, Library, Search, Settings } from '@lucide/svelte';

	const navItems = [
		{ href: '/', label: 'Home', icon: Home },
		{ href: '/shelf', label: () => m.my_shelf(), icon: Library },
		{ href: '/search', label: () => m.search(), icon: Search },
		{ href: '/settings', label: () => m.settings(), icon: Settings }
	];
</script>

<div
	class="border-border/40 bg-background/95 fixed bottom-0 left-0 z-40 w-full border-t backdrop-blur-lg md:hidden"
>
	<nav class="container mx-auto flex h-16 max-w-lg items-center justify-around px-2">
		{#each navItems as item (item.href)}
			{@const isActive = page.url.pathname === item.href}
			{@const labelText = typeof item.label === 'function' ? item.label() : item.label}
			{@const IconComponent = item.icon}
			<a
				href={item.href}
				class="flex flex-col items-center justify-center gap-1 px-3 py-1 text-xs font-medium transition-all {isActive
					? 'text-primary'
					: 'text-muted-foreground hover:text-foreground'}"
			>
				<div class="relative flex items-center justify-center">
					<IconComponent class="h-5 w-5 {isActive ? 'stroke-[2.5px]' : 'stroke-2'}" />
					{#if isActive}
						<span class="bg-primary absolute -bottom-1.5 h-1 w-1 rounded-full"></span>
					{/if}
				</div>
				<span class="text-[10px] tracking-tight">{labelText}</span>
			</a>
		{/each}
	</nav>
</div>

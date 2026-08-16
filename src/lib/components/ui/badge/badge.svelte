<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '$lib/utils';
	import { badgeVariants, type BadgeVariant } from './badge.js';

	let {
		class: className = '',
		variant = 'default',
		children,
		...restProps
	}: HTMLAttributes<HTMLDivElement> & { variant?: BadgeVariant } = $props();
</script>

<div class={cn(badgeVariants({ variant }), className)} {...restProps}>
	{@render children?.()}
</div>

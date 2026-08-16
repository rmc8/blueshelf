<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '$lib/utils';

	let {
		class: className = '',
		level = 3,
		children,
		...restProps
	}: HTMLAttributes<HTMLHeadingElement> & { level?: 1 | 2 | 3 | 4 | 5 | 6 } = $props();
</script>

<div
	role="heading"
	aria-level={level}
	class={cn('font-semibold leading-none tracking-tight', className)}
	{...restProps}
>
	{@render children?.()}
</div>

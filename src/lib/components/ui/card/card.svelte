<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '$lib/utils';

	let { class: className = '', children, ...restProps }: HTMLAttributes<HTMLDivElement> = $props();
</script>

<div
	class={cn('rounded-xl border bg-card text-card-foreground shadow-sm transition-all', className)}
	{...restProps}
>
	{@render children?.()}
</div>

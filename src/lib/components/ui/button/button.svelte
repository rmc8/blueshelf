<script lang="ts">
	import { Button as ButtonPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils';
	import { buttonVariants, type ButtonProps } from './button.js';

	let {
		class: className = '',
		variant = 'default',
		size = 'default',
		ref = $bindable(null),
		children,
		...restProps
	}: ButtonProps = $props();
</script>

<ButtonPrimitive.Root
	bind:ref
	class={cn(buttonVariants({ variant, size }), className)}
	{...restProps}
>
	{@render children?.()}
</ButtonPrimitive.Root>

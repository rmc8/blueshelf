<script lang="ts">
	import { Card } from '$lib/components/ui/card';

	interface Props {
		count?: number;
	}

	let { count = 8 }: Props = $props();
	const skeletonItems = $derived(Array.from({ length: count }, (_, idx) => idx));
</script>

<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
	{#each skeletonItems as idx (idx)}
		<Card class="animate-pulse overflow-hidden rounded-xl border border-border/40 bg-card/40">
			<div class="aspect-2/3 w-full bg-muted/60"></div>
			<div class="space-y-2 p-3">
				<div class="h-4 w-3/4 rounded bg-muted/80"></div>
				<div class="h-3 w-1/2 rounded bg-muted/60"></div>
				<div class="flex justify-between border-t border-border/30 pt-2">
					<div class="h-2.5 w-1/3 rounded bg-muted/40"></div>
					<div class="h-2.5 w-8 rounded bg-muted/40"></div>
				</div>
			</div>
		</Card>
	{/each}
</div>

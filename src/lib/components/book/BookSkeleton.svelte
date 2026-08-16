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
		<Card class="border-border/40 bg-card/40 animate-pulse overflow-hidden rounded-xl border">
			<div class="bg-muted/60 aspect-2/3 w-full"></div>
			<div class="space-y-2 p-3">
				<div class="bg-muted/80 h-4 w-3/4 rounded"></div>
				<div class="bg-muted/60 h-3 w-1/2 rounded"></div>
				<div class="border-border/30 flex justify-between border-t pt-2">
					<div class="bg-muted/40 h-2.5 w-1/3 rounded"></div>
					<div class="bg-muted/40 h-2.5 w-8 rounded"></div>
				</div>
			</div>
		</Card>
	{/each}
</div>

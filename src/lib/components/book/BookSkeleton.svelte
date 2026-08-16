<script lang="ts">
	import { Card } from '$lib/components/ui/card';

	interface Props {
		count?: number;
	}

	let { count = 8 }: Props = $props();
</script>

<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
	{#each Array(count) as _}
		<Card class="overflow-hidden rounded-xl border border-border/40 bg-card/40 animate-pulse">
			<div class="aspect-[2/3] w-full bg-muted/60"></div>
			<div class="p-3 space-y-2">
				<div class="h-4 w-3/4 rounded bg-muted/80"></div>
				<div class="h-3 w-1/2 rounded bg-muted/60"></div>
				<div class="flex justify-between pt-2 border-t border-border/30">
					<div class="h-2.5 w-1/3 rounded bg-muted/40"></div>
					<div class="h-2.5 w-8 rounded bg-muted/40"></div>
				</div>
			</div>
		</Card>
	{/each}
</div>

<script lang="ts">
	import { toggleMode, mode } from 'mode-watcher';
	import { Sun, Moon } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
</script>

<Button
	variant="ghost"
	size="icon"
	onclick={toggleMode}
	class="h-9 w-9 text-muted-foreground hover:text-foreground"
	title="Toggle Dark/Light Mode"
>
	<Sun class="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
	<Moon class="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
	<span class="sr-only">Toggle theme</span>
</Button>

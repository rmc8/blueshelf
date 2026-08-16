<script lang="ts">
	import { getLocale, setLocale } from '$lib/paraglide/runtime';
	import { Languages } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';

	let currentLocale = $state(getLocale());

	function toggleLanguage() {
		const nextLocale = currentLocale === 'ja' ? 'en' : 'ja';
		setLocale(nextLocale);
		currentLocale = nextLocale;
	}
</script>

<Button
	variant="ghost"
	size="icon"
	onclick={toggleLanguage}
	class="h-9 w-9 text-muted-foreground hover:text-foreground"
	title={currentLocale === 'ja' ? 'Switch to English' : '日本語に切り替え'}
	aria-label="Toggle language"
>
	<Languages class="h-4 w-4" />
</Button>

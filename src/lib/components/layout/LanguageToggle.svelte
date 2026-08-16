<script lang="ts">
	import { getLocale, setLocale, locales } from '$lib/paraglide/runtime';
	import * as m from '$lib/paraglide/messages';
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
	size="sm"
	onclick={toggleLanguage}
	class="flex items-center gap-1.5 px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground"
	title={currentLocale === 'ja' ? 'Switch to English' : '日本語に切り替え'}
>
	<Languages class="h-4 w-4" />
	<span class="uppercase font-semibold tracking-wider">{currentLocale}</span>
</Button>

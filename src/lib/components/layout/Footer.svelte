<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import { ExternalLink, Globe } from '@lucide/svelte';
</script>

<footer
	class="mt-16 border-t border-border/40 bg-card/40 pt-8 pb-20 text-xs text-muted-foreground md:pb-8"
>
	<div class="container mx-auto max-w-6xl space-y-6 px-4">
		<div class="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
			<!-- Brand & Description -->
			<div class="max-w-sm space-y-2">
				<div class="flex items-center gap-2">
					<img
						src="/img/logo/shelfsky.svg"
						alt="Blueshelf Logo"
						class="h-6 w-6 rounded-md object-contain shadow-xs"
					/>
					<span class="text-sm font-bold tracking-tight text-foreground">
						{m.app_name()}
					</span>
				</div>
				<p class="text-[11px] leading-relaxed text-muted-foreground">
					{m.footer_desc()}
				</p>
			</div>

			<!-- Navigation Links -->
			<div class="flex flex-wrap gap-x-8 gap-y-3 text-xs">
				<div class="space-y-2">
					<p class="text-[11px] font-semibold text-foreground">{m.footer_service()}</p>
					<ul class="space-y-1.5 text-[11px]">
						<li>
							<a href="/shelf" class="transition-colors hover:text-foreground">
								{m.my_shelf()}
							</a>
						</li>
						<li>
							<a href="/search" class="transition-colors hover:text-foreground">
								{m.search()}
							</a>
						</li>
					</ul>
				</div>

				<div class="space-y-2">
					<p class="text-[11px] font-semibold text-foreground">{m.footer_ecosystem()}</p>
					<ul class="space-y-1.5 text-[11px]">
						<li>
							<a
								href="https://bsky.app/profile/blueshelf.bsky.social"
								target="_blank"
								rel="noreferrer"
								class="flex items-center gap-1 transition-colors hover:text-foreground"
							>
								<span>{m.footer_bsky_official()}</span>
								<ExternalLink class="h-2.5 w-2.5" />
							</a>
						</li>
						<li>
							<a
								href="https://atproto.com"
								target="_blank"
								rel="noreferrer"
								class="flex items-center gap-1 transition-colors hover:text-foreground"
							>
								<span>AT Protocol</span>
								<ExternalLink class="h-2.5 w-2.5" />
							</a>
						</li>
					</ul>
				</div>

				<div class="space-y-2">
					<p class="text-[11px] font-semibold text-foreground">{m.footer_author_oss()}</p>
					<ul class="space-y-1.5 text-[11px]">
						<li>
							<a
								href="https://rmc-8.com"
								target="_blank"
								rel="noreferrer"
								class="flex items-center gap-1.5 transition-colors hover:text-foreground"
							>
								<Globe class="h-3 w-3" />
								<span>rmc-8.com</span>
							</a>
						</li>
						<li>
							<a
								href="https://bsky.app/profile/k.rmc-8.com"
								target="_blank"
								rel="noreferrer"
								class="flex items-center gap-1 transition-colors hover:text-foreground"
							>
								<span>@k.rmc-8.com</span>
								<ExternalLink class="h-2.5 w-2.5" />
							</a>
						</li>
						<li>
							<a
								href="https://github.com/rmc8/shelfsky"
								target="_blank"
								rel="noreferrer"
								class="flex items-center gap-1.5 transition-colors hover:text-foreground"
							>
								<svg class="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
									<path
										fill-rule="evenodd"
										clip-rule="evenodd"
										d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
									/>
								</svg>
								<span>GitHub</span>
							</a>
						</li>
					</ul>
				</div>
			</div>
		</div>

		<!-- Bottom Bar -->
		<div
			class="flex flex-col items-center justify-between gap-3 border-t border-border/40 pt-5 text-[11px] sm:flex-row"
		>
			<p>
				© {new Date().getFullYear()} Blueshelf. Created by
				<a
					href="https://rmc-8.com"
					target="_blank"
					rel="noreferrer"
					class="font-medium text-foreground hover:underline">rmc-8.com</a
				>
				(<a
					href="https://bsky.app/profile/k.rmc-8.com"
					target="_blank"
					rel="noreferrer"
					class="text-primary hover:underline">@k.rmc-8.com</a
				>)
			</p>
			<div class="flex items-center gap-1 text-muted-foreground/80">
				<span>Powered by</span>
				<span class="font-medium text-foreground">AT Protocol</span>
			</div>
		</div>
	</div>
</footer>

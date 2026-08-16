import { type VariantProps, cva } from 'class-variance-authority';

export const badgeVariants = cva(
	'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
	{
		variants: {
			variant: {
				default: 'border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80',
				secondary:
					'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
				destructive:
					'border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80',
				outline: 'text-foreground',
				finished:
					'border-transparent bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30',
				reading:
					'border-transparent bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30',
				want: 'border-transparent bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30',
				backlog:
					'border-transparent bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30',
				dropped:
					'border-transparent bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border border-zinc-500/30'
			}
		},
		defaultVariants: {
			variant: 'default'
		}
	}
);

export type BadgeVariant = VariantProps<typeof badgeVariants>['variant'];

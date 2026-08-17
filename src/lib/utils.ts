import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

const COVER_THEMES = [
	{
		bg: 'from-blue-700 via-blue-900 to-slate-900',
		border: 'border-blue-500/40',
		accent: 'bg-blue-400'
	},
	{
		bg: 'from-emerald-700 via-emerald-900 to-slate-900',
		border: 'border-emerald-500/40',
		accent: 'bg-emerald-400'
	},
	{
		bg: 'from-amber-700 via-amber-900 to-stone-900',
		border: 'border-amber-500/40',
		accent: 'bg-amber-400'
	},
	{
		bg: 'from-purple-700 via-purple-900 to-slate-900',
		border: 'border-purple-500/40',
		accent: 'bg-purple-400'
	},
	{
		bg: 'from-rose-700 via-rose-900 to-slate-900',
		border: 'border-rose-500/40',
		accent: 'bg-rose-400'
	},
	{
		bg: 'from-cyan-700 via-cyan-900 to-slate-900',
		border: 'border-cyan-500/40',
		accent: 'bg-cyan-400'
	},
	{
		bg: 'from-indigo-700 via-indigo-900 to-slate-900',
		border: 'border-indigo-500/40',
		accent: 'bg-indigo-400'
	},
	{
		bg: 'from-teal-700 via-teal-900 to-zinc-900',
		border: 'border-teal-500/40',
		accent: 'bg-teal-400'
	}
];

export function getBookCoverTheme(title: string) {
	let hash = 0;
	for (let i = 0; i < (title || '').length; i++) {
		hash = (hash << 5) - hash + title.charCodeAt(i);
		hash |= 0;
	}
	const index = Math.abs(hash) % COVER_THEMES.length;
	return COVER_THEMES[index];
}

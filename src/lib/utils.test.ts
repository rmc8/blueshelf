import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { cn } from './utils';
import { buttonVariants } from './components/ui/button/button';
import { badgeVariants } from './components/ui/badge/badge';

describe('UI Utilities & Variants', () => {
	it('cn merges class names properly', () => {
		const result = cn('text-sm font-medium', 'text-sm text-red-500');
		assert.ok(result.includes('text-red-500'));
		assert.ok(!result.includes('text-sm text-sm'));
	});

	it('buttonVariants generates correct base classes', () => {
		const defaultBtn = buttonVariants({ variant: 'default', size: 'default' });
		assert.ok(defaultBtn.includes('bg-primary'));

		const outlineBtn = buttonVariants({ variant: 'outline', size: 'sm' });
		assert.ok(outlineBtn.includes('border'));
		assert.ok(outlineBtn.includes('h-8'));
	});

	it('badgeVariants contains reading status variants', () => {
		const finishedBadge = badgeVariants({ variant: 'finished' });
		assert.ok(finishedBadge.includes('emerald'));

		const readingBadge = badgeVariants({ variant: 'reading' });
		assert.ok(readingBadge.includes('blue'));
	});
});

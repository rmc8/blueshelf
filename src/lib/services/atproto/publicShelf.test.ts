import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseActorHandle, buildShareText } from '$lib/services/atproto/publicShelf';

describe('Public Shelf & Social Sharing (TDD)', () => {
	it('normalizes actor handle string properly', () => {
		assert.equal(parseActorHandle('@alice.bsky.social'), 'alice.bsky.social');
		assert.equal(parseActorHandle('  bob.example.com  '), 'bob.example.com');
		assert.equal(parseActorHandle('did:plc:123456'), 'did:plc:123456');
	});

	it('builds rich share text with hashtag and book count', () => {
		const shareText = buildShareText({
			handle: 'alice.bsky.social',
			displayName: 'Alice',
			finishedCount: 42
		});

		assert.ok(shareText.includes('Alice (@alice.bsky.social)'));
		assert.ok(shareText.includes('42 冊'));
		assert.ok(shareText.includes('#Blueshelf'));
		assert.ok(shareText.includes('#読書記録'));
	});
});

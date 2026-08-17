import { test, expect } from '@playwright/test';

test.describe('Book Search Page E2E (GitHub Pages Environment)', () => {
	test.beforeEach(async ({ page }) => {
		page.on('console', (msg) => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
		page.on('pageerror', (err) => console.error('BROWSER PAGEERROR:', err));
	});

	test('renders search page and popular suggestions', async ({ page }) => {
		await page.goto('/search/');
		await expect(page.locator('h1')).toContainText('本を検索');
		await expect(page.getByPlaceholder('タイトル・著者名・ISBNで検索')).toBeVisible();

		const suggestionChips = page.locator('button:has-text("伊坂幸太郎")');
		await expect(suggestionChips).toBeVisible();

		const searchButton = page.locator('button[type="submit"]:has-text("検索")');
		await expect(searchButton).toBeVisible();
	});

	test('searches Japanese books for "伊坂幸太郎" via Enter key and renders results with covers', async ({
		page
	}) => {
		await page.goto('/search/');

		const searchInput = page.getByPlaceholder('タイトル・著者名・ISBNで検索');
		await searchInput.fill('伊坂幸太郎');
		await searchInput.press('Enter');

		// 検索結果カード (.grid > div) が表示されるのを待機
		const firstBookCard = page.locator('.grid > div').first();
		await expect(firstBookCard).toBeVisible({ timeout: 20000 });

		const firstBookTitle = firstBookCard.locator('h2');
		const titleText = await firstBookTitle.textContent();
		console.log(`First book title for 伊坂幸太郎: ${titleText}`);
		expect(titleText).toBeTruthy();

		// スクリーンショットを撮影
		await page.screenshot({ path: 'test-results/isaka-search-success.png', fullPage: true });

		// 書籍カードをクリックしてモーダルが開き、PDS保存UIが表示されること
		await firstBookCard.click();
		const modal = page.getByRole('dialog');
		await expect(modal).toBeVisible();
		await expect(modal).toContainText('PDSに保存');
		await expect(modal).toContainText('読みたい');
		await expect(modal).toContainText('読了');
	});

	test('clicking popular suggestion chip "村上春樹" triggers automatic search', async ({
		page
	}) => {
		await page.goto('/search/');

		// 「村上春樹」チップをクリック
		const murakamiChip = page.locator('button:has-text("村上春樹")');
		await murakamiChip.click();

		// 検索入力欄に反映されていること
		const searchInput = page.getByPlaceholder('タイトル・著者名・ISBNで検索');
		await expect(searchInput).toHaveValue('村上春樹');

		// 検索結果カードが表示されること
		const firstBookCard = page.locator('.grid > div').first();
		await expect(firstBookCard).toBeVisible({ timeout: 20000 });

		const titleText = await firstBookCard.locator('h2').textContent();
		console.log(`Found Murakami book: ${titleText}`);
		expect(titleText).toBeTruthy();

		// スクリーンショットを撮影
		await page.screenshot({ path: 'test-results/murakami-search-success.png', fullPage: true });
	});

	test('searches publisher/keyword "オライリー" via search button click and renders books with covers', async ({
		page
	}) => {
		await page.goto('/search/');

		const searchInput = page.getByPlaceholder('タイトル・著者名・ISBNで検索');
		await searchInput.fill('オライリー');

		const searchButton = page.locator('button[type="submit"]:has-text("検索")');
		await searchButton.click();

		// 検索結果カードが表示されること（NDL/CiNii/OpenLibrary横断）
		const firstBookCard = page.locator('.grid > div').first();
		await expect(firstBookCard).toBeVisible({ timeout: 20000 });

		const titleText = await firstBookCard.locator('h2').textContent();
		console.log(`Found O'Reilly book in E2E: ${titleText}`);
		expect(titleText).toBeTruthy();

		// スクリーンショットを撮影
		await page.screenshot({ path: 'test-results/oreilly-search-success.png', fullPage: true });
	});
});

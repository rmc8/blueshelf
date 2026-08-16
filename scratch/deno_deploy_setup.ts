import { chromium } from 'npm:playwright';

async function run() {
	console.log('Launching browser to check Deno Deploy console...');
	// 既存の Chrome ユーザープロファイルが存在する場合は流用してログイン状態を維持
	const userDataDir = '/Users/rmc8/.gemini/antigravity-ide/chrome-profile';

	const browser = await chromium.launchPersistentContext(userDataDir, {
		headless: false,
		viewport: { width: 1280, height: 800 }
	});

	const page = await browser.newPage();
	console.log('Navigating to https://console.deno.com/rmc8/blueshelf/settings ...');
	await page.goto('https://console.deno.com/rmc8/blueshelf/settings', {
		waitUntil: 'domcontentloaded',
		timeout: 30000
	});

	await page.waitForTimeout(3000);
	const url = page.url();
	console.log('Current URL:', url);

	// ログインが必要な場合
	if (url.includes('/login') || url.includes('/signin') || url.includes('github.com/login')) {
		console.log('Login required. Waiting for user login or redirect...');
	} else {
		console.log('Page loaded in console. Taking screenshot...');
		await page.screenshot({ path: 'scratch/deno_settings.png' });
	}

	// 10秒待機
	await page.waitForTimeout(10000);
	await browser.close();
}

run().catch(console.error);

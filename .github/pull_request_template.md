## 概要 (Overview)

<!-- 今回の PR で対応した内容、目的、関連するロードマップ/ステップを簡潔に記述してください -->

## 関連 Issue / タスク (Related Issues)

- 関連タスク: <!-- 例: Step 6 公開本棚 / Step 7 Bluesky クロスポスト -->

## 主な変更点 (Key Changes)

- [ ]

## 🧪 テスト & 品質検証 (Verification)

- [ ] `pnpm lint` (Prettier & ESLint)
- [ ] `pnpm check` (TypeScript & Svelte 5 Diagnostics)
- [ ] `pnpm test` (単体テスト全件 Green)
- [ ] `pnpm build` (プロダクションビルド & PWA 生成)

## 📸 スクリーンショット / 動作確認 (Screenshots)

| Before                                  | After |
| :-------------------------------------- | :---- |
| <!-- スクリーンショットや動画を貼付 --> |       |

## 🛡️ 敵対的検証 & セキュリティ確認 (Adversarial & Security Check)

- [ ] Zero-Secret / PKCE+DPoP 設計を維持しているか（秘密鍵やパスワードの漏洩がないか）
- [ ] 外部テキスト描画時の XSS 対策（DOMPurify / エスケープ処理）
- [ ] オフライン時および API エラー時のハンドリング

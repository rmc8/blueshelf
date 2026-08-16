# AGENTS.md

Blueshelf (AT Protocol 読書管理・SNS Web/PWA) の開発・コーディング規約。

## 🛠️ コマンド（Deno 必須）

```bash
deno task dev      # 開発サーバー
deno task check    # 型チェック (TypeScript & Svelte)
deno task build    # プロダクションビルド (SPA + PWA)
deno task format   # フォーマット
deno task lint     # リント
```
*※ `npm` / `pnpm` は使用禁止。常に `deno` コマンドを使用すること。*

---

## 📐 開発・コーディング規約

1. **Svelte 5 (Runes) の徹底**:
   - 状態管理は `$state()`、派生値は `$derived()`、副作用は `$effect()`。
   - Props は `let { propA, propB = default }: Props = $props();` 形式。
   - レガシーな `export let ...` や `$:` 構文は禁止。

2. **UI & スタイリング**:
   - コンポーネントは `$lib/components/ui/` (`shadcn-svelte`) を使用。
   - クラス結合には必ず `$lib/utils` の `cn()` を使用。
   - 色はハードコードせず `layout.css` の CSS 変数（`hsl(var(--primary))` 等）を参照。
   - アイコンは `@lucide/svelte` を使用。

3. **多言語対応 (i18n)**:
   - UI 文字列のハードコードは禁止。`messages/ja.json` / `messages/en.json` にキーを追加し、Paraglide で参照。
   - Lexicon レコードの値（`status: "want"` 等）は英語キーを保持し、表示時に変換。

4. **セキュリティ (Zero-Secret & XSS 防止)**:
   - Client Secret や秘密鍵、トークンをコード内にコミットしないこと。
   - ユーザー入力の Markdown や書評テキストは必ず `DOMPurify` でサニタイズして描画。

5. **データ・キャッシュ**:
   - 書籍検索・メタデータキャッシュには `$lib/db/index.ts` (Dexie) を使用。

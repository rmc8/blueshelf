# AGENTS.md

Blueshelf (AT Protocol 読書管理・SNS Web/PWA) の開発・コーディング規約。

## 🛠️ 開発コマンド

すべてのタスクは `deno` コマンドで実行します。

```bash
deno task dev      # 開発サーバー
deno task check    # 型チェック (TypeScript & Svelte)
deno task build    # プロダクションビルド (SPA + PWA)
deno task format   # フォーマット
deno task lint     # リント
```

---

## 📐 開発・コーディング規約

1. **Svelte 5 (Runes) の適用**:
   - 状態管理は `$state()`、派生値は `$derived()`、副作用は `$effect()` を使用します。
   - Props は `let { propA, propB = default }: Props = $props();` 形式で定義します。

2. **UI & スタイリング**:
   - コンポーネントは `$lib/components/ui/` (`shadcn-svelte`) を使用します。
   - クラス結合には `$lib/utils` の `cn()` を使用します。
   - テーマカラーは `layout.css` の CSS 変数（`hsl(var(--primary))` 等）を参照します。
   - アイコンは `@lucide/svelte` を使用します。

3. **多言語対応 (i18n)**:
   - UI 表示文字列は `messages/ja.json` / `messages/en.json` にキーを追加し、Paraglide で参照します。
   - Lexicon レコードの値（`status: "want"` 等）は英語キーで保持し、UI 表示時に辞書で変換します。

4. **セキュリティ (Zero-Secret & XSS 対策)**:
   - ATProto OAuth (PKCE) の Public Client 構成を維持し、認証セッションはブラウザの IndexedDB で管理します。
   - ユーザー入力の Markdown や書評テキストは `DOMPurify` でサニタイズして描画します。

5. **データ・キャッシュ**:
   - 書籍検索・メタデータキャッシュには `$lib/db/index.ts` (Dexie) を使用します。

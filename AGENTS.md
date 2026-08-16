# AGENTS.md

Blueshelf (AT Protocol 読書管理・SNS Web/PWA) の開発・コーディング規約。

## 🛠️ 開発コマンド

すべてのタスクは `pnpm` コマンドで実行します。

```bash
pnpm dev      # 開発サーバー (Vite)
pnpm test     # 単体テスト (TDD / tsx + node:test)
pnpm check    # 型チェック (TypeScript & Svelte)
pnpm build    # プロダクションビルド (SPA + PWA)
pnpm format   # フォーマット (Prettier)
pnpm lint     # リント (ESLint & Prettier)
```

---

## 📐 開発・コーディング規約

1. **ケント・ベック流 TDD (テスト駆動開発) の実践**:
   - ビジネスロジック、データ変換、書誌API連携、パーサー等の新機能・改修は、まず失敗するテスト（Red）を書き、最小限の実装で成功させ（Green）、リファクタリング（Refactor）するサイクルを徹底します。
   - 単体テストは `pnpm test`（`node:test` + `node:assert/strict`）で実行します。

2. **Svelte 5 (Runes) の適用**:
   - 状態管理は `$state()`、派生値は `$derived()`、副作用は `$effect()` を使用します。
   - Props は `let { propA, propB = default }: Props = $props();` 形式で定義します。

3. **UI & スタイリング**:
   - コンポーネントは `$lib/components/ui/` (`shadcn-svelte`) を使用します。
   - クラス結合には `$lib/utils` の `cn()` を使用します。
   - テーマカラーは `layout.css` の CSS 変数（`hsl(var(--primary))` 等）を参照します。
   - アイコンは `@lucide/svelte` を使用します。

4. **多言語対応 (i18n)**:
   - UI 表示文字列は `messages/ja.json` / `messages/en.json` にキーを追加し、Paraglide で参照します。
   - Lexicon レコードの値（`status: "want"` 等）は英語キーで保持し、UI 表示時に辞書で変換します。

5. **セキュリティ (Zero-Secret & XSS 対策)**:
   - ATProto OAuth (PKCE) の Public Client 構成を維持し、認証セッションはブラウザの IndexedDB で管理します。
   - ユーザー入力の Markdown や書評テキストは `DOMPurify` でサニタイズして描画します。

6. **データ・キャッシュ**:
   - 書籍検索・メタデータキャッシュには `$lib/db/index.ts` (Dexie) を使用します。

7. **敵対的検証 & 継続的リファクタリング**:
   - エッジケースや潜在的リスク（オフライン競合、API遅延・障害、UXのボトルネック）を敵対的観点（Devil's Advocate）から能動的に検証し、レビューします。
   - コードの可読性・保守性・型安全性を高めるリファクタリングを継続的に実施します。

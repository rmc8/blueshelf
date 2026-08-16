# AGENTS.md - Blueshelf 開発ガイドライン & エージェント指示書

**Blueshelf** は、AT Protocol（Blueskyエコシステム）上に構築された、分散型のソーシャル読書記録・本棚管理 Web / PWA アプリケーションです。

---

## 📚 関連ドキュメント・仕様書
詳細な仕様書一式は仕様書リポジトリ（`blueshelf-doc`）を参照してください：
- 要件定義・競合分析: `docs/00_concept/requirements.md`
- 敵対的検証レポート: `docs/00_concept/adversarial_review.md`
- システムアーキテクチャ: `docs/01_protocol_architecture/system_architecture.md`
- ATProto Lexicon スキーマ: `docs/01_protocol_architecture/lexicon_data_model.md`
- セキュリティ仕様 (OSS公開前提): `docs/01_protocol_architecture/security_spec.md`
- UI/UX 仕様: `docs/02_frontend_ui/ui_ux_spec.md`
- 多言語対応 (i18n) 仕様: `docs/02_frontend_ui/i18n_spec.md`
- 書誌API仕様: `docs/03_external_services/book_metadata_api.md`
- 開発ロードマップ: `docs/05_roadmap/roadmap.md`

---

## 🛠️ 技術スタック & 実行コマンド

| レイヤー | 採用技術 |
| :--- | :--- |
| **Runtime & Toolchain** | **Deno (Deno 2)** — `deno.json` |
| **Frontend Framework** | **SvelteKit + Svelte 5 (Runes)** |
| **CSS & Styling** | **Tailwind CSS v4** + **shadcn-svelte (Bits UI 2.x)** |
| **i18n (多言語対応)** | **Paraglide.js** (日本語 `ja` / 英語 `en`) |
| **PWA & オフライン** | **`@vite-pwa/sveltekit`** (Workbox) |
| **Client Storage** | **`dexie` (IndexedDB)** |
| **ATProto** | **`@atproto/api`**, **`@atproto/oauth-client-browser`** |
| **書籍メタデータ** | **Google Books API (Primary)** + **openBD (Secondary)** |

### 開発・検証コマンド（※ npm/pnpm ではなく deno を使用）
```bash
# 開発サーバー起動
deno task dev

# 型チェック（TypeScript & Svelte）
deno task check

# プロダクションビルド（静的SPA & PWA Service Worker生成）
deno task build

# プレビュー
deno task preview

# コード整形 & リント
deno task format
deno task lint
```

---

## 📐 コーディング規約 & 設計ルール

### 1. Svelte 5 Runes を徹底
- 状態変数は `$state()`、派生値は `$derived()`、副作用は `$effect()` を使用。
- コンポーネントの Props は `let { propA, propB = default }: Props = $props();` 形式で定義。
- レガシーな `export let ...` や `$:` 構文は使用禁止。

### 2. UI / スタイリング規約
- コンポーネントは `$lib/components/ui/` 配下の `shadcn-svelte` コンポーネントを再利用。
- クラス結合には必ず `$lib/utils` の `cn()` 関数を使用。
- カラーやテーマは `layout.css` の CSS 変数（`hsl(var(--primary))` 等）を参照し、ハードコードしたHEXカラーを避ける。
- アイコンは `@lucide/svelte` を使用。

### 3. 多言語対応 (i18n) 規約
- ユーザーに表示されるUI文字列はハードコードせず、`messages/ja.json` および `messages/en.json` にキーを追加して Paraglide（`m.key_name()`）で参照。
- Lexicon 内の機械可読値（ステータス `want`, `reading`, `finished` 等）は英語キーのまま保持し、UI表示時に辞書で変換。

### 4. セキュリティ & OSS 公開規約 (Zero-Secret)
- このリポジトリは最終的にオープンソースとして公開されます。**Client Secret や秘密鍵、機密トークンを絶対にコード内にコミットしないこと**。
- ユーザー入力の Markdown や書評テキストを描画する際は、必ず **`DOMPurify`**（`dompurify`）でサニタイズしてから表示すること。

### 5. データ永続化 & オフライン対応
- 書籍メタデータや読書ステータスのキャッシュは `$lib/db/index.ts`（Dexie）を活用。
- オフライン時の操作は `offlineQueue` テーブルにキューイングし、オンライン復帰時にPDSへ自動同期する設計を維持すること。

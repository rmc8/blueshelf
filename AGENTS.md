# AGENTS.md - Blueshelf 開発ガイドライン & 設計ドキュメント

**Blueshelf** は、AT Protocol（Blueskyエコシステム）上に構築された、分散型のソーシャル読書記録・本棚管理 Web / PWA アプリケーションです。
ユーザー自身の PDS (Personal Data Server) に読書履歴や書評を永続保存（自己主権データ）しながら、Bluesky のソーシャルグラフやタイムラインと連動します。

---

## 🛠️ 技術スタック & 実行環境

| レイヤー | 採用技術 |
| :--- | :--- |
| **Runtime & Toolchain** | **Deno (Deno 2)** (`deno.json`) |
| **Hosting & Infra** | **Deno Deploy** (エッジ配信 / 完全無料 $0) |
| **Frontend Framework** | **SvelteKit + Svelte 5 (Runes)** |
| **Frontend Adapter** | **`@sveltejs/adapter-static`** (Clean URLs / 404.html SPA) |
| **CSS & Styling** | **Tailwind CSS v4** + **shadcn-svelte (Bits UI 2.x)** |
| **i18n (多言語対応)** | **Paraglide.js** (`messages/ja.json`, `messages/en.json`) |
| **PWA & オフライン** | **`@vite-pwa/sveltekit`** (Workbox, Web App Manifest) |
| **Client Storage** | **`dexie` (IndexedDB)** — キャッシュ & オフラインキュー |
| **ATProto Integration** | **`@atproto/api`**, **`@atproto/oauth-client-browser`** |
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

## 🏛️ コアアーキテクチャ & データモデル

### 1. AT Protocol カスタム Lexicon
ユーザーの PDS に保存されるデータスキーマ：

- **`app.blueshelf.readingStatus`**: 読書ステータス
  - `status`: `"want"` (読みたい), `"reading"` (読んでる), `"finished"` (読了), `"backlog"` (積読), `"dropped"` (中断)
  - `currentPage`: 読書進捗ページ数
  - `book`: `bookRef` オブジェクト（ISBN, タイトル, 著者, 表紙URL等のスナップショット）
- **`app.blueshelf.review`**: 書評・星評価
  - `rating`: 1〜5段階の数値評価
  - `content`: 感想本文（Markdownサニタイズ必須）
  - `hasSpoiler`: ネタバレフラグ
  - `bskyPostUri`: Bluesky同時投稿時の AT-URI
- **`app.blueshelf.shelf`**: カスタム本棚コレクション定義

### 2. 書籍検索 & キャッシュフロー
1. ユーザーがタイトル / 著者 / ISBN で検索。
2. **Google Books API** を Primary として全世界の書籍を検索。
3. 和書の場合は **openBD API** を並列取得し、高品質書影（JPRO）で補完。
4. 取得した書誌データは **`Dexie` (IndexedDB)** に 30 日間ローカルキャッシュ（0ms 即時表示）。

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
- このリポジトリはオープンソースとして公開されます。**Client Secret や秘密鍵、機密トークンを絶対にコード内にコミットしないこと**。
- ユーザー入力の Markdown や書評テキストを描画する際は、必ず **`DOMPurify`**（`dompurify`）でサニタイズしてから表示すること。

### 5. データ永続化 & オフライン対応
- 書籍メタデータや読書ステータスのキャッシュは `$lib/db/index.ts`（Dexie）を活用。
- オフライン時の操作は `offlineQueue` テーブルにキューイングし、オンライン復帰時にPDSへ自動同期（Last-Write-Wins競合解決）する設計を維持すること。

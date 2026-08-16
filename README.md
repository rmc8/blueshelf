# 📚 Blueshelf (ブルースエルフ)

AT Protocol (Bluesky) 上で動作する、分散型・Zero-Secret な読書管理・ソーシャル Web / PWA アプリケーション。

🌐 **Live Website**: [https://bs.rmc-8.com/](https://bs.rmc-8.com/)

---

## 🛠️ 技術スタック (Tech Stack)

- **ランタイム**: Node.js 22 LTS
- **パッケージマネージャー**: pnpm (v11)
- **フロントエンドフレームワーク**: SvelteKit 5 (Runes: `$state`, `$derived`, `$effect`)
- **スタイリング**: Tailwind CSS v4 + `shadcn-svelte` (Bits UI)
- **アイコン**: `@lucide/svelte`
- **国際化 (i18n)**: `@inlang/paraglide-js` (日本語 / English)
- **プロトコル & 認証**: `@atproto/api`, `@atproto/oauth-client-browser` (PKCE + DPoP, Zero-Secret)
- **ローカルデータベース & キャッシュ**: Dexie (IndexedDB)
- **ホスティング**: GitHub Pages (SPA + PWA)

---

## 🚀 開発コマンド (Development)

すべてのタスクは `pnpm` コマンドで実行します。

```bash
# 依存関係のインストール
pnpm install

# 開発サーバーの起動 (Vite)
pnpm dev

# 単体テストの実行 (TDD / tsx + node:test)
pnpm test

# 型チェック (TypeScript & Svelte 5 Diagnostics)
pnpm check

# プロダクションビルド (SPA + PWA 出力)
pnpm build

# リント & フォーマット検証
pnpm lint

# コードの自動フォーマット
pnpm format
```

---

## 🛡️ セキュリティ & 設計原則

1. **Zero-Secret 構成**: パスワードやクライアントシークレットを一切保持せず、ATProto OAuth (PKCE) による Public Client 認証を採用。
2. **オフラインファースト**: 書誌検索結果や読書データを Dexie (IndexedDB) で高速キャッシュし、オンライン時に PDS へ同期。
3. **多言語対応**: すべての UI 文字列は Paraglide i18n 辞書で管理。

---

## 📄 ライセンス

MIT License

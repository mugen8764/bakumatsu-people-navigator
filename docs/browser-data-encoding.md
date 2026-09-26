# ブラウザー用データの形式

正本は `data/*.json`、互換JSONは `data.json` です。`data.js` は [build-data.cjs](../scripts/build-data.cjs) が生成し、読み込み時に同じ内容の `window.BM_DATA` を同期的に設定します。生成物を直接編集しません。

## 採用している方式

`data.js` は、互換JSONの文字列を `JSON.parse` に渡す1行のスクリプトです。`index.html` の直接表示を保つため、`fetch` やモジュールは使いません。JSON文字列を渡す形式は、同じ内容のオブジェクトリテラルより解析が速く、`__proto__` のようなキーもデータとして保持します。

転送量は配信側のHTTP圧縮（gzip・brotli）に任せます。2026年9月まで使っていた独自のLZW圧縮は無圧縮サイズを約6割減らしましたが、HTTP圧縮後はプレーンなJSONより大きく（brotliで約165KB対約109KB）、読み込み時の展開にも時間がかかったため廃止しました。

## 転送量の確認

[performance.spec.js](../tests/e2e/performance.spec.js) は、初回表示で読み込むリソースのうちテキストをgzip圧縮後、画像をそのままのバイト数で合計して上限と比べます。本番が `data.js` をHTTP圧縮して返すことは `npm run check:production` で確認します。

## 変更時の確認

[browser-encoding.test.cjs](../tests/data/browser-encoding.test.cjs) で、公開JSON全体の一致、独立した可変オブジェクト、負数・配列・空値・`__proto__`、日本語・絵文字・行区切り文字・単独サロゲートを確認します。

```sh
npm run build:data
npm test
npm run build:site
```

生成方式を変更した場合も、正本・互換JSON・読み込み後データの内容と校正状態を一致させます。ブラウザー3エンジン、初期レイアウト、初回転送量の確認方法は [開発・運用手順](maintenance.md) を参照してください。

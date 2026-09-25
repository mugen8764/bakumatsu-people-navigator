# 幕末人物・勢力ナビ 1853–1869

黒船来航から箱館戦争終結までを、人物・勢力・事件・場所の関係として読む静的ウェブサイトです。時点ごとの名前・役職・所属・関係の変化を中心に構成しています。

[公開サイトを開く](https://bakumatsu-people-navigator.pages.dev/)

## 収録内容

- 人物: 79名
- 勢力: 14
- 活動分野: 2（医療・学問、暮らし・支援）
- 時点・主要事件: 16
- 個別事件: 20（条約交渉、京都・土佐の政局、寺田屋の救援、薩長提携、政権交替、戊辰戦争など）
- 人物関係: 108
- 勢力関係: 18
- 地点: 30
- 背景解説: 25項目
- 史料肖像: 21点

掲載件数は正本データと `npm run check:docs` で照合します。編集の経緯は[過去の計画・作業記録](https://github.com/mugen8764/bakumatsu-people-navigator/tree/main/docs/archive)に保管しています。

## できること

- 年代を切り替え、その時点の名前・役職・所属と関係の変化を読む。
- 本名・通称・変名・読み・役職から人物を検索する。
- 個別事件の現場・意思決定・背景に関わる人物を区別し、役割と関係を確認する。
- 人物の転換点で、前後の立場と行動を出典とともに比較する。
- 勢力と活動分野、相関図、事件、地図を行き来する。
- 人物・事件の近くで用語や役職を調べ、記述に対応する出典を開く。
- 史料肖像の出典・制作時期・利用条件を確認する。
- URLで時点・人物・勢力・地点・個別事件を共有する。

最初の画面で主要人物と状況をつかめること、320px幅で読めること、詳細を必要に応じて開けることを優先しています。地図は位置関係の概略であり、当時の藩境や全旅程を再現するものではありません。

## 手元で動かす

Node.js 24を使います。バージョン指定は [.node-version](https://github.com/mugen8764/bakumatsu-people-navigator/blob/main/.node-version) と [package.json](https://github.com/mugen8764/bakumatsu-people-navigator/blob/main/package.json) にあります。

リポジトリのルートで実行してください。

```sh
npm ci
node tests/support/static-server.cjs
```

[http://127.0.0.1:4173/](http://127.0.0.1:4173/) を開きます。サーバーは `Ctrl+C` で終了します。静的ファイルなので `index.html` の直接表示も可能ですが、検証にはHTTPサーバーを使います。

## 編集・開発ガイド

| 目的 | 読む資料 |
| --- | --- |
| ドキュメント全体を探す | [ドキュメント案内](https://github.com/mugen8764/bakumatsu-people-navigator/blob/main/docs/README.md) |
| 人物・事件・関係・肖像・出典を編集する | [データ編集手順](data/README.md) |
| フィールド・参照・期間の制約を調べる | [データ契約](schema/README.md) |
| 開発環境・テスト・公開・障害確認 | [開発・運用手順](https://github.com/mugen8764/bakumatsu-people-navigator/blob/main/docs/maintenance.md) |
| 読みやすさや理解度を評価する | [利用者評価手順](https://github.com/mugen8764/bakumatsu-people-navigator/blob/main/docs/turning-points-evaluation.md) |
| 作業時のプロジェクト規約 | [AGENTS.md](https://github.com/mugen8764/bakumatsu-people-navigator/blob/main/AGENTS.md) |

`docs/` と開発用ファイルは公開成果物に含めません。そのため、このREADMEからそれらへのリンクはGitHubを参照します。

## データと公開

歴史データの正本は `data/*.json` です。`data.json`・`data.js`・`SOURCES.md` は生成物で、直接編集しません。内容変更後の再生成と確認は[データ編集手順](data/README.md)にまとめています。

公開成果物は次のコマンドで作ります。

```sh
npm run build:site
```

配置するのは生成された `dist/` の内容だけです。本番では `main` のCIが成功すると、検査済みの成果物をCloudflare Pagesへ配信します。続くProduction smokeで、本番の主要39ファイル、4種のセキュリティヘッダー、24件のキャッシュ方針を照合します。手順・コマンド・確認範囲は[開発・運用手順](https://github.com/mugen8764/bakumatsu-people-navigator/blob/main/docs/maintenance.md)を参照してください。

## 情報の扱いとライセンス

事実と解釈を分け、未確認の役職・関係・動機を推測で補いません。項目ごとの校正状態を保持し、未確認・諸説ありの表示を残します。日付には必要に応じて旧暦・新暦の区別を付けています。研究・引用では、[出典一覧](SOURCES.md)から原資料・専門文献を確認してください。

プログラムコードはMIT License、独自の編集文とデータ編集物はCC BY 4.0です。第三者の史料画像・外部出典の内容はそれぞれの条件に従います。地図形状はNatural Earthのpublic domainデータに由来します。詳しくは [LICENSE](LICENSE) を参照してください。

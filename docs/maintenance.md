# 開発・運用手順

リポジトリのルートで実行する手順です。歴史情報の書き方は [データ編集](../data/README.md)、作業上の原則は [AGENTS.md](../AGENTS.md) を参照してください。

## 構成と責務

| 場所 | 責務 |
| --- | --- |
| `index.html` | 静的な画面構造とスクリプトの読込順 |
| `src/app.js` | 状態変更・画面・URLの接続 |
| `src/domain.js` | 時点別状態、活動範囲、関係の判定 |
| `src/state.js` / `src/router.js` | 選択状態、URLハッシュ、ローカル保存 |
| `src/search.js` / `src/map.js` | 横断検索と地図操作 |
| `src/renderers/` / `src/styles.css` | 描画とレスポンシブ表示 |
| `data/*.json` / `schema/` | 歴史データの正本とデータ契約 |
| `scripts/` / `tests/` | 生成・検証・公開確認と回帰テスト |
| `assets/portraits/` | 出典・利用条件を確認した史料画像 |
| `map-data.js` | Natural Earth由来の地理形状を投影・変換したSVGパス |
| `og-image.svg` / `og-image.png` | OGP画像の作図原本と公開用1200×630 PNG |
| `dist/` | 生成した公開成果物。直接編集・コミットしない |

アプリケーションコードをバンドル・変換せず、静的ホスティングとブラウザーからの直接表示を維持します。`data.js` の生成方式は [ブラウザー用データの形式](browser-data-encoding.md) にまとめています。

OGP画像を変更した場合は、`og-image.svg` から1200×630のPNGを書き出し直します。公開成果物に含めるのは `og-image.png` だけです。

## 環境とローカル表示

Node.js 24を使い、[package-lock.json](../package-lock.json) に固定した依存関係を導入します。

```sh
npm ci
npx playwright install chromium
node tests/support/static-server.cjs
```

ブラウザーで `http://127.0.0.1:4173/` を開きます。サーバーは `Ctrl+C` で終了します。表示だけならPlaywrightブラウザーのインストールは不要です。

公開成果物を表示する場合（PowerShell）:

```powershell
npm run build:site
$env:STATIC_SITE_ROOT = 'dist'
node tests/support/static-server.cjs
```

別のポートを使う場合は `$env:PLAYWRIGHT_PORT = '4177'` のように1〜65535の未使用ポートを指定します。Bashでは `STATIC_SITE_ROOT=dist PLAYWRIGHT_PORT=4177 node tests/support/static-server.cjs` と指定できます。

## 変更に応じた検査

| 変更 | 必要な生成・確認 |
| --- | --- |
| ドキュメント | リンク・記述を実装と照合、`npm run check:docs`、`git diff --check`。公開する場合は `npm run build:site` |
| 歴史データ | `npm run build:data`、`npm run test:data`。期間・検索・追加内容の表示を対象に確認 |
| 出典カタログ | 上記に加え `npm run build:sources`。追加・変更URLの到達性と本文を別々に確認 |
| 肖像 | データの検査に加え、画像の読み込み・帰属・年代・利用条件・初回読み込み量を確認 |
| UI・状態管理・ドメイン処理 | `npm test`、関連する実操作と320pxのライト・ダーク |
| スキーマ・生成処理 | `npm run build:data` と `npm test`。正本と互換JSON・ブラウザーデータの一致を確認 |
| 開発用の検査・補助コマンド | 対象コマンドのテストと `npm run test:data`。UI・ドメイン・生成処理にも影響する場合は該当行の検査を追加 |

複数の区分にまたがる場合は必要な検査を合わせ、同じ検査は重複実行しません。編集途中は対象テストに絞れますが、公開前の必須検査の代用にはしません。失敗や追加変更がなければ、成功済みの検査を念のためだけに繰り返す必要はありません。

対象を絞る例（変更に関係するファイルを選びます）:

```sh
node --test tests/data/incidents.test.cjs
npx playwright test tests/e2e/incidents.spec.js --project=chromium
```

共通の操作経路は既存テストを使い、追加データのID・役割・年代など既存テストで保証できない完成条件を確認します。全個別事件の表示・参加者・人物詳細との往復・地図は [incident-coverage.spec.js](../tests/e2e/incident-coverage.spec.js) がデータから自動で確認するため、事件を追加しても同じ経路のブラウザー検査を書き足す必要はありません。ブラウザー検査の期待件数は [tests/support/catalog.cjs](../tests/support/catalog.cjs) で `data.json` から求め、数値を直接書きません。画面を目視・操作した結果と、自動テストが通った結果は区別して報告します。

`npm test` はデータ検査とブラウザー検査を実行します。ローカルの既定はChromiumです。Firefox・WebKitも含めて公開用distを検査する場合（PowerShell）:

```powershell
npx playwright install chromium firefox webkit
npm run build:site
$env:STATIC_SITE_ROOT = 'dist'
$env:PLAYWRIGHT_ALL_BROWSERS = '1'
npm test
```

Bashでは `STATIC_SITE_ROOT=dist PLAYWRIGHT_ALL_BROWSERS=1 npm test` と指定します。環境変数は同じシェルの後続コマンドにも残るため、元の条件に戻す際は新しいシェルを使うか解除してください。

Chromiumは対象の全検査、Firefox・WebKitは `@cross-browser` の主要操作を実行します。設定の正本は [playwright.config.cjs](../playwright.config.cjs) です。CIではLinux上で3ブラウザーを準備し、`STATIC_SITE_ROOT=dist` を指定します。

ブラウザー検査は `@playwright/test` ではなく [tests/support/test.cjs](../tests/support/test.cjs) から `test` と `expect` を読み込みます。未捕捉のページエラーでテストを失敗させ、失敗時にはコンソールエラーを添付します。アプリは起動時の例外を捕捉して共通のエラー表示にするため、原因はこの添付で確認します。

### 画像・アクセシビリティ・容量

app・people・events・mapの補足も配信容量を維持するためここで管理します。保存できない環境でもアプリを継続し、選択人物の収録範囲外では代わりの人物と近い時点への入口を示します。popstateとhashchangeが同じ履歴移動を通知しても描画は一度だけにします。事件詳細への移動は折り返すsticky tabsの実測高さを避けて見出しへフォーカスします。人物一覧は親の主要事件の主役を先頭にし、残りを勢力・表示名順にします。長州の事件経路は事件内ページナビとは別の読書導線です。地図の11.5px文字は日本語の代替フォントとブラウザーによる上下の差を見込んで隣接ラベルとの余白を確保します。

人物詳細の「事件でたどる」は個別事件の参加者だけを使用し、親時点の役職を補完しません。最初の3件を表示し、残りは展開できます。順序はsceneのorder、記載日付の先頭の年・月・日、正本の登録順です。期間は開始側を使い、月日がない項目はその年・月の先頭へまとめます。和暦だけの年は親sceneの年で分類し、併記された西暦へ暦変換しません。表示日付は原文のままです。この読書順は期間の重なりや暦の違いを解消した厳密な発生日比較、または因果関係を意味しません。

初回転送量を維持するため、domain・sharedの補足コメントをここで管理します。別名へ基本名の読みを継承せず、確認済みの複数読みは残します。転換点は編集した出典付き比較だけを使い、status本文の差分から作りません。同じ事件の関係者は直接関係とは区別し、登録済みの主要関係を除いて人物ごとに一度だけ掲載します。rendererでHTMLを組み立てる値はすべてescapeHtmlを通します。描画で置換された操作要素のフォーカスはdata属性で対応する新要素へ戻し、対応要素がない場合は人物詳細などの移動先へ移します。

画像スナップショットの正本はWindowsです。差分画像を見て意図した変更と確認できた場合だけ更新します。

```sh
npm run test:e2e:visual
npm run test:e2e:visual:update
```

CIとWindows以外では画像比較を除き、レイアウト、横溢れ、キーボード・タッチ、WCAG A/AA、初期レイアウト移動を検査します。画像の更新で操作不良やアクセシビリティの失敗を解消したことにしません。

[performance.spec.js](../tests/e2e/performance.spec.js) は、保存状態のない初回表示で読み込むHTML・CSS・スクリプト・データ・画像の転送量を340,000バイト未満に制限します。テキストはgzip圧縮後、画像はファイルのままのバイト数で数えます。全ページを閲覧した後の合計とは別の値です。

`src/styles.css` の `.app-loading` は、HTML解析後にデータと描画処理が到着するまでの高さを予約します。レイアウト変更時は1280px・600px・320px・390pxで読み込み後の `getBoundingClientRect().height` を測定し、上記検査で予約値との一致を確認します。外枠だけでなく要約内の行も予約し、検索欄が移動しないことを確認してください。スマホの人物一覧は、約60人を表示する時点でも読めるよう、肖像・名前・役職・勢力を横に並べた行にします。配信CSSには短い参照だけを置き、詳しい保守手順はここで管理します。

CSSの補足設計メモは配信量を抑えるためここで管理します。名前のチップは縮小せず折り返し、広い画面では主役と勢力を並べて一覧の入口を保ちます。相関図では線が関係の意味、ノードが選択時点の人物と勢力を示します。時点の変化は要約の近くに置き、地点カードから人物・事件の画面へ移動できるようにします。小さい画面でも各ビューの入口と選択中の文脈を維持します。

配信するscene・router・stateとCSSの補足コメントもここで管理します。初回転送量の340,000バイト上限は維持します。

- sceneの代表チップは最大3人ですが、見出しの件数は省略人数でなく全員を示します。詳細欄はlive regionにせず、時点が実際に変わったときだけ場面を通知します。
- routerの保存とURL共有は任意です。ストレージやfile://環境で保存できなくても、メモリー内の操作を継続します。Safari 17より前にも対応するためURLSearchParamsのsizeではなくキーを数えます。
- 選択人物の由来に合わせてpreferredPersonを保持し、収録範囲外では別の人物を表示して元の選択を別途URLへ残します。保存状態のない共有URLでも復元できることを確認します。
- URL・保存値は外部入力なので、constructorなど継承プロパティを登録項目として認めません。人物移動後は表示中の人物が一覧へ戻れるよう所属フィルターを整えます。フィルター自体を選ぶ操作では別勢力の閲覧を可能にします。
- CSSの初期高さは内側の行も予約して検索欄を固定します。場面ボードは事件・人物・勢力から詳細へ進む入口で、時点位置はラベル付きselectで伝えます。視覚的に隠したラベルは読み上げに残します。タブの両端で操作用余白を予約して一覧を動かさず、背景用語は読んでいる人物・事件の近くに置きます。

### 読書ガイド

現在地は表示stateから毎回求め、読了進捗を保存しません。ガイド内の選択事件の完全一致を最優先し、次に親sceneと一致するsceneステップ、最後に同じ親sceneの事件ステップの登録順先頭を選びます。該当がなければ現在地を表示しません。同じscene内の複数ステップもこの順で一つに決め、年月日の近さや読了を推測しません。680px以下では説明本文だけを2行clampし、全文をDOMと遷移先に保持します。見出し・年・遷移ボタン・校正バッジは省略しません。

### 日本語IME

検索はcompositionイベントとbeforeinputで変換状態を追跡します。変換中は候補を再描画せず、compositionendで確定した入力の候補を更新して古い候補選択を解除します。確定直後のEnterは抑制し、keyupまたは新たな通常キー操作で解除します。keyupを伴わない確定でも、その後の候補移動は受け付けます。blur・検索終了でも状態を解除します。isComposingとkeyCode 229の既存ガードも維持します。

実機でOS・ブラウザー・日本語IMEを確認し、検索入力の変換中に上下キーとEnterを操作します。変換候補の移動・確定で人物選択や画面遷移が起きず、変換終了後の検索候補選択は使えることを確認します。合成イベントの回帰テストと実機での確認は区別します。

Windows ATOKでcompositionend後のArrowDownがWeb候補操作と競合する調査は [Issue #35のイベント境界確認](atok-ime-verification.md) を参照します。既知ログの再現テストが通っても、ATOK互換性を確認済みにはしません。

### 出典・校正状態

```sh
npm run report:review
npm run report:sources
npm run check:links
```

全出典URLの到達性検査は週次の独立ジョブです。日常の変更では追加・変更URLを確認します。`check:links` は404・410を明確なリンク切れとして扱い、403・429・通信失敗などを警告として区別します。本文の正しさは到達性だけでは確認できません。

`data/sources.json` の出典IDを指定すると、その出典だけを確認できます。以下は既存IDを使った例です。今回追加・変更したIDに置き換えます。

```sh
npm run check:links -- --source archives_timeline --source ndl_modern_timeline --list
npm run check:links -- --source archives_timeline --source ndl_modern_timeline
```

`--list` は対象IDとURLだけを表示し、通信しません。`--source` は繰り返し指定でき、同じIDは1回だけ確認します。存在しないID・不正な引数は通信前にエラーで停止します。引数なしでは従来どおり全出典を検査するため、日常作業では対象IDを明示してください。

終了コード0でも警告があれば未確認の到達性が残ります。警告を本文確認成功や `verified` の根拠にせず、対象IDと制約を作業報告に残します。このコマンドは出典の本文確認日・校正状態・正本ファイルを変更しません。

## 公開手順

1. データや読み込むスクリプト・CSSを変更した場合は、下記の `content:prepare` で版番号・更新日・生成物・掲載件数・アセット識別子をそろえる。
2. 差分を確認し、正本JSONの意図した変更と生成物がそろっていることを確認する。
3. 変更範囲に応じた上記の検査を行う。編集中は失敗箇所や変更箇所を絞って確認し、仕上げに必須の全体検査を行う。
4. `npm run build:site` で公開検査を通し、生成したdistを確認する。公開する内容は `dist/` のみ。
5. コミット・pushする。ドキュメントのみの変更はここで完了とし、push後のCI・デプロイ結果の確認や本番照合は行わない。
6. コード・データ・設定を変更した場合は、対象コミットのCI、Deploy to Cloudflare Pages、Production smokeを確認する。本番で変更箇所を実操作し、公開物が対象コミットに一致することを確認する。

着手時とコミット直前に `git status --short` を確認し、対象ファイルを明示してステージします。pushが他の更新との競合で拒否された場合はリモートの差分を確認し、force pushで上書きしません。取り込みで今回の変更に影響が出た場合は、該当する検査を再実行します。

完了報告には、変更した内容・ファイル、実行した検査と結果、残る未確認事項、コミットを記載します。本番確認が必要な変更では、確認したCI・配信の対象コミットも示します。その公開単位が完了したら作業を止めます。

ドキュメントや開発ツールだけの変更で歴史データや読み込むアセットが変わらない場合、`content:prepare` は不要で、コンテンツ版・アセット識別子を維持できます。生成物を手で調整して検査を通さないでください。

`build:site` は `check:release` を含み、出力後にも `dist/` の参照ファイル・画像形式などを検査します。開発依存、テスト、スクリプト、`docs/`、`AGENTS.md` は配信しません。README・SOURCES・データ・スキーマは公開成果物に含まれます。これらから開発ドキュメントを参照するリンクはGitHubへ向けます。

### 公開準備コマンド

版番号・更新日は公開する値を明示します。まず `data/manifest.json` の現在値と直近の変更を確認し、通常の情報拡充ではコンテンツ版の末尾を1つ進め、更新日は作業日の `YYYY-MM-DD` を指定します。別の公開日が明示されている場合はその日付を使います。以下は例なので、今回の値へ置き換えてください。

```sh
npm run content:prepare -- --version 1.0.75 --date 2026-09-27 --dry-run
npm run content:prepare -- --version 1.0.75 --date 2026-09-27
git diff --stat
git diff --check
```

`--dry-run` は更新予定のファイルとアセット識別子を表示し、書き込みません。通常実行は以下をまとめて更新します。

| 対象 | 更新内容 |
| --- | --- |
| `data/manifest.json` | 指定したコンテンツ版・更新日 |
| `data.json` / `data.js` | 正本JSONから既存の生成処理で再生成 |
| `portrait-manifest.json` | 人物・出典の正本と実画像からSHA・寸法・来歴を再生成 |
| `SOURCES.md` | 正本の出典カタログを反映 |
| `README.md` | 収録件数と本番検査の件数。説明文は維持 |
| `sitemap.xml` | 指定した更新日 |
| `index.html` | ローカルスクリプト・CSSの `?v=` を内容由来の共通識別子に統一 |

同じ入力で再実行しても版番号や識別子は進みません。スクリプト・CSS・生成データの内容が変われば、同じ版番号・日付でも識別子が変わります。コンテンツを変更しない修正では、既存の版番号を指定できます。

データ契約・参照やREADMEの件数欄、出典一覧の区切りなどを確認し、すべての出力を計算してから書き込みます。入力や構造のエラーは書き込み前に停止します。歴史的事実、出典の本文確認日、校正状態は自動変更しません。

このコマンドの後も、変更区分に応じたテストと `npm run build:site` が必要です。コミット・push・デプロイは公開手順に従います。

### 自動配信と照合

[CI](../.github/workflows/ci.yml) が生成した `public-site` artifactを、[デプロイ](../.github/workflows/deploy.yml) が対象コミットのままCloudflare Pagesへ配置します。Cloudflare側のGit連携からの直接デプロイを併用しない運用です。ホスティング設定を変更する際は管理画面でも確認してください。

CIではpush・pull requestごとにactionlintでワークフローを検査し、公開用distを生成してデータ・ブラウザー検査を実行します。配信後は [Production smoke](../.github/workflows/production-smoke.yml)、全出典の到達性は [週次リンク検査](../.github/workflows/source-links.yml) で確認します。

本番照合は [check-production.cjs](../scripts/check-production.cjs) が管理します。

```sh
npm run check:production
npm run check:production -- --wait
```

`--wait` は配信反映を待って再試行します。`data.js` がHTTP圧縮されて配信されることも確認します。照合対象はアプリ・データ・肖像の主要ファイルとHTTPヘッダーであり、公開物の全ファイルではありません。データ変更に伴って出典一覧なども更新した場合は、その配信内容も別途確認します。未コミットの変更があるチェックアウトとの比較は不一致になり得ます。

`_headers` はCloudflare PagesとNetlify向けです。HTML・静的データ・スクリプト・人物肖像は更新を再検証し、OGP画像とアイコンは1日キャッシュします。他の配信先を使う場合は同等のHTTPヘッダーを設定します。存在しないURLの案内とトップへの復帰も確認します。

### CI・公開の失敗時

- CIが失敗したら、該当コミットのログと診断artifactを確認し、失敗箇所に絞って修正・再検査する。
- 配信が失敗したら、対象コミットと検査済みartifact、認証情報の設定を確認する。
- Production smokeが失敗したら、旧版の配信・反映待ち・ファイル差・ヘッダー差をログで切り分ける。
- 過去のデプロイを再実行すると旧コミットを配信する可能性がある。再実行対象のSHAを確認する。

### Cloudflare認証情報の交換

運用上の交換目安は少なくとも年1回、または漏えいの疑い・管理者変更時です。現在の配信設定に必要な対象アカウントのPages書き込み権限に絞ります。

1. 新しいトークンを用意し、GitHub Actionsの `CLOUDFLARE_API_TOKEN` と `CLOUDFLARE_ACCOUNT_ID` を更新する。
2. 配信対象のコミットを確認し、デプロイとProduction smokeを実行する。
3. 新しい認証情報での配信成功後に旧トークンを失効させる。

認証情報の値はリポジトリ・文書・Issue・ログへ保存しません。

### 相関図の描画補足

配信容量を保つため、relationsの描画補足コメントを以下で保持します。

```text
Card half-sizes match personNode: the selected card is 168×78, others 142×68.
Distance from a box centre to its edge along a unit direction.
Prefer a natural two-line break, with shorter lines for narrow gaps.
Use the rendered font metrics: system fonts differ between platforms,
and the SVG text's baseline is not its vertical centre.
Without a registered relation, people who shared an event at this scene
are the next step. They are labelled as co-participants, not as ties.
Wide enough that a two-line label fits between the centre and a side card.
Relations carry no direction, so edges are plain lines. Labels go on
top of the cards, centred on the stretch of line left visible between
the two cards, so neither card hides them.
The graph is display:none on mobile. Measure outside it so resizing
to desktop still has valid text geometry without another selection.
```

個別事件末尾の前後ボタンは人物の事件時系列と同じ読書順を使い、既存event routeへ移動します。scene order、記載日付中の最初の年・月・日、同値なら正本登録順で一意にします。年・月だけの事件は欠けた成分を0として並べますが、日付表示は原文のままで精密化しません。期間・暦の違いを解消した厳密な発生日比較や因果関係ではありません。

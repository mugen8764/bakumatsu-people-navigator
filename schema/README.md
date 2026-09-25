# データ契約

`data/*.json` が正本、ルートの `data.json` と `data.js` が互換形式の生成物です。v2は運用中の正本形式であり、未導入の移行案ではありません。編集手順は [data/README.md](../data/README.md) を参照してください。

## スキーマ一覧

| 契約 | 対象 |
| --- | --- |
| [v2/manifest.schema.json](v2/manifest.schema.json) | サイト名・内容版・更新日 |
| [v2/people.schema.json](v2/people.schema.json) | 人物の基本情報・収録範囲・任意の肖像と転換点 |
| [v2/person-statuses.schema.json](v2/person-statuses.schema.json) | 時点別の人物状態 |
| [v2/factions.schema.json](v2/factions.schema.json) | 勢力・活動分野と時点別状態 |
| [v2/relations.schema.json](v2/relations.schema.json) | 人物関係・勢力関係 |
| [v2/events.schema.json](v2/events.schema.json) | 時点・主要事件・個別事件・用語 |
| [v2/places.schema.json](v2/places.schema.json) | 地点と概略座標 |
| [v2/sources.schema.json](v2/sources.schema.json) | 出典カタログ |
| [incident.schema.json](incident.schema.json) | 個別事件の人物・関与区分・関係・根拠 |
| [portrait.schema.json](portrait.schema.json) | 肖像の同定・時期・原資料・利用条件 |
| [term.schema.json](term.schema.json) | 背景解説・役職解説 |
| [turning-point.schema.json](turning-point.schema.json) | 人物の前後比較と根拠 |
| [v2/definitions.schema.json](v2/definitions.schema.json) | ID・期間・根拠などの共通定義 |
| [current-data.schema.json](current-data.schema.json) | 生成する互換データ |
| [v2/id-mappings.json](v2/id-mappings.json) | 正本の勢力・関係種別IDと互換形式の対応 |

JSON Schema Draft 2020-12とAjvで型・必須項目を検査し、参照や期間の横断検証は `scripts/validate-data.cjs` で行います。

## IDと参照

- 正本の参照は表示名ではなく安定IDを使う。表示名を変えてもIDを変えない。
- 人物の時点別表示名・事件での表示名は、人物の登録名または別名に含める。
- 主要事件と個別事件はIDを重複させない。人物の `eventIds` は主要事件を参照する。
- 個別事件の参加者は重複させず、関係の両端を参加者に限定する。同一人物の自己関係・同じ人物ペアの重複は許さない。
- 人物・個別事件の `termIds` と、肖像の `sourceId`・`rightsSourceId` も登録先を参照する。

## 期間

正本ではシーンIDを使い、互換形式の配列番号 `start`・`end`・`activeRange` を直接書き込みません。年代順は `events.json` の `scenes[].order` で決め、開始・終了の両端を含みます。

人物状態は人物の収録範囲を空白・重複なく覆います。勢力状態も同一勢力内で期間を重複させません。人物関係と個別事件の参加者は、関連人物の収録範囲内に限ります。転換点は隣接時点間の比較で、同じ人物の到達時点を重複させません。

収録範囲は生存期間の代用ではありません。自動検証が通っても、死亡・離隊・役職変更後の記述が史料に合うかは編集時に確認します。

## 根拠と校正状態

歴史的主張を含む項目は `evidence.sourceIds` と `evidence.reviewStatus` を持ちます。`verified` には当該内容を直接支える出典が必要で、スキーマは少なくとも1件の出典参照を要求します。`needs_review`・`disputed` を生成時に落としたり、自動的に確定扱いへ変えたりしません。

出典本文の該当箇所 `locator` と内容確認日 `contentCheckedAt` は対で記録します。到達性確認日とは別です。人物単位の広範な略歴を、個別の役職・関係の根拠へ自動昇格させません。

## 検証コマンドの違い

| コマンド | 確認すること |
| --- | --- |
| `npm run validate:data` | 正本のスキーマと横断制約、互換JSON・ブラウザーデータとの意味上の一致 |
| `npm run check:data` | 現行の生成処理が出力する文字列と、生成済みファイルの完全一致 |
| `npm run test:data` | 上記に加え、出典精密情報とデータ・ドメイン・生成処理などの回帰検査 |
| `npm run check:release` | データ・生成物・出典一覧・README統計・公開ファイル・校正状態の検査 |

正本を変更したら `npm run build:data` で再生成してから検査します。エラーを消すために生成物を先に修正しません。出典一覧は `npm run build:sources` で生成します。

ブラウザー検査と公開方法は [開発・運用手順](https://github.com/mugen8764/bakumatsu-people-navigator/blob/main/docs/maintenance.md) を参照してください。

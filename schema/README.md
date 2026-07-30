# データ契約

## 目的

このディレクトリは、現行表示を維持したままデータを分割JSONへ移行するための契約を定義します。

- `current-data.schema.json`: 現在の `data.json` を厳格に検証する移行期間用Schema
- `v2/*.schema.json`: `data/` へ分割する次期データのSchema
- `v2/id-mappings.json`: 表示名から独立した勢力ID・関係種別ID

検証には JSON Schema Draft 2020-12 と Ajv を使用します。

## v2の原則

### 安定ID

- 人物、勢力、事件、地点、出典、関係、状態は変更しないIDを持ちます。
- 勢力の表示名は `name`、参照には `id` を使用します。
- 既存の人物・事件・地点・出典IDは、表示名から独立しているため原則維持します。
- 関係IDは両端のID、開始シーンID、関係種別IDから一意に決定します。

### 期間

- 配列インデックスによる `start` / `end` と `activeRange` は使用しません。
- `startSceneId` / `endSceneId` は両端を含む期間です。
- シーンの年代順は `events.json` 内の `scenes[].order` で定義します。
- 人物状態と勢力状態は、同一人物・勢力内で期間を重複させません。

### 出典とレビュー状態

歴史的主張を含むレコードは `evidence` を持ちます。

- `verified`: 項目を裏づける `sourceIds` が1件以上必要
- `disputed`: 諸説があり、出典と注記を併記する対象
- `needs_review`: 項目単位の出典確認が未完了

現行データに項目別出典がない場合、移行処理は出典を推測せず `needs_review` とします。人物・事件に付いている広範な出典を、個々の関係や状態の確定根拠へ自動昇格させません。

## 分割ファイル

- `people.json`: 人物の不変情報と活動期間
- `person-statuses.json`: 時点別の表示名・役職・所属・立場・位置づけ
- `factions.json`: 勢力の不変情報と時点別状態
- `relations.json`: 人物関係と勢力関係
- `events.json`: シーン順序と事件
- `places.json`: 地点と座標
- `sources.json`: 出典カタログ
- `manifest.json`: サイト名、コンテンツ版、更新日

## 検証

```sh
npm run validate:data
```

このコマンドは現在の `data.json` を検証した後、メモリ上でv2へ投影し、全v2 Schema、IDの一意性、参照先、期間順序、状態期間の非重複を検証します。第2段階では分割JSONをまだ生成しません。

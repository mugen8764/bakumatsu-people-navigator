# データ編集

このディレクトリのJSONが歴史データの正本です。ルートの `data.json` と `data.js` はブラウザ互換用の生成物なので、直接編集しません。

## ファイル

- `manifest.json`: サイト名、コンテンツ版、更新日
- `people.json`: 人物の不変情報と活動期間
- `person-statuses.json`: 時点別の表示名、役職、所属、立場
- `factions.json`: 勢力の不変情報と時点別状態
- `relations.json`: 人物関係と勢力関係
- `events.json`: シーン順序と事件
- `places.json`: 地点と座標
- `sources.json`: 出典カタログ

## 編集手順

1. 対象の分割JSONだけを編集する。
2. `evidence.sourceIds` と `evidence.reviewStatus` を確認する。
3. `npm run build:data` で互換ファイルを生成する。
4. `npm test` でSchema、参照、期間、表示を確認する。

表示名ではなく安定IDで参照し、期間には包含的な `startSceneId` / `endSceneId` を使います。詳しい契約は `schema/README.md` を参照してください。

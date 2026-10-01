# データ契約

`data/*.json` が正本、ルートの `data.json` と `data.js` が互換形式の生成物です。v2は運用中の正本形式であり、未導入の移行案ではありません。編集手順は [data/README.md](../data/README.md) を参照してください。

## 外部プロジェクトからの読み取り

外部利用時はコミットSHAを固定し、そのコミットの `data/*.json`・スキーマ・本書を一緒に参照してください。以下は正本v2の意味です。互換生成物ではフィールド名や期間の表現が変わるため、両形式を混ぜて解釈しません。

| 項目 | 意味と利用上の注意 |
| --- | --- |
| 人物の `laterNames` | **成立時期を断定しない検索専用の呼び名**。後世に成立したことを意味しない。当時の表示名や改名の年表には使わない。登録名・当時の別名は `name`・`aliases` を参照する。 |
| `activeStartSceneId` / `activeEndSceneId` | このサイトの状態収録範囲。生没年や実際の活動開始・終了ではない。年代順は `scenes[].order`、両端を含む。 |
| `person-statuses.json` の状態 | 登録された親時点での表示名・役職・所属・立場。個別事件を説明するときは、その事件の `participants[].displayName`・`role`・`side`・`summary` を優先し、親時点の状態を事件当日へ自動転用しない。参加者にない情報を親状態から補って確定扱いにしない。 |
| factionの `kind: field` | 医療・支援などの活動分類。共通の政治方針を持つ組織への所属を意味しない。 |
| `evidence.reviewStatus` | `verified`: 当該項目を直接支える出典がある。`needs_review`: 項目単位の根拠を確認中。`disputed`: 複数の見解があり単一の説明へ断定できない。項目ごとに保持し、人物全体や出典の存在だけで確定扱いにしない。 |
| participantの `involvement` | `onsite`: 現場での関与。`decision`: 意思決定・指揮。`context`: 背景説明上の関係。参加者一覧への掲載だけでは現場にいたことを意味しない。関与区分と役割・根拠を一緒に読む。 |
| `portrait` | 本人同定・年代・利用条件を記録した史料肖像。選択時点の姿は保証しない。`dateNote`・`identityNote`・`rightsNote` と `originalSource`・`credit`・`checkedAt` を保持し、`sourceId` / `rightsSourceId` を出典カタログへ解決する。画像の利用条件はサイト独自データのライセンスとは別に確認する。 |
| sourceの `contentCheckedAt` | 出典本文の内容確認日。取得日やURL到達確認日ではない。対になる `locator` と出典の注記を参照し、確認した主張の範囲を広げない。 |

### 構造変更と意味変更

`manifest.schemaVersion` は正本形式の構造版、`contentVersion` は公開内容の版であり、いずれも同じフィールド名の意味が不変である保証には使えません。現段階では独立した機械可読の意味契約版を追加せず、固定SHAと本書・変更Issueを契約の参照先にします。

フィールド追加・必須化・型変更などの**構造変更**は、スキーマ・validator・生成処理と必要な回帰テストを更新し、非互換なら構造版の更新と移行方法を検討します。型が同じでも説明・適用範囲・解釈が変わる**意味変更**は、本書と変更Issueに旧意味・新意味・外部利用側の対応を記録します。公開データの意味を変更する場合は公開内容版も更新します。外部側は固定SHAを更新する際、スキーマ差分だけでなく本書と関連Issueを確認し、自身の説明文・抽出処理・回帰テストへの影響を判断してください。

意味変更の例: [Issue #2](https://github.com/mugen8764/bakumatsu-people-navigator/issues/2) で `laterNames` を「後世の呼び名」から「成立時期を断定しない検索専用の呼び名」へ修正しました。構造は同じでも、外部側に残る「後世」との説明や年代推定は修正が必要です。本入口の整備は [Issue #13](https://github.com/mugen8764/bakumatsu-people-navigator/issues/13) を参照してください。

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
- 人物の時点別表示名・事件での表示名は、人物の登録名または別名に含める。当時の名前として扱う根拠がない呼称は任意の `laterNames` に入れ、登録名・別名と重複させない。互換性のためのフィールド名であり、成立時期を断定しない。検索だけに使い、表示名にはできない。
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

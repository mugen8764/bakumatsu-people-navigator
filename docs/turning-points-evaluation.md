# 利用者評価：人物・事件・関係の理解

2026-09-25時点では、初見の利用者による課題の実施と理解度の測定は未実施です。この文書は、過去の拡充計画に分散していた課題と記録方法をまとめたものです。自動検査・開発時の操作確認とは分けて記録します。

## 進め方

幕末に詳しくない3〜5人を目安に、普段使う端末で試します。一人にすべての課題を依頼せず、確認したい変更に応じて基本課題と事件課題を合わせて3〜5件選びます。評価者用の「観察すること」は先に参加者へ見せません。

1. 評価日、公開コミット、`data/manifest.json` のコンテンツ版、端末・ブラウザーを記録する。
2. 開始URLと課題だけを伝え、画面の操作方法や答えを先回りして説明しない。
3. 最初に開いた箇所、迷った操作、発言、説明できた内容、助言の有無を記録する。
4. 10秒程度で主役・入口を発見できるか、30秒程度で関係を説明できるかを観察する。これらは目標であり実測結果ではない。時間を過ぎても操作を続けてもらい、原因を確認する。
5. 人物数の追加より、誤読を生む文言・役割区分・入口の改善を優先する。

前の参加者の検索・選択状態が残らないよう、評価用の新しいブラウザープロファイルを使います。個人名や連絡先は記録せず匿名IDを使います。

## 基本課題

| 参加者へ伝える課題 | 開始場所 | 評価者が観察すること |
| --- | --- | --- |
| 西郷の前後の行動を説明する | [1865年・西郷](https://bakumatsu-people-navigator.pages.dev/#scene=1865-choshu&view=people&person=saigo) | 征討への参加から長州支援への変化を読み、「直ちに討幕へ転向」と飛躍しない |
| 桂小五郎の前後の役割を説明する | [1865年・木戸](https://bakumatsu-people-navigator.pages.dev/#scene=1865-choshu&view=people&person=kido) | 潜伏と帰藩後の政務を区別し、同じ名前でも役割が変わると分かる |
| 慶喜が返上したものを説明する | [1867年・慶喜](https://bakumatsu-people-navigator.pages.dev/#scene=1867-taisei&view=people&person=yoshinobu) | 大政奉還と王政復古を区別し、その後の政治参加まで即座に終わったと捉えない |
| 勘定奉行の仕事を調べる | [1853年・川路](https://bakumatsu-people-navigator.pages.dev/#scene=1853-blackships&view=people&person=kawaji-toshiakira) | 役職解説を見つけ、財政・直轄領の行政という役割を説明できる |
| 前の年代へ移り、比較へ戻る | 上記の西郷の比較欄 | 人物を見失わず往復できる |
| この時点で立場が変わった人物を探す | [1865年の画面](https://bakumatsu-people-navigator.pages.dev/#scene=1865-choshu&view=people&person=takasugi) | 年代の詳細から比較への入口を発見できる |

## 事件・関係の課題

| 参加者へ伝える課題 | 開始場所 | 評価者が観察すること |
| --- | --- | --- |
| 薩摩と長州の提携に関わった人物を説明する | [薩長盟約](https://bakumatsu-people-navigator.pages.dev/#event=satcho-agreement) | 会談当事者と仲介者、前年の支援からの変化を区別する |
| 慶喜がいた場所と参戦した人物を探す | [鳥羽・伏見](https://bakumatsu-people-navigator.pages.dev/#event=toba-fushimi-battle) | 大坂の意思決定者と現場の人物を区別する |
| 江戸城の引き渡し後にも戦いが続いた経過を調べる | [江戸開城](https://bakumatsu-people-navigator.pages.dev/#event=edo-castle-surrender) | 山岡の交渉、勝・西郷の会談、榎本の行動を時系列で読める |
| パークス・サトウ・グラバーの仕事を区別する | [1866年・サトウ](https://bakumatsu-people-navigator.pages.dev/#scene=1866-satcho&view=people&person=satow) | 公使・通訳・商人を区別し、外国側を一つの意思として捉えない |
| 福沢が学んだ相手と、その後の仕事を探す | [1858年・福沢](https://bakumatsu-people-navigator.pages.dev/#scene=1858-ansei&view=people&person=fukuzawa) | 洪庵との関係、翻訳・渡航と教育の変化を読める |
| 斎藤を検索し、会津での位置を確かめる | [会津戦争](https://bakumatsu-people-navigator.pages.dev/#event=aizu-siege) | 山口二郎と斎藤一が同一人物であること、城外と城内の違いが分かる |
| 二つの条約と、その交渉・決定に関わる人物を比べる | [和親条約](https://bakumatsu-people-navigator.pages.dev/#event=friendship-treaty-1854) → [通商条約](https://bakumatsu-people-navigator.pages.dev/#event=commercial-treaty-1858) | 条約の違いと、交渉担当者・幕府の意思決定者を区別する |
| 生麦の事件から薩英戦争までの経過を説明する | [生麦事件](https://bakumatsu-people-navigator.pages.dev/#event=namamugi-1862) → [薩英戦争](https://bakumatsu-people-navigator.pages.dev/#event=satsuma-britain-1863) | 現場の人物、賠償要求、交渉、軍事行動の役割を区別する |
| 下関での前年とこの年の出来事を調べる | [下関攻撃](https://bakumatsu-people-navigator.pages.dev/#event=shimonoseki-1864) | 1863年の砲撃と1864年の四国艦隊攻撃を混同しない |
| 小千谷で交渉した二人と、その後の展開を探す | [北越戦争](https://bakumatsu-people-navigator.pages.dev/#event=hokuetsu-1868) | 河井・岩村の交渉と戦闘を区別し、地図へ往復できる |
| 箱館で軍を指揮した人と医師を探す | [箱館戦争](https://bakumatsu-people-navigator.pages.dev/#event=hakodate-1869) | 指揮・交渉・医療を区別し、土方と榎本の最終局面の違いを読める |
| 吉田東洋暗殺と武市らの処分の時期・関係者を調べる | [土佐の政局](https://bakumatsu-people-navigator.pages.dev/#event=tosa-politics-1862) → [勤王党の処分](https://bakumatsu-people-navigator.pages.dev/#event=tosa-repression-1865) | 事件を一度の処分にまとめず、容堂を現場の実行者と誤読しない |
| 二つの寺田屋事件を区別し、救援した人物の役割を説明する | [寺田屋の襲撃と救援](https://bakumatsu-people-navigator.pages.dev/#event=teradaya-1866) | 1862年との区別、お龍と三吉の行動、薩摩による保護を読める |

資料の限界を超えた動機や直接関係を答えとして要求しません。採用範囲や史料間の相違は [過去の編集記録](archive/README.md)、編集基準は [データ編集手順](../data/README.md) で確認します。

## 記録表

評価日・公開コミット・コンテンツ版: 未実施

| 参加者ID・端末 | 課題 | 所要時間・助言 | 最初の操作 | 説明できた内容 | 迷い・誤読 | 改善案 |
| --- | --- | --- | --- | --- | --- | --- |
| 未実施 | — | — | — | — | — | — |

助言後に完了した場合は、初見で自力達成した結果と分けます。少人数の観察を全利用者の理解率として一般化しません。改善後の再確認は、変更した課題と対象コミットを記録します。

## 実機IMEの確認（未実施）

OS・ブラウザー・日本語IMEを記録し、検索入力で変換中の上下キーとEnterを操作します。変換候補の移動・確定で人物選択や画面遷移が起きず、変換終了後の検索候補選択は使えることを確認します。合成イベントの回帰テストが成功していても、実機確認済みとは記録しません。

## 自動検査との分担

データの参照・期間・校正状態、URL復元、履歴、事件への復帰、320pxのライト・ダーク、キーボード・WCAG A/AA、読み込み量は既存の自動検査で確認します。必要なコマンドは [開発・運用手順](maintenance.md) を参照してください。

自動検査は「その操作が可能か」を確認し、この評価は「初見で入口を見つけ、関係を理解できるか」を確かめます。初回の転換点・役職解説の検査記録は [1.0.62の記録](archive/turning-points-initial-release.md) に保管しています。

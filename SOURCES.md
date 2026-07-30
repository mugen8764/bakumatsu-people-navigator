# 出典と校正方針

## 主な公開資料

1. [国立公文書館「激動幕末・年表」](https://www.archives.go.jp/exhibition/digital/bakumatsu/history.html)  
   黒船来航、条約、攘夷、長州征討などの主要事件と公文書資料。

2. [国立国会図書館「近代日本人の肖像」](https://www.ndl.go.jp/portrait/index.html)  
   幕末・明治期人物の肖像・略歴。人名索引は `https://www.ndl.go.jp/portrait/indexes/index.html`。

3. [国立国会図書館「史料にみる日本の近代・年表」](https://www.ndl.go.jp/modern/utility/chronology.html)  
   黒船来航、薩長提携、大政奉還、王政復古などの主要年表。

4. [国立国会図書館「あの人の直筆・人物一覧」](https://www.ndl.go.jp/jikihitsu/person)  
   維新期の人物解説と直筆資料。

5. [アジア歴史資料センター「地名・人名・出来事事典」](https://www.jacar.go.jp/dictionary/index.html)  
   人物・地名・出来事の異称、経歴、関連語と資料検索の入口。

## 項目別資料

- [国際子ども図書館「薩長同盟」](https://www.kodomo.go.jp/yareki/theme/theme_04.html)
- [京都国立博物館「坂本龍馬関係書状　木戸孝允書状ほか」](https://knmdb.kyohaku.go.jp/482.html)
- [国立国会図書館「近代日本人の肖像・西郷隆盛」](https://www.ndl.go.jp/portrait/datas/85/index.html)
- [国立国会図書館「近代日本人の肖像・勝海舟」](https://www.ndl.go.jp/portrait/datas/51/index.html)
- [東京都立図書館「勝海舟書簡　山岡鉄舟あて」](https://archive.library.metro.tokyo.lg.jp/da/detail?tilcod=0000000017-00040922)
- [墨田区「勝海舟　幕末・明治を生きた巨人」](https://www.city.sumida.lg.jp/sisetu_info/siryou/kyoudobunka/sonota/tenzi/h15/kikakuten_katukaisyuu.html)

## 情報の分類

- **事実**: 日付、役職、所属、条約、戦闘結果など。
- **位置づけ**: その時点で人物や勢力がなぜ重要だったかを、前後の事件から要約。
- **関係**: 主従、登用、政治協力、対立、師弟、組織、交渉、親族に分類。
- **解釈を避ける領域**: 心情、密約の真意、単独の「維新の功労者」評価など。

## 日付

幕末期の日本では旧暦が使用されていました。表示では、広く定着している旧暦日付を先に置き、括弧内へ換算後の西暦日付を示す場合があります。期間をまとめた場面では月または季節単位で表示しています。

## 名前

人物は一つのIDで管理し、時点ごとに当時の通称・名乗りを表示します。例:

- 大久保正助 → 大久保一蔵 → 大久保利通
- 桂小五郎 → 木戸孝允
- 川路正之進 → 川路利良
- 伊藤俊輔 → 伊藤博文

検索ではいずれの名前でも同一人物へ到達します。

## 地図

地理形状は Natural Earth の低解像度データを使用しています。人物の関連地と事件地点を示しますが、藩境、支配範囲、軍隊の正確な進路、特定日の人物所在地は示しません。

## 今後の校正候補

- 各人物の役職就任月日の細分化
- 諸藩内の派閥・役職・家格の追加
- 戊辰戦争の各戦線・諸隊の追加
- 女性、公家、幕臣、外国外交官の人物追加
- 史料番号・専門研究文献の項目別付与

## 現在の校正状態

人物概要と主要事件には出典IDを登録しています。人物の時点別状態、勢力状態、人物・勢力関係、地点は、項目単位の根拠を確認しながら `needs_review` から `verified` へ移行する段階です。

件数は次のコマンドで確認できます。

```sh
npm run report:review
```

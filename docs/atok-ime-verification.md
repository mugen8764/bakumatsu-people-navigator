# Issue #35: Windows ATOKのイベント境界確認

対象は [Issue #35](https://github.com/mugen8764/bakumatsu-people-navigator/issues/35) のATOK互換性です。検索順位・件数・一致理由など、#31の検索契約は変更しません。

## 既知ログで確認できること

着手main: `3bb7b73c665d6f07190a3ca3dae5476355716703`。

`tests/fixtures/firefox-atok-arrowdown.json` はユーザー提供のWindows Firefox + ATOKの部分ログを保持します。未提供の `repeat`、時刻、後続keydownの `code` は補完していません。compositionstartと古いWeb候補選択はテスト用の前提、後続Enter・連続操作は合成した確認操作です。

| イベント | Web候補の選択位置 | 人物選択・画面遷移 |
| --- | --- | --- |
| composition中のProcess / ArrowDown / 229 | 古い選択を維持 | なし |
| beforeinput・input（composition中） | 古い選択を維持 | なし |
| compositionend | 未選択へ解除（activeIndex = -1） | なし |
| 確定input | 未選択 | なし |
| 対応するArrowDown keyup | 未選択 | なし |
| 次のArrowDown / 40 / isComposing=false | 先頭を選択（activeIndex = 0） | なし |
| 追加したEnter（実ログ外の合成操作） | 検索終了 | 木戸孝允へ移動 |

選択位置は `aria-activedescendant` と `aria-selected` から確認します。unitは実controller、E2Eはappに登録されたイベント経路を使います。E2Eは各段階の入力・選択・URL・キャンセル状態を診断添付へ記録します。

このテストの成功は、既知系列の再現と通常操作の維持を意味します。**ATOK候補操作が安全になったことを意味しません。** 後続ArrowDownがまだATOK候補操作の意図であれば、現在もWeb候補へ移ります。

既知ログではkeyup後のArrowDownを、明示的な通常Web操作と区別できません。物理キーのcode追跡・対応keyupまでの保護は、そのkeyup後にある本件の衝突を解決しません。beforeinput/inputにも、その後IME候補が表示されているかを示す情報はありません。Chromeのイベント順は未採取です。

そのため、公開アプリの状態管理は現状を維持し、ログだけから新しい抑止状態を追加しません。一定時間の抑止、毎回のキー消費、UA分岐は、意図の識別根拠がなく通常操作を退行させるため採用しません。

## 最小の追加採取

WindowsのFirefoxとChromeで、それぞれATOKを選び、同じ公開ページを使います。OS・ブラウザー・ATOKの版とページのコンテンツ版を結果に添えます。開発者ツールのConsoleで以下を一度実行し、ページへ戻ってから操作してください。操作途中にConsoleへ移るとblurで境界が変わるため、終了まで検索欄にフォーカスを保ちます。

```js
(() => {
  window.BM_IME_TRACE?.stop();
  const input = document.querySelector('#globalSearch');
  if (!input) throw new Error('検索欄がありません');
  const rows = [];
  const start = performance.now();
  const types = ['keydown', 'keyup', 'compositionstart', 'compositionupdate',
    'compositionend', 'beforeinput', 'input', 'focus', 'blur'];
  const record = event => {
    if (rows.length >= 1500) return;
    rows.push({
      n: rows.length, ms: Math.round((performance.now() - start) * 10) / 10,
      type: event.type, key: event.key ?? null, code: event.code ?? null,
      keyCode: event.keyCode ?? null, repeat: event.repeat ?? null,
      isComposing: event.isComposing ?? null, inputType: event.inputType ?? null,
      data: event.data ?? null, isTrusted: event.isTrusted,
      defaultPrevented: event.defaultPrevented, value: input.value,
      active: input.getAttribute('aria-activedescendant'),
      selected: [...document.querySelectorAll('#searchResults [aria-selected="true"]')].map(x => x.id),
      resultsHidden: document.querySelector('#searchResults').hidden,
      focused: document.activeElement === input, hash: location.hash
    });
  };
  types.forEach(type => input.addEventListener(type, record));
  window.BM_IME_TRACE = {
    rows,
    json: () => JSON.stringify({ browser: navigator.userAgent, rows }, null, 2),
    stop: () => types.forEach(type => input.removeEventListener(type, record))
  };
})();
```

別々の試行として、次を採取します。採取対象の文字列は「かつら」だけにし、個人情報を入力しません。

1. ATOK変換候補操作: 「かつら」を入力し、候補を出してArrowDownを2回、ArrowUp、確定操作を行います。問題が出た各キーを物理的に離したか、候補が表示中だったか、どの行からWeb候補が動いたかを結果に添えます。
2. 通常Web操作への移行: 「かつら」を変換して明示的に確定し、キーを離してから、Web候補を操作する意図でArrowDown・ArrowUp・ArrowDown・Enterを押します。
3. 連続候補操作で問題が出る場合: 問題の操作を繰り返し、押しっぱなしと押し直しを区別して記録します。

試行後にConsoleで `BM_IME_TRACE.stop()`、`BM_IME_TRACE.json()` を実行してJSONを保存します。次の試行では上記を再実行して新しい記録を開始します。採取はアプリのイベントを変更・キャンセルしません。時刻は順序の調査用で、時間によるキー抑止には使いません。

比較する点は、compositionendを起こすキーのcode、対応keyupの有無・順序、その前後のrepeat、確定後も候補操作の意図で発生するkeydownの全フィールド、追加composition/beforeinput/input、Web操作へ移った時とのイベント差です。Firefoxと同じ順序だとChromeへ推定しません。

## 実機の完了条件

| Windows環境 | 確認する内容 | 状態 |
| --- | --- | --- |
| Firefox + ATOK | IME候補の上下・確定でWeb候補が移動・選択されない。明示的な通常操作ではArrowUp/Down・Enterが使える | 未確認・追加ログ待ち |
| Chrome + ATOK | 同上。Chrome自身のイベント列を確認する | 未確認・追加ログ待ち |
| Firefox + MS-IME | 正常だった変換操作と変換終了後のWeb候補操作が維持される | 今回の再確認待ち |
| Chrome + MS-IME | 同上 | 今回の再確認待ち |

合成イベントはOSの候補ウィンドウを再現しません。区別できる追加情報または別の合意済み方針が得られるまで、Issue #35はOpenのままにします。

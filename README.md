# ohyumoku — 大夢木🌲 プロトタイプ正本

「大夢木」プロジェクトの「最初の10分」プロトタイプのソースコード一式です。
ChatGPTとPコン（Perplexity Computer）が同じ実物を直接参照して作業するための共通正本として、このリポジトリを利用します。

## 体験の概要

一本の連続したタップ体験として構成しています。

```
WHITE CANVAS
↓
ユーザーが「欲しい」と思うものが現れる
↓
触る
↓
LOCK（静寂のあと、初めて問いが現れる）
↓
ユーザーが回答・行動する
↓
UNLOCK
↓
実際に何かをGETする
↓
世界そのものが変化する
↓
初めて🌱が生まれる
```

53、守破離、F、Freedom Creator、全体マップ、進捗率などの裏側の仕組みは、この体験の中でユーザーには一切見せません。

完成条件は「初見の人が、誰にも言われず自分から次を触りたくなること」です。

## ファイル構成

```
index.html      画面構造（Scene 1: WHITE CANVAS / Scene 2: LOCK / Scene 3: UNLOCK）
css/base.css    基本スタイル（トークン・リセット）
css/style.css   このプロトタイプ専用のスタイル・アニメーション
js/app.js       画面遷移・演出（欲望オブジェクトの出現、LOCK、UNLOCK、GET、成長シーケンス、サウンド）
```

ビルド手順は不要です。すべて静的なHTML/CSS/JSのみで動作します。

## ローカルでの確認方法

Node.jsの `serve` などで配信して、ブラウザで開いてください。

```bash
npx serve . -l 3000
```

`http://localhost:3000` を開き、中央の点に触れるところから体験が始まります。

## 公開中のプレビュー

Perplexity Computer上のプレビュー：
https://www.perplexity.ai/computer/a/da-meng-mu-time-tree-zui-chu-n-ujlzB7qqQAazmGCKE1AXaQ

## 運用メモ

- このリポジトリを、ChatGPTとPコンの双方が参照する共通の正本とします。
- 変更を加える際は、既存の世界観（トーン・演出のテンポ・視覚言語）を維持してください。
- 主要な変更後はコミットを行い、変更内容が追跡できる状態を保ってください。

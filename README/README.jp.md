<div align="center">

# <img src="https://raw.githubusercontent.com/vrcx-team/VRCX/master/images/VRCX.ico" width="64" height="64"> </img> VRCXM

**[VRCX](https://github.com/vrcx-team/VRCX) のフォークで、モダンなダークテーマと機能強化を備えています。**

[![GitHub release](https://img.shields.io/github/release/vrcx-team/VRCX.svg)](https://github.com/vrcx-team/VRCX/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/vrcx-team/VRCX/total?color=6451f1)](https://github.com/vrcx-team/VRCX/releases/latest)
[![GitHub Workflow Status](https://github.com/vrcx-team/VRCX/actions/workflows/github_actions.yml/badge.svg)](https://github.com/vrcx-team/VRCX/actions/workflows/github_actions.yml)
[![VRCX Discord Invite](https://img.shields.io/discord/854071236363550763?color=%237289DA&logo=discord&logoColor=white&label=discord)](https://vrcx.app/discord)

| [English](/README.md) |

**注意:** この翻訳は最新ではない可能性があります。最新の情報、特に VRCX からの移行については[英語版](/README.md)をご覧ください。

VRCXM は VRCX のフォークで、VRChat クライアント (デスクトップ & VR) や Web サイト以上に様々な情報を提供し、より便利に VRChat をプレイできるようにするコンパニオンアプリケーションです。このフォークは、元の VRCX と 1:1 の機能を維持しながら、モダンなダークテーマと追加機能を備えた完全な再設計を特徴としています。

# インストール方法

<div align="center">

**注意:** VRCXM はフォークであり、ソースからビルドする必要があります。下記の[ソースからのビルド](#ソースからのビルド)を参照してください。

元の VRCX インストーラー (`VRCX_Setup.exe`) は[こちら](https://github.com/vrcx-team/VRCX/releases/latest)からダウンロードできます。

# 機能

<div align="left">

- :family: フレンド、ワールド、アバターの管理
    - VRChat に入らなくてもフレンドやワールド、グループ、アバターリストを管理することができます。
    - フレンドのワールド/アバターのアクティビティを見たり、オンラインステータスを確認したりできます。
    - いつフレンドになったのか、いつ最後に会ったのか、記録しておきましょう！
    - 一緒に過ごした時間や回数も確認できます。
    - フレンドのユーザーネームの変更も追跡できます。
    - メモを保存して、出会いの記録を残しましょう！
- :electric_plug: VRChat 起動時に一緒にアプリを起動
    - VRChat の起動時に他のアプリを同時起動できるよう設定できます。
    - 例えば、VRChat を起動したら同時に OSC アプリやボイスチェンジャーを起動するようにできます。
- :mag: アバター、ユーザー、ワールド、グループの検索
- :earth_americas: 無制限！ローカル保存のワールドお気に入りリスト
- :camera: ゲーム内で撮った写真にワールドデータを保存することで、半年前に撮影した綺麗なワールドをいつでも振り返ることができます。
- :bell: 通知の監視 & 対応
    - VRCX から招待やフレンドリクエストを送受信したり、受け取った招待先のインスタンス情報を確認することができます。
- :scroll: 現在のインスタンスの情報やプレイヤーリストを確認可能
- :tv: 今いるワールドで再生されている動画やその URL、その他様々なログを確認可能
- :bar_chart: Discord Rich Presence の強化
    - 現在のインスタンス情報などを Discord に表示することができます。
    - PyPyDance、LS Media、Movie and Chill、VR Dancing などの人気ワールドとの連携機能
    - ワールドサムネイル、ワールド名、インスタンス ID、プレイヤー数が表示され、設定やプライベートインスタンスかどうかで表示内容が変わります。  
      また、パブリックインスタンスでは参加ボタンを表示することもできます！
- :crystal_ball: 対応するすべてのイベント/通知のライブフィードを表示/設定可能な VR オーバーレイ
- :outbox_tray: Unity なしでアバター/ワールド画像をアップロード可能
- :page_facing_up: Unity なしでアップロードしたアバター/ワールドの詳細を管理可能
- :skull: VRChat がクラッシュしたときに自動で再起動し、最後にいたインスタンスに自動参加
- :left_right_arrow: お気に入りグループのエクスポート/インポート

## ソースからのビルド

VRCXM はソースからビルドする必要があります。元の VRCX の[ソースからのビルド](https://github.com/vrcx-team/VRCX/wiki/Building-from-source)ガイドを参照してください。ビルドプロセスは VRCX と同じです。

## VRCX からの移行

VRCXM は元の VRCX との競合を避けるために、別のデータフォルダ (`VRCXM`) を使用します。既存の VRCX データ（友達、フィード履歴、お気に入りなど）を VRCXM に移行する場合は、詳細な手順については[英語版の README](/README.md#migrating-from-vrcx) を参照してください。

## VRCX との違い

- **モダンなダークテーマ**: 美しいダークなデザインの完全な視覚的再設計
- **高度なフィードフィルター**: アクティビティフィードの日付範囲フィルタリングと強化されたタグ/タイプフィルター
- **フィードから友達を非表示**: データを追跡し続けながら、特定の友達をアクティビティフィードから非表示にするオプション
- **分析ダッシュボード**: 包括的な分析ページ：
  - アクティビティ分析: ワールド/アバターごとの時間の内訳
  - ソーシャル統計: 最もアクティブな友達のランキング
  - ワールド & アバター分析: 最も訪問されたワールドとアバター使用統計
- **パフォーマンス設定**: フィードとゲームログクエリの設定可能な最大テーブルサイズ
- **別のアプリデータ**: `VRCX` の代わりに `VRCXM` フォルダを使用
- **元の VRCX 機能はすべて保持**: 元のものと 1:1 の機能パリティ

## メンテナー

VRCXM は [naiolune](https://github.com/naiolune) によってメンテナンスされています。

元の VRCX は [pypy](https://github.com/pypy-vrc) と [Natsumi](https://github.com/Natsumi-sama) によって開発されています。

## 元の VRCX リソース

- VRCX の変わった姿を見たい？[テーマ](https://github.com/vrcx-team/VRCX/wiki/Themes)をチェック！
- VRCX をソースからビルドするには[こちらのガイド](https://github.com/vrcx-team/VRCX/wiki/Building-from-source)をご覧ください。
- VRCX を Linux で動かすには[こちらのガイド](https://github.com/vrcx-team/VRCX/wiki/Running-VRCX-on-Linux)をご覧ください。

# Screenshots

<div align="center">

<h3>ログイン</h3>

<table>
  <tr>
    <td align="center"><img src="https://github-production-user-asset-6210df.s3.amazonaws.com/34514603/258306004-32bf7310-222b-45a0-91cc-242a6cb26886.png" alt="login"></td>
    <td align="center"><img src="https://github-production-user-asset-6210df.s3.amazonaws.com/34514603/258306165-85a08a60-a0e0-4e50-b4e0-99c5f4fb5da4.png" alt="2fa"></td>
  </tr>
</table>

<h3>フィード</h3>

<img src="https://github-production-user-asset-6210df.s3.amazonaws.com/34514603/258306317-361a3fcc-a506-4b64-9ad5-d198d81f533a.png" alt="feed">

<h3>ゲームログ</h3>

<img src="https://github-production-user-asset-6210df.s3.amazonaws.com/34514603/258306386-e3ba8511-5afb-40a2-abf6-81ba31387dee.png" alt="gamelog">

<h3>ユーザー情報</h3>

<h4>自分</h4>

<img src="https://github-production-user-asset-6210df.s3.amazonaws.com/34514603/258306511-64a45c0f-96d1-4440-b135-544bc285e096.png" alt="me">

<h4>フレンド</h4>

<img src="https://github-production-user-asset-6210df.s3.amazonaws.com/34514603/258306624-43d7a0ae-8f03-474c-bc60-c3a9b4d6ffb9.png" alt="friend">

<h3>ワールド</h3>

<table>
  <tr>
    <td align="center"><img src="https://github-production-user-asset-6210df.s3.amazonaws.com/34514603/258306691-65eeb2d2-c640-4abb-8d68-fc4d911b9504.png" alt="instance"></td>
    <td align="center"><img src="https://github-production-user-asset-6210df.s3.amazonaws.com/34514603/258306760-c7256775-7b59-419e-bc81-d27a81168d3e.png" alt="info"></td>
  </tr>
</table>

<h3>お気に入り</h3>

<h4>フレンド</h4>

<img src="https://github-production-user-asset-6210df.s3.amazonaws.com/34514603/258306890-1dbe80eb-d4d3-4d5f-a908-41f6c7f225a4.png" alt="friend">

<h4>ワールド</h4>

<img src="https://github-production-user-asset-6210df.s3.amazonaws.com/34514603/258307011-e27b28b3-9f5b-4f5a-9311-e0d1ec8659c6.png" alt="world">

<h4>アバター</h4>

<img src="https://github-production-user-asset-6210df.s3.amazonaws.com/34514603/258307171-5b530698-771a-435c-84fa-9b3ff17bf2dc.png" alt="avatar">

<h3>フレンドログ</h3>

<img src="https://github-production-user-asset-6210df.s3.amazonaws.com/34514603/258307210-a727a0fe-cba8-438d-9c3f-2276d96be9c2.png" alt="friendlog">

<h3>Discord Rich Presence</h3>

<img src="https://github-production-user-asset-6210df.s3.amazonaws.com/82102170/251997318-5a71249c-59fc-4ad6-9194-d6b1d4165600.png" alt="discord">

<!-- The other images will be similar to this -->
</div>

## VRCXM は VRChat の利用規約に違反しますか？

**いいえ。**

VRCXM（VRCX と同様）は VRChat API を使用して機能を提供する外部ツールです。

このツールは API を責任を持って使用して機能を提供しているだけであり、Mod やチートなどのようにゲームを改変するものではありません。

API 使用に関する VRChat の声明は VRChat 公式 Discord サーバーの #faq チャンネルを参照してください。

---

VRCXM は VRChat によって承認されておらず、VRChat または VRChat の開発もしくは管理に公式に関与する者の見解や意見が反映されたものではありません。VRChat および関連するすべての財産は VRChat 株式会社の商標または登録商標です。

VRCXM は [VRCX](https://github.com/vrcx-team/VRCX) のフォークであり、VRCX チームとは関係ありません。

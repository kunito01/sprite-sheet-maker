<div align="center">

<img src="assets/logo.png" alt="Sprite Sheet Maker · Color Inu Games" width="340">

# Sprite Sheet Maker

[English](README.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · **日本語**

**動画・GIF・画像列**を、ゲームですぐ使える**スプライトシート**にブラウザだけで変換。依存ゼロ・ビルド不要・アプリとしてインストール可能。

[![▶ ライブデモ](https://img.shields.io/badge/▶_ライブデモ-FF0099?style=for-the-badge)](https://kunito01.github.io/sprite-sheet-maker/)

[![Stars](https://img.shields.io/github/stars/kunito01/sprite-sheet-maker?style=flat-square)](https://github.com/kunito01/sprite-sheet-maker/stargazers)
[![Forks](https://img.shields.io/github/forks/kunito01/sprite-sheet-maker?style=flat-square)](https://github.com/kunito01/sprite-sheet-maker/network/members)
[![Issues](https://img.shields.io/github/issues/kunito01/sprite-sheet-maker?style=flat-square)](https://github.com/kunito01/sprite-sheet-maker/issues)
[![License](https://img.shields.io/github/license/kunito01/sprite-sheet-maker?style=flat-square)](LICENSE)
[![Last commit](https://img.shields.io/github/last-commit/kunito01/sprite-sheet-maker?style=flat-square)](https://github.com/kunito01/sprite-sheet-maker/commits)

![Vanilla JS](https://img.shields.io/badge/Vanilla%20JS-F7DF1E?logo=javascript&logoColor=000&style=flat-square)
![PWA](https://img.shields.io/badge/PWA-5A0FC8?logo=pwa&logoColor=fff&style=flat-square)
![Godot](https://img.shields.io/badge/Godot-478CBF?logo=godotengine&logoColor=fff&style=flat-square)
![Unity](https://img.shields.io/badge/Unity-000?logo=unity&logoColor=fff&style=flat-square)

</div>

## ✨ 特長

- **どんな素材でも** —— **動画**や **GIF** から指定 FPS で抽出、または**画像列**を読み込み（1 枚 = 1 フレーム）。
- **解像度は自由** —— フレームごとの幅/高さを設定すると、シート全体のサイズを自動計算。`contain` / `cover` / `stretch` のフィット方式。
- **フレーム編集** —— クリックで選択、**ドラッグ**または X/Y で微調整、フレーム単位の拡大縮小。`Shift` / `Ctrl`+クリックで**複数選択**、さらに**コピー / 貼り付け / 複製**で抜けを埋めて滑らかなループを作成。
- **背景除去（アルファキー）** —— スポイトまたは四隅の自動採取、許容値 + エッジぼかし + スピル除去。本物のアルファ付き PNG を書き出し。
- **ライブプレビュー** —— アニメ再生、プレビュー FPS 調整、ループ。
- **書き出し** —— スプライトシート **PNG**、**JSON**（TexturePacker 形式）、**Godot** `.tres`、**Unity** `.png.meta`（自動スライス）。
- **PWA** —— Dock / ホーム画面にインストール、オフライン対応。
- **多言語 UI** —— English · 简体中文 · 繁體中文 · 日本語。

## 🚀 使い方

1. **[ライブデモ](https://kunito01.github.io/sprite-sheet-maker/)** を開く（Chrome / Edge 推奨）。
2. 動画 / GIF / 画像をドロップし、**FPS** と **フレームサイズ** を設定して **フレーム抽出**。
3. 整える：フレームを選択、ドラッグで位置合わせ、背景を除去、ループをプレビュー。
4. PNG を **書き出し**（+ JSON / Godot / Unity）。

## 🎮 Godot と Unity

先に PNG を書き出し、その後にエンジン用ファイルを：

- **Godot 4** —— `Godot · SpriteFrames (.tres)` を書き出し、`spritesheet.png` と同じ場所に置き、`.tres` を `AnimatedSprite2D` に割り当て。アニメ名 `default`、速度 = FPS、ループ有効。
- **Unity** —— `Unity · auto-slice (.png.meta)` を書き出し、`spritesheet.png` と一緒に `Assets/` へ。Unity がグリッドを自動スライス（矩形は Unity の左下原点に反転、ピボット中央）。
- **その他エンジン** —— 汎用 **JSON**（TexturePacker、各フレームの `x,y,w,h`）は Phaser / PixiJS / Cocos などで利用可。

## 🌐 ブラウザ対応

- 動画抽出・画像列：すべてのモダンブラウザ。
- GIF のフレームデコード：WebCodecs `ImageDecoder` が必要（Chrome / Edge）。Safari では **画像列** モードに切り替えてください。

## 🛠 ローカル実行

`index.html` を開くだけ。PWA インストール / オフラインには HTTP で配信してください：

```bash
python3 -m http.server 8765
# その後 Chrome / Edge で http://localhost:8765 を開く
```

## 📄 ライセンス

[Apache-2.0](LICENSE) © 2026 Colorinu Games Limited.

---

<div align="center">

**Color Inu Games** が 🩷 を込めて制作 —— コラボのご相談は <a href="mailto:kunito.world@icloud.com">kunito.world@icloud.com</a>

</div>

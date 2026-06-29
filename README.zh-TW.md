<div align="center">

<img src="assets/logo.png" alt="精靈圖製作器 · Color Inu Games" width="340">

# Sprite Sheet Maker · 精靈圖製作器

[English](README.md) · [简体中文](README.zh-CN.md) · **繁體中文** · [日本語](README.ja.md)

在瀏覽器裡把 **影片 / GIF / 圖片序列** 製作成可直接用於遊戲的 **精靈圖**。零相依、免建置，可安裝為 App。

[![▶ 線上體驗](https://img.shields.io/badge/▶_線上體驗-FF0099?style=for-the-badge)](https://kunito01.github.io/sprite-sheet-maker/)

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

## ✨ 功能

- **任意素材** —— 從 **影片** 或 **GIF** 按指定 FPS 抽幀，或匯入 **圖片序列**（每張 = 一幀）。
- **自訂解析度** —— 設定每幀寬/高，整張精靈圖尺寸自動算出；支援 `contain` / `cover` / `stretch` 三種縮放。
- **逐幀編輯** —— 點擊選中，**拖曳**或填 X/Y 微調，按幀縮放。`Shift` / `Ctrl`+點擊**多選**，並可**複製 / 貼上 / 重複**來補幀、做平滑循環。
- **去背景（Alpha 去背）** —— 吸管取色或四角自動採樣，容差 + 邊緣柔化 + 去色溢出。匯出帶真實 Alpha 通道的 PNG。
- **即時預覽** —— 播放動畫、可調預覽 FPS、循環。
- **匯出** —— 精靈圖 **PNG**、**JSON**（TexturePacker 格式）、**Godot** `.tres`、**Unity** `.png.meta`（自動切片）。
- **PWA** —— 可安裝到程式塢 / 桌面，離線可用。
- **多語言介面** —— English · 简体中文 · 繁體中文 · 日本語。

## 🚀 怎麼用

1. 開啟 **[線上體驗](https://kunito01.github.io/sprite-sheet-maker/)**（建議 Chrome / Edge）。
2. 拖入影片 / GIF / 圖片，設好 **FPS** 與 **每幀尺寸**，點 **抽幀生成**。
3. 整理：選中幀、拖曳對齊、去掉背景、預覽循環。
4. **匯出** PNG（+ JSON / Godot / Unity）。

## 🎮 Godot 與 Unity

先匯出 PNG，再匯出引擎檔：

- **Godot 4** —— 匯出 `Godot · SpriteFrames (.tres)`，與 `spritesheet.png` 放一起，把 `.tres` 指給 `AnimatedSprite2D`。動畫名 `default`，速度 = 你的 FPS，已開循環。
- **Unity** —— 匯出 `Unity · 自動切片 (.png.meta)`，與 `spritesheet.png` 同目錄放進 `Assets/`，Unity 會自動按網格切片（座標已翻轉到左下原點，pivot 置中）。
- **其它引擎** —— 通用 **JSON**（TexturePacker，含每幀 `x,y,w,h`）可供 Phaser / PixiJS / Cocos 等使用。

## 🌐 瀏覽器支援

- 影片抽幀、圖片序列：所有現代瀏覽器。
- GIF 逐幀解碼：依賴 WebCodecs `ImageDecoder`（Chrome / Edge）；Safari 不支援時請改用 **圖片序列** 模式。

## 🛠 本機執行

直接雙擊 `index.html` 即可。要啟用 PWA 安裝 / 離線，請用 HTTP 伺服器：

```bash
python3 -m http.server 8765
# 然後用 Chrome / Edge 開啟 http://localhost:8765
```

## 📄 授權

[Apache-2.0](LICENSE) © 2026 Colorinu Games Limited.

---

<div align="center">

由 **Color Inu Games** 用 🩷 製作 —— 合作請聯絡 <a href="mailto:kunito.world@icloud.com">kunito.world@icloud.com</a>

</div>

<div align="center">

<img src="assets/logo.png" alt="Sprite Sheet Maker · Color Inu Games" width="340">

# Sprite Sheet Maker

**English** · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md)

Turn a **video, GIF, or image sequence** into a game-ready **sprite sheet** — right in your browser. Zero dependencies, no build, installable as an app.

[![▶ Live Demo](https://img.shields.io/badge/▶_Live_Demo-FF0099?style=for-the-badge)](https://kunito01.github.io/sprite-sheet-maker/)

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

## ✨ Features

- **Any source** — extract frames from a **video** or **GIF** at a chosen FPS, or import an **image sequence** (one image per frame).
- **Your resolution** — set per-frame width/height; the full sheet size is computed for you. `contain` / `cover` / `stretch` fit modes.
- **Per-frame editing** — click to select, **drag** or type X/Y to nudge, scale per frame. **Multi-select** with `Shift` / `Ctrl`-click, plus **copy / paste / duplicate** to fill gaps and build clean loops.
- **Background removal (alpha key)** — eyedropper or corner auto-sample, tolerance + edge softness + despill. Export PNGs with a real alpha channel.
- **Live preview** — play the animation, adjustable preview FPS, loop.
- **Exports** — sprite sheet **PNG**, **JSON** (TexturePacker hash), **Godot** `.tres`, and **Unity** `.png.meta` (grid auto-slice).
- **PWA** — install to your dock / home screen, works offline.
- **Multilingual UI** — English · 简体中文 · 繁體中文 · 日本語.

## 🚀 Use it

1. Open the **[live demo](https://kunito01.github.io/sprite-sheet-maker/)** (Chrome / Edge recommended).
2. Drop a video / GIF / images, set **FPS** and **frame size**, click **Extract frames**.
3. Tidy up: select frames, drag to align, remove the background, preview the loop.
4. **Export** the PNG (+ JSON / Godot / Unity).

## 🎮 Godot & Unity

Export the PNG first, then the engine file:

- **Godot 4** — export `Godot · SpriteFrames (.tres)`, drop it next to `spritesheet.png`, assign the `.tres` to an `AnimatedSprite2D`. Animation `default`, speed = your FPS, looping on.
- **Unity** — export `Unity · auto-slice (.png.meta)`, put it beside `spritesheet.png` in `Assets/`; Unity slices the grid automatically (rects flipped to Unity's bottom-left origin, centered pivot).
- **Other engines** — the generic **JSON** (TexturePacker hash, `x,y,w,h` per frame) works with Phaser / PixiJS / Cocos, etc.

## 🌐 Browser support

- Video extraction & image sequences: all modern browsers.
- GIF frame decode: needs WebCodecs `ImageDecoder` (Chrome / Edge); Safari falls back to the **Images** mode.

## 🛠 Run locally

Just open `index.html`. For PWA install / offline, serve it over HTTP:

```bash
python3 -m http.server 8765
# then open http://localhost:8765 in Chrome / Edge
```

## 📄 License

[Apache-2.0](LICENSE) © 2026 Colorinu Games Limited.

---

<div align="center">

Made with 🩷 by **Color Inu Games** — collaboration? <a href="mailto:kunito.world@icloud.com">kunito.world@icloud.com</a>

</div>

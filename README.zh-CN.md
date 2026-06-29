<div align="center">

<img src="assets/logo.png" alt="精灵图制作器 · Color Inu Games" width="340">

# Sprite Sheet Maker · 精灵图制作器

[English](README.md) · **简体中文** · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md)

在浏览器里把 **视频 / GIF / 图片序列** 做成可直接用于游戏的 **精灵图**。零依赖、无需构建，可安装为 App。

[![▶ 在线体验](https://img.shields.io/badge/▶_在线体验-FF0099?style=for-the-badge)](https://kunito01.github.io/sprite-sheet-maker/)

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

- **任意素材** —— 从 **视频** 或 **GIF** 按指定 FPS 抽帧，或导入 **图片序列**（每张 = 一帧）。
- **自定分辨率** —— 设定每帧宽/高，整张精灵图尺寸自动算出；支持 `contain` / `cover` / `stretch` 三种缩放。
- **逐帧编辑** —— 点击选中，**拖拽**或填 X/Y 微调，按帧缩放。`Shift` / `Ctrl`+点击**多选**，并可**复制 / 粘贴 / 重复**来补帧、做平滑循环。
- **去背景（Alpha 抠像）** —— 吸管取色或四角自动采样，容差 + 边缘柔化 + 去色溢出。导出带真实 Alpha 通道的 PNG。
- **实时预览** —— 播放动画、可调预览 FPS、循环。
- **导出** —— 精灵图 **PNG**、**JSON**（TexturePacker 格式）、**Godot** `.tres`、**Unity** `.png.meta`（自动切片）。
- **PWA** —— 可安装到程序坞 / 桌面，离线可用。
- **多语言界面** —— English · 简体中文 · 繁體中文 · 日本語。

## 🚀 怎么用

1. 打开 **[在线体验](https://kunito01.github.io/sprite-sheet-maker/)**（建议 Chrome / Edge）。
2. 拖入视频 / GIF / 图片，设好 **FPS** 和 **每帧尺寸**，点 **抽帧生成**。
3. 整理：选中帧、拖拽对齐、去掉背景、预览循环。
4. **导出** PNG（+ JSON / Godot / Unity）。

## 🎮 Godot 与 Unity

先导出 PNG，再导出引擎文件：

- **Godot 4** —— 导出 `Godot · SpriteFrames (.tres)`，与 `spritesheet.png` 放一起，把 `.tres` 指给 `AnimatedSprite2D`。动画名 `default`，速度 = 你的 FPS，已开循环。
- **Unity** —— 导出 `Unity · 自动切片 (.png.meta)`，与 `spritesheet.png` 同目录放进 `Assets/`，Unity 会自动按网格切片（坐标已翻转到左下原点，pivot 居中）。
- **其它引擎** —— 通用 **JSON**（TexturePacker，含每帧 `x,y,w,h`）可供 Phaser / PixiJS / Cocos 等使用。

## 🌐 浏览器支持

- 视频抽帧、图片序列：所有现代浏览器。
- GIF 逐帧解码：依赖 WebCodecs `ImageDecoder`（Chrome / Edge）；Safari 不支持时请改用 **图片序列** 模式。

## 🛠 本地运行

直接双击 `index.html` 即可。要启用 PWA 安装 / 离线，请用 HTTP 服务器：

```bash
python3 -m http.server 8765
# 然后用 Chrome / Edge 打开 http://localhost:8765
```

## 📄 许可证

[Apache-2.0](LICENSE) © 2026 Colorinu Games Limited.

---

<div align="center">

由 **Color Inu Games** 用 🩷 制作 —— 合作请联系 <a href="mailto:kunito.world@icloud.com">kunito.world@icloud.com</a>

</div>

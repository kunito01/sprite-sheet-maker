# 精灵图制作器 · Sprite Sheet Maker

一个零依赖的网页应用（PWA），从**视频 / GIF / 图片序列**生成精灵图：可调抽帧率 FPS、每帧分辨率、逐帧位置，并内置动画预览。导出精灵图 PNG + JSON 元数据。

## 功能
- **抽帧率 FPS**：从视频/GIF 按指定 fps 抽帧，可设起止秒与最大帧数上限
- **分辨率**：设定每帧宽×高，自动算出整张精灵图尺寸；contain / cover / stretch 三种缩放
- **逐帧位置调整**：点击画布选中某帧，拖拽或填 X/Y 偏移、帧内缩放；方向键微调 1px；居中 / 复位 / 套用全部 / 前移后移 / 删除
- **执行预览**：播放 / 暂停 / 单步、可调播放 FPS、循环，实时反映逐帧调整
- **导出**：精灵图 PNG + JSON（每帧坐标，TexturePacker 风格）
- **PWA**：可安装到程序坞 / 桌面、独立窗口、离线可用

## 文件结构
```
index.html            页面骨架
styles.css            样式
app.js                全部逻辑（原生 JS，无框架/无构建）
manifest.webmanifest  PWA 清单
sw.js                 Service Worker（离线缓存）
icons/                应用图标 192 / 512 / maskable
```

## 本地运行
直接双击 `index.html` 即可使用（file:// 模式下除「安装/离线」外功能完整）。

要启用 PWA 安装与离线，需用本地服务器：
```bash
cd "Sprite App"
python3 -m http.server 8765
# 浏览器打开 http://localhost:8765 ，用 Chrome/Edge 点地址栏安装图标或页面右上「⬇ 安装应用」
```

## 部署到 GitHub Pages（可选）
在本目录执行（账号需已登录 `gh`）：
```bash
git init && git add -A && git commit -m "Sprite Sheet Maker"
gh repo create sprite-sheet-maker --public --source=. --push
gh api -X POST repos/<user>/sprite-sheet-maker/pages -f source.branch=main -f source.path=/
# 几分钟后访问 https://<user>.github.io/sprite-sheet-maker/
```

## 在 Godot / Unity 中使用

先点「导出精灵图 PNG」拿到 `spritesheet.png`，再按引擎导出对应文件。

### Godot 4
1. 点「Godot · SpriteFrames (.tres)」，得到 `spritesheet.tres`
2. 把 `spritesheet.tres` 和 `spritesheet.png` 一起拖进项目（同目录，PNG 名字保持 `spritesheet.png`）
3. 新建 `AnimatedSprite2D` 节点 → Inspector 的 `Sprite Frames` 选这个 `.tres` → 播放
   - 动画名为 `default`，播放速度 = 你的抽帧率，循环已开

### Unity
1. 点「Unity · 自动切片 (.png.meta)」，得到 `spritesheet.png.meta`
2. 把 `spritesheet.png` 与 `spritesheet.png.meta` 一起放进 `Assets/`（同目录、同名），Unity 会自动按网格切好所有帧
3. 展开该 PNG 即可看到 `spritesheet_0 … spritesheet_N`，拖进场景或做 Animation
   - 坐标已按 Unity 左下原点翻转；pivot 为居中
   - 若某些 Unity 版本未自动切：选中 PNG → Sprite Mode = Multiple → Sprite Editor → Slice → Grid By Cell Count，按界面提示的「网格 列×行」填入即可

### 通用 JSON
TexturePacker（JSON Hash）格式，供 Phaser / PixiJS / Cocos 等使用，含每帧 `x,y,w,h`。

## 浏览器支持
- 视频抽帧、图片序列：所有现代浏览器
- GIF 逐帧解码：依赖 WebCodecs `ImageDecoder`，Chrome / Edge 最佳；Safari 不支持时会提示改用「图片序列」

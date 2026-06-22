# 书签聚合搜索

快捷键弹出 Alfred 式浮层，子串匹配书签的标题与 URL，回车在新标签页打开。

## 安装（未打包加载）

1. 打开 `chrome://extensions/`，右上角开启「开发者模式」。
2. 点「加载已解压的扩展程序」，选择本目录。
3. 默认快捷键 `Cmd+Shift+K`（Mac）/ `Ctrl+Shift+K`（Win/Linux），
   可在 `chrome://extensions/shortcuts` 改键。

## 行为

- 任意普通网页按快捷键弹出/关闭浮层；`chrome://`、商店、PDF 等受限页面静默无反应。
- 输入即过滤：标题命中优先于 URL 命中，最多 50 条。
- `↑/↓` 移动，`Enter` 或点击在新标签页打开，`Esc` 或点击外部关闭。

## 文件

- `manifest.json` — MV3 声明、快捷键、权限。
- `background.js` — service worker：快捷键、读书签、开标签页。
- `content.js` — 注入页面的浮层 UI 与搜索逻辑（Shadow DOM 隔离）。

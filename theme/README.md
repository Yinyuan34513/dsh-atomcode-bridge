# AtomCode Web UI 主题包

让 DeepSeek Harness 的 Web GUI 看起来像 [AtomCode](https://atomgit.com/atomgit_atomcode/atomcode) 的 Web UI：

- **陶土橙 clay 品牌色 `#d97757`**（非紫色 —— app.tsx 注释是过时的，真实值在 `theme.css`）
- **暖象牙白浅色**（`#faf9f5` 纸面）+ **暖炭黑深色**（`#262624`）
- sans 正文 / mono 代码 / serif 展示字体栈、细滚动条、clay 选区
- 保留左上角 logo；不改模型列表

## 使用

`atomcode-theme.js` 是一段动态 Cordis **客户端**插件代码（`code.client`）：

1. 在 DeepSeek Harness 会话里用 `cordis_define` 把它作为 `code.client` 定义
2. `cordis_run` 后，在 Run 卡片上点 ✓ 允许客户端代码注入
3. 打开「设置 → 外观」，主题列表会多出 **AtomCode**（深）与 **AtomCode Light**（浅），选择即生效

## 调色板（源自 atomcode/webui/src/styles/theme.css）

| 语义 | 深 | 浅 |
|---|---|---|
| 背景 | `#262624` | `#faf9f5` |
| 浮层/输入 | `#30302e` | `#ffffff` |
| 次级表面 | `#1f1e1d` | `#f0eee6` |
| 边框 | `#393633` / `#413f3b` | `#eae6db` / `#e6e2d6` |
| 品牌 | `#d97757` | `#d97757` |
| 主文字 | `#e8e6df` | `#1f1e1d` |
| 次文字 | `#b0ada4` | `#6b6a63` |
| 成功/错误/警告 | `#74c991` / `#f14c4c` / `#e5a54b` | 同左 |

// AtomCode Web UI 主题包 —— DeepSeek Harness 动态 Cordis 客户端插件（code.client）。
//
// 真实调色板取自 atomcode/webui/src/styles/theme.css：
//   品牌色 = Claude "clay" 陶土橙 #d97757（按钮 #c2613f）
//   深色 = 暖炭黑  #262624 / #1f1e1d / #30302e，前景 #e8e6df / #b0ada4
//   浅色 = 暖象牙白 #faf9f5 / #f0eee6 / #ffffff，前景 #1f1e1d / #6b6a63
//   成功 #74c991 · 错误 #f14c4c · 警告 #e5a54b
//
// 用法：在 DeepSeek Harness 里用 cordis_define 把本文件内容作为 code.client
// 定义并 cordis_run；批准后主题出现在「外观」里（AtomCode / AtomCode Light）。
// 只覆盖颜色 token 与字体/滚动条样式 —— 不碰左上角 logo、不碰模型列表。
return {
  name: 'atomcode-theme',
  apply(ctx) {
    const theme = ctx.get('theme')
    if (theme === undefined) return

    const DARK = {
      '--dsw-alias-bg-base': '#262624',
      '--dsw-alias-bg-layer-1': '#30302e',
      '--dsw-alias-bg-layer-2': '#1f1e1d',
      '--dsw-alias-bg-overlay': '#30302e',
      '--dsw-alias-border-l1': '#393633',
      '--dsw-alias-border-l2': '#413f3b',
      '--dsw-alias-brand-primary': '#d97757',
      '--dsw-alias-label-primary': '#e8e6df',
      '--dsw-alias-label-secondary': '#b0ada4',
      '--dsw-alias-state-error-primary': '#f14c4c',
      '--dsw-alias-state-success-primary': '#74c991',
      '--dsw-alias-state-warn-primary': '#e5a54b',
      '--dsw-specific-sidebar-fill': '#1f1e1d',
    }
    const LIGHT = {
      '--dsw-alias-bg-base': '#faf9f5',
      '--dsw-alias-bg-layer-1': '#ffffff',
      '--dsw-alias-bg-layer-2': '#f0eee6',
      '--dsw-alias-bg-overlay': '#ffffff',
      '--dsw-alias-border-l1': '#eae6db',
      '--dsw-alias-border-l2': '#e6e2d6',
      '--dsw-alias-brand-primary': '#d97757',
      '--dsw-alias-label-primary': '#1f1e1d',
      '--dsw-alias-label-secondary': '#6b6a63',
      '--dsw-alias-state-error-primary': '#f14c4c',
      '--dsw-alias-state-success-primary': '#74c991',
      '--dsw-alias-state-warn-primary': '#e5a54b',
      '--dsw-specific-sidebar-fill': '#f0eee6',
    }

    const disposeDark = theme.register({ id: 'atomcode-dark', colorScheme: 'dark', tokens: DARK })
    const disposeLight = theme.register({ id: 'atomcode-light', colorScheme: 'light', tokens: LIGHT })
    ctx.effect(() => { disposeDark(); disposeLight() })

    const slots = ctx.get('slots')
    if (slots !== undefined) {
      const CSS = [
        "body{font-family:ui-sans-serif,-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif}",
        "code,pre{font-family:ui-monospace,'SFMono-Regular','Menlo','Monaco','Courier New',monospace}",
        '::selection{background:rgba(217,119,87,.32)}',
        '*{scrollbar-width:thin;scrollbar-color:color-mix(in srgb,var(--dsw-alias-label-secondary) 55%,transparent) transparent}',
      ].join('\n')
      const disposeSlot = slots.inject('shell.overlay', () => slots.register(
        { name: 'shell.overlay', id: 'atomcode-theme-styles', order: -1000 },
        () => React.createElement('style', null, CSS),
      ))
      ctx.effect(() => disposeSlot)
    }
  },
}

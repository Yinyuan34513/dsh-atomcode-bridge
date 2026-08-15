# dsh-atomcode-bridge

DeepSeek Harness (DSH) 的 **AtomCode 桥接插件** —— 以 agent preset 形式分发。

把 [AtomCode](https://atomgit.com/atomgit_atomcode/atomcode)（终端 AI 编程助手，官方二进制 +
默认配置模型）**注册为 DSH 的模型提供商**：会话模型选 ATOMCODE 后，DSH 的每一次模型调用都
经本机 AtomCode daemon 的 `POST /chat`（SSE）流式执行，回复（text/reasoning/usage/finish）
原样返回对话。

## 能力

1. **真正的模型提供商（LlmAdapter）**
   - provider 路由：`atomcode`；模型：`atomcode-default`（AtomCode 配置里的默认模型）
   - 自动探测 / 拉起 daemon（`atomcode daemon --port 13459`）
   - 从 `~/.atomcode/daemon-13459.json` 读取 daemon token 鉴权
   - `approval_mode: bypass`，无人值守自动放行工具调用
   - 流式映射：`text` → text-delta、`reasoning` → reasoning-delta、
     `tokens` → usage、`done` → finish(stop)
2. **`atomcode_ask` 模型工具** —— 把单条消息转发给 daemon 并取回完整回复
   （`reply` / `session_id` / `tokens` / `tool_calls` / `stop_reason`）
3. **模型设置页的 ATOMCODE 提供方条目** —— 设置 schema 不含 API 密钥字段，
   密钥输入灰置、无需填写（网关签名由官方二进制内置，登录态走 `~/.atomcode`）

## 要求

- DeepSeek Harness（本 preset 基于 `cordis` 预设复制而来，包含其全部能力）
- **官方** AtomCode 二进制（`atomcode` CLI，v5.x），安装于 `~/.local/bin/atomcode`
  - 源码构建的二进制没有 AtomGit 网关签名，无法使用默认配置的网关模型
- AtomCode 已完成登录（`~/.atomcode/auth.toml`），默认模型可用
- daemon 端口 `13459` 可用（与 TUI 的 `13456` 互不干扰）

## 安装

```bash
mkdir -p ~/.dsh/.agent-presets
cp -r <本仓库> ~/.dsh/.agent-presets/atomcode
```

重启 DeepSeek Harness 后，新建会话时选择 **"AtomCode 桥接"** 预设。

## 使用

**方式一：直接把 ATOMCODE 选为会话模型（彻底接管）**

模型设置 → 提供方列表选 **ATOMCODE**（密钥灰置）→ 模型选 **AtomCode 默认模型**。
之后该会话的所有推理都走 AtomCode daemon。

**方式二：对话里喊 AI 转发**

> 帮我问 AtomCode：介绍一下你自己

AI 会调用 `atomcode_ask` 把这句话转发给 daemon，取回完整回复后转达。

## 结构

```
agent.cordis.yml          # preset 组合（cordis 预设副本 + plugin-atomcode-bridge 行）
preset.yml                # 显示名与描述
plugins/atomcode-bridge.mjs  # 插件本体（LlmAdapter + atomcode_ask + ATOMCODE 提供方条目）
skills/                   # 随 preset 分发的创作技能（自引用工具集需要）
```

## 许可

MIT。基于 DeepSeek Harness 的 `cordis` agent preset 复制修改。

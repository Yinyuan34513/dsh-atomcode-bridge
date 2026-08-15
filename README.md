# dsh-atomcode-bridge

DeepSeek Harness (DSH) 的 **AtomCode 桥接插件** —— 以 agent preset 形式分发。

在 DeepSeek 里喊 AI，AI 通过 `atomcode_ask` 工具把消息转发给本机
[AtomCode](https://atomgit.com/atomgit_atomcode/atomcode)（终端 AI 编程助手）官方二进制的
daemon 模式 `POST /chat`（SSE）接口执行，等待整个回合完成后把回复原样转达回对话。

## 能力

1. **`atomcode_ask` 模型工具**
   - 自动探测 / 拉起 daemon（`atomcode daemon --port 13459`）
   - 从 `~/.atomcode/daemon-13459.json` 读取 daemon token 鉴权
   - `approval_mode: bypass`，无人值守自动放行工具调用
   - 返回 `{ reply, session_id, tokens, tool_calls, stop_reason, ... }`
   - 参数：`provider` / `session_id`（续聊）/ `working_dir` / `timeout_secs` / `daemon_url`
2. **模型设置页的 ATOMCODE 提供方条目**
   - 设置 schema 不含 API 密钥字段 —— 密钥输入灰置，无需填写
   - 模型路由本身由 AtomCode 的默认配置决定（AtomGit 网关，官方二进制内置网关签名）

## 要求

- DeepSeek Harness（本 preset 基于 `cordis` 预设复制而来，包含其全部能力）
- **官方** AtomCode 二进制（`atomcode` CLI，v5.x），安装于 `~/.local/bin/atomcode`
  - 源码构建的二进制没有 AtomGit 网关签名，无法使用默认配置的网关模型
- AtomCode 已完成登录（`~/.atomcode/auth.toml`），默认模型可用

## 安装

```bash
mkdir -p ~/.dsh/.agent-presets
cp -r <本仓库> ~/.dsh/.agent-presets/atomcode
```

重启 DeepSeek Harness 后，新建会话时选择 **"AtomCode 桥接"** 预设。

## 使用

直接在对话里喊 AI，例如：

> 帮我问 AtomCode：介绍一下你自己

AI 会调用 `atomcode_ask` 把这句话转发给 daemon，取回完整回复后转达给你。

## 结构

```
agent.cordis.yml          # preset 组合（cordis 预设副本 + plugin-atomcode-bridge 行）
preset.yml                # 显示名与描述
plugins/atomcode-bridge.mjs  # 插件本体（工具 + ATOMCODE 提供方条目）
skills/                   # 随 preset 分发的创作技能（自引用工具集需要）
```

## 许可

MIT。基于 DeepSeek Harness 的 `cordis` agent preset 复制修改。

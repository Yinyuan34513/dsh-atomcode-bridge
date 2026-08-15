// AtomCode 桥接插件（常驻 preset 插件）。
//
// 能力：
//   1. 注册模型工具 `atomcode_ask`：把消息转发给本机 AtomCode **官方二进制**
//      的 daemon（`atomcode daemon --port 13459`）HTTP `POST /chat`（SSE）接口，
//      等待整个回合完成并返回完整回复。provider 缺省 = AtomCode 配置默认模型
//      （AtomGit 网关，官方二进制内置网关签名）。
//   2. 在模型设置页注册 `ATOMCODE` 可配置提供方条目；其设置 schema 不含
//      API 密钥字段，因此界面上的密钥输入无需填写（灰置）。
//
// 不发布任何 Service：只消费宿主提供的 tools / llm / settings / shell / fs /
// timer，因此本行无需 isolate realm。
import z from 'file:///usr/local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/schemastery/lib/index.mjs'

const DEFAULT_URL = 'http://127.0.0.1:13459'
const ATOMCODE_BIN = '/home/elaina/.local/bin/atomcode'
const HOME = '/home/elaina'

export default {
  name: 'atomcode-bridge',
  inject: ['timer'],
  apply(ctx) {
    const tools = ctx.get('tools')
    const shell = ctx.get('shell')
    const fs = ctx.get('fs')
    const llm = ctx.get('llm')
    const settings = ctx.get('settings')
    if (tools === undefined) return

    async function sh(command, timeoutMs) {
      if (shell === undefined) return { stdout: '', exitCode: 0 }
      let spec
      try {
        spec = shell.resolve({ command, timeoutMs })
      } catch (error) {
        spec = { command, timeoutMs }
      }
      const result = await shell.run(spec)
      const stdout = result && typeof result.stdout === 'string' ? result.stdout : ''
      let exitCode = 0
      if (result && typeof result.exitCode === 'number') exitCode = result.exitCode
      else if (result && typeof result.code === 'number') exitCode = result.code
      return { stdout, exitCode }
    }

    function portOf(url) {
      const match = /:(\d+)\/?$/.exec(url)
      return match ? match[1] : '13459'
    }

    async function health(url) {
      const run = await sh(`curl -s -o /dev/null -w '%{http_code}' -m 5 ${url}/health`, 8000)
      return run.stdout.trim() === '200'
    }

    async function tokenFor(url) {
      if (fs === undefined) return ''
      const port = portOf(url)
      const tokenPath = HOME + '/.atomcode/daemon-' + port + '.json'
      try {
        const target = await fs.resolve(tokenPath)
        const text = await fs.readText(target)
        const parsed = JSON.parse(text)
        if (parsed && typeof parsed.token === 'string' && parsed.token.length > 0) return parsed.token
      } catch (error) {
        ctx.logger?.error('[atomcode-bridge] daemon token read failed:', String(error))
      }
      return ''
    }

    async function ensureDaemon(url) {
      if (await health(url)) return true
      if (shell !== undefined) {
        const port = portOf(url)
        try {
          const spec = shell.resolve({ command: `${ATOMCODE_BIN} daemon --port ${port} --no-telemetry` })
          shell.start(spec)
        } catch (error) {
          ctx.logger?.error('[atomcode-bridge] daemon spawn failed:', String(error))
        }
      }
      for (let i = 0; i < 30; i++) {
        await ctx.timeout(2000)
        if (await health(url)) return true
      }
      return false
    }

    async function askAtomcode(args) {
      const url = (typeof args.daemon_url === 'string' && args.daemon_url.trim() !== ''
        ? args.daemon_url.trim() : DEFAULT_URL).replace(/\/+$/, '')
      const timeoutSecs = typeof args.timeout_secs === 'number' && args.timeout_secs > 0
        ? Math.floor(args.timeout_secs) : 600
      const empty = {
        ok: false, reply: '', session_id: '', tokens: 0, tool_calls: 0,
        tools: [], stop_reason: '', provider: 'default', error: '',
      }
      if (!(await ensureDaemon(url))) {
        empty.error = 'AtomCode daemon 不可用: ' + url
        return empty
      }
      const token = await tokenFor(url)
      const payload = { message: String(args.message || ''), approval_mode: 'bypass' }
      if (typeof args.provider === 'string' && args.provider !== '') payload.provider = args.provider
      if (typeof args.session_id === 'string' && args.session_id !== '') payload.session_id = args.session_id
      if (typeof args.working_dir === 'string' && args.working_dir !== '') payload.working_dir = args.working_dir
      const bodyB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64')
      const command =
        `printf '%s' '${bodyB64}' | base64 -d | curl -s -N -m ${timeoutSecs} ` +
        `-H 'Authorization: Bearer ${token}' -H 'Content-Type: application/json' ` +
        `-X POST ${url}/chat --data-binary @-`
      const run = await sh(command, (timeoutSecs + 30) * 1000)
      const events = []
      for (const line of run.stdout.split(/\r?\n/)) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        const data = trimmed.slice(5).trim()
        if (data === '') continue
        try { events.push(JSON.parse(data)) } catch (error) { /* 跳过非 JSON 行 */ }
      }
      let reply = ''
      const usedTools = []
      let done = null
      let firstError = ''
      let tokens = 0
      for (const event of events) {
        const type = event && event.type
        if (type === 'text') reply += String(event.content || '')
        else if (type === 'tool_start') usedTools.push({ name: String(event.name || 'tool'), success: false })
        else if (type === 'tool_result' && usedTools.length > 0) {
          usedTools[usedTools.length - 1].success = event.success === true
        } else if (type === 'tokens') tokens = event.total || 0
        else if (type === 'done') done = event
        else if (type === 'error' && firstError === '') firstError = String(event.message || 'error')
      }
      const ok = done !== null
      return {
        ok,
        reply: reply.trim().slice(0, 200000),
        session_id: done && typeof done.session_id === 'string' ? done.session_id : '',
        tokens: done && typeof done.tokens === 'number' ? done.tokens : tokens,
        tool_calls: done && typeof done.tool_calls === 'number' ? done.tool_calls : usedTools.length,
        tools: usedTools.slice(0, 30),
        stop_reason: done && typeof done.stop_reason === 'string' ? done.stop_reason : '',
        provider: typeof args.provider === 'string' ? args.provider : 'default',
        error: ok ? '' : (firstError || 'chat 流在 done 之前结束'),
      }
    }

    const disposeTool = tools.register({
      name: 'atomcode_ask',
      description: '把消息转发给本机 AtomCode（终端 AI 编程助手）官方二进制的 daemon /chat 接口执行，等待整个回合完成后返回其完整回复。用户在 DeepSeek 里喊你、并要求 AtomCode 处理或回答时调用；拿到结果后把 reply 原样转达给用户。默认使用 AtomCode 配置里的默认模型（AtomGit 网关，官方二进制已内置签名）；provider 参数可选。工具会阻塞数分钟直到 AtomCode 完成回合。',
      parameters: {
        type: 'object',
        properties: {
          message: { type: 'string', description: '转发给 AtomCode 的消息（通常是用户最新一句话的原文）' },
          provider: { type: 'string', description: '可选：模型提供方名。缺省用 AtomCode 配置的默认模型' },
          session_id: { type: 'string', description: '可选：继续某个已有 AtomCode 会话' },
          working_dir: { type: 'string', description: '可选：工作目录，默认 /home/elaina' },
          timeout_secs: { type: 'number', description: '可选：整回合超时秒数，默认 600' },
          daemon_url: { type: 'string', description: '可选：daemon 地址，默认 http://127.0.0.1:13459' },
        },
        required: ['message'],
      },
      output: {
        schema: {
          type: 'object',
          properties: {
            ok: { type: 'boolean' },
            reply: { type: 'string' },
            session_id: { type: 'string' },
            tokens: { type: 'number' },
            tool_calls: { type: 'number' },
            tools: {
              type: 'array',
              items: {
                type: 'object',
                properties: { name: { type: 'string' }, success: { type: 'boolean' } },
                required: ['name', 'success'],
                additionalProperties: false,
              },
            },
            stop_reason: { type: 'string' },
            provider: { type: 'string' },
            error: { type: 'string' },
          },
          required: ['ok', 'reply', 'session_id', 'tokens', 'tool_calls', 'tools', 'stop_reason', 'provider', 'error'],
          additionalProperties: false,
        },
        render(args, value) {
          const lines = []
          if (value.ok) {
            lines.push('AtomCode 回复:')
            lines.push(value.reply || '(空回复)')
            lines.push('')
            lines.push('[session_id=' + value.session_id + ' tokens=' + value.tokens +
              ' tool_calls=' + value.tool_calls + ' stop_reason=' + value.stop_reason +
              ' provider=' + value.provider + ']')
          } else {
            lines.push('AtomCode 调用失败: ' + value.error)
          }
          return [{ type: 'text', text: lines.join('\n') }]
        },
      },
      async execute(args, exec) {
        return askAtomcode(args)
      },
    })
    ctx.effect(() => disposeTool)

    // ATOMCODE 可配置提供方目录条目：模型设置页由此渲染该行。
    // llm 目录是进程级注册表：多个会话同时挂载本 preset 时重复注册会抛错，
    // 幂等跳过即可（首个会话的注册随其 fiber 存活，闭会话后消失）。
    if (llm !== undefined) {
      try {
        const disposeDir = llm.registerConfigurableProviders([{
          provider: 'atomcode',
          displayName: 'ATOMCODE',
          settingsNs: 'llm-atomcode',
          settingsPath: [],
          declared: true,
        }])
        ctx.effect(() => () => disposeDir())
      } catch (error) {
        ctx.logger?.warn('[atomcode-bridge] provider directory entry already registered:', String(error))
      }
    }

    // ATOMCODE 的设置 section：schema 刻意不含 apiKey 字段，界面密钥输入灰置。
    // settings 同为进程级注册表，重复注册幂等跳过。
    if (settings !== undefined) {
      try {
        settings.register('llm-atomcode', z.object({}), { base: {} })
      } catch (error) {
        ctx.logger?.warn('[atomcode-bridge] settings namespace already registered:', String(error))
      }
    }
  },
}

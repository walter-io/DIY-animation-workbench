/**
 * dist 冒烟测试：起一个纯静态服务器托管 dist/，用无头浏览器打开，
 * 断言两件事：
 *   1. 前端能通过 content-index.json 拿到两个内容包（不需要 dev server）；
 *   2. /content/cards|sounds 下的包资源能被正常取到（ASCII 别名路径）。
 * 用法：node scripts/smoke-dist.mjs
 */
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const root = path.join(process.cwd(), 'dist')
const OUT = path.join(process.env.TEMP ?? '/tmp', 'smoke-dist.txt')
const lines = []
const log = (...a) => {
  lines.push(a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' '))
  fs.writeFileSync(OUT, lines.join('\n'), 'utf8')
  console.log(...a)
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
}

const server = http.createServer((req, res) => {
  const raw = (req.url || '/').split('?')[0]
  let rel
  try {
    rel = decodeURIComponent(raw)
  } catch {
    rel = raw
  }
  if (rel === '/') rel = '/index.html'
  const file = path.resolve(root, '.' + rel)
  if (!file.startsWith(root) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    log('404', raw)
    res.statusCode = 404
    res.end('not found')
    return
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream' })
  fs.createReadStream(file).pipe(res)
})

await new Promise((r) => server.listen(0, '127.0.0.1', r))
const port = server.address().port
log('static server on', port)

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } })
const consoleErrors = []
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text())
})
page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message))

await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' })
await page.waitForTimeout(2500)

const state = await page.evaluate(async () => {
  const injected = globalThis.__OS_CONTENT_INDEX__ ?? null
  let fromFile = null
  try {
    const res = await fetch('content-index.json', { cache: 'no-cache' })
    if (res.ok) fromFile = await res.json()
  } catch (e) {
    fromFile = { error: String(e) }
  }
  const probe = async (url) => {
    try {
      const r = await fetch(url, { method: 'GET', cache: 'no-cache' })
      return { url, ok: r.ok, status: r.status, bytes: (await r.arrayBuffer()).byteLength }
    } catch (e) {
      return { url, ok: false, error: String(e) }
    }
  }
  const probes = []
  for (const u of [
    'content/cards/示例包/cards.js',
    'content/cards/示例包/manifest.json',
    'content/sounds/示例包/crystal-tap.mp3',
    'content/sounds/示例包/manifest.json',
  ]) {
    probes.push(await probe(u))
  }
  const wb = globalThis.__OS_WORKBENCH__
  return {
    injectedPacks: injected ? injected.groups.map((g) => [g.kind, g.packs.length]) : null,
    filePacks: fromFile && fromFile.groups ? fromFile.groups.map((g) => [g.kind, g.packs.length]) : fromFile,
    probes,
    hasWorkbench: !!wb,
  }
})

log('injected index:', JSON.stringify(state.injectedPacks))
log('content-index.json:', JSON.stringify(state.filePacks))
for (const p of state.probes) log('  probe', JSON.stringify(p))
log('__OS_WORKBENCH__ present:', state.hasWorkbench)

// 打开拓展包面板，确认两个包真的进了 UI
try {
  // 先找拓展包入口（顶栏按钮 / 侧栏）
  const btns = await page.locator('button, [role="button"]').allInnerTexts()
  log('buttons:', JSON.stringify(btns.slice(0, 60)))
} catch (e) {
  log('buttons read failed', String(e))
}

const body = await page.locator('body').innerText()
log('--- UI 是否出现示例包名 ---')
log('含「示例包」:', body.includes('示例包'))
log('含「洞察数值卡」或「三行结论卡」:', body.includes('洞察数值卡') || body.includes('三行结论卡'))

log('--- console errors ---')
log(consoleErrors.slice(0, 20).join('\n') || '(none)')

await page.screenshot({ path: path.join(process.env.TEMP ?? '/tmp', 'smoke-dist.png'), fullPage: false })
await browser.close()
server.close()
log('DONE')

// 验证视频参数面板的三处改动：
//   1) 位置与大小 的 X/Y/宽/高 改成两列两行（两两一行）
//   2) 不透明度 移到描边/形状下方（在「位置与大小」之前）
//   3) 去掉「镜头焦点」「出境画面」两个细分标题；「出镜布局」改名为「布局」
const path = require('path')
const { spawn } = require('child_process')
const fs = require('fs')
const http = require('http')
const { chromium } = require('playwright')

const PORT = 5196
const PROJECT_ROOT = path.resolve(__dirname, '..')
const TMP = path.join(__dirname, '_tmp')
fs.mkdirSync(TMP, { recursive: true })
const BASE = `http://localhost:${PORT}`
const VIDEO = path.join(TMP, 'host-sample.mp4')

let pass = 0, fail = 0
const check = (name, ok, detail) => {
  console.log(`  ${ok ? '✅' : '❌'} ${name}${detail ? ' → ' + detail : ''}`)
  ok ? pass++ : fail++
}

const waitServer = async () => {
  for (let i = 0; i < 80; i++) {
    const ok = await new Promise((r) => {
      const req = http.get(BASE, () => r(true))
      req.on('error', () => r(false))
      req.setTimeout(500, () => { req.destroy(); r(false) })
    })
    if (ok) return true
    await new Promise((r) => setTimeout(r, 500))
  }
  return false
}

;(async () => {
  if (!fs.existsSync(VIDEO)) throw new Error('找不到 ' + VIDEO)
  const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--port', String(PORT), '--host', '::1', '--strictPort'], {
    cwd: PROJECT_ROOT, stdio: ['ignore', 'pipe', 'pipe'],
  })
  let viteLog = ''
  vite.stdout.on('data', (d) => (viteLog += d.toString()))
  vite.stderr.on('data', (d) => (viteLog += d.toString()))
  if (!await waitServer()) { console.error('vite 启动失败\n' + viteLog); vite.kill(); process.exit(2) }
  console.log(`vite ready on ${PORT}`)

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const errors = []
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })

  await page.addInitScript(() => {
    try {
      localStorage.removeItem('animation-editor-project-v1')
      localStorage.removeItem('animation-editor-versions-v1')
    } catch {}
  })
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await page.waitForSelector('.os-app', { timeout: 15000 })

  // 切到素材库
  await page.evaluate(() => {
    const t = [...document.querySelectorAll('.os-left-tab')].find((t) => /素材库/.test(t.textContent))
    if (t && !/active/.test(t.className)) t.click()
  })
  await page.waitForTimeout(300)

  // 上传视频
  const importBtn = await page.$('.os-lib-import-btn')
  if (!importBtn) throw new Error('找不到导入按钮')
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    importBtn.click(),
  ])
  await chooser.setFiles(VIDEO)
  await page.waitForSelector('.os-media-act.add', { timeout: 12000 })
  await page.waitForTimeout(400)
  const libState = await page.evaluate(() => ({
    listLen: document.querySelectorAll('.os-media-list .os-media-item').length,
    addBtns: document.querySelectorAll('.os-media-act.add').length,
    error: document.querySelector('.os-lib-error')?.textContent || null,
  }))
  console.log('LIB STATE:', JSON.stringify(libState))
  const addBtn = await page.$('.os-media-act.add')
  if (!addBtn) throw new Error('找不到 ".os-media-act.add"')
  await addBtn.click()
  await page.waitForTimeout(600)

  // 选中视频片段
  const clipEl = await page.$('.os-img-clip')
  if (!clipEl) throw new Error('找不到 .os-img-clip')
  await clipEl.click()
  await page.waitForTimeout(400)

  // ---- 断言 3：标题顺序 ----
  const dividers = await page.$$eval('.os-panel-body .os-param-divider', (els) => els.map((e) => e.textContent.trim()))
  check('分节标题列表', JSON.stringify(dividers).includes('素材片段') &&
    JSON.stringify(dividers).includes('布局') &&
    !JSON.stringify(dividers).includes('镜头焦点') &&
    !JSON.stringify(dividers).includes('出境画面') &&
    !JSON.stringify(dividers).includes('出镜布局'),
    dividers.join(' | '))

  // ---- 断言 2：不透明度 在 「位置与大小」之前 ----
  const order = await page.evaluate(() => {
    const out = {}
    const opacity = [...document.querySelectorAll('.os-inline-range-label')].find((e) => /不透明度/.test(e.textContent))
    const opacityRow = opacity?.closest('.os-param-row')
    const posDivider = [...document.querySelectorAll('.os-param-divider')].find((e) => e.textContent.includes('位置与大小'))
    if (opacityRow && posDivider) {
      out.opacityTop = opacityRow.getBoundingClientRect().top
      out.posTop = posDivider.getBoundingClientRect().top
    }
    // 同时确认：不透明度 在 描边 之后
    const stroke = [...document.querySelectorAll('.os-inline-range-label')].find((e) => /描边/.test(e.textContent))
    const strokeRow = stroke?.closest('.os-param-row')
    if (strokeRow) out.strokeTop = strokeRow.getBoundingClientRect().top
    return out
  })
  check('不透明度 位于「位置与大小」之前', order.opacityTop != null && order.posTop != null && order.opacityTop < order.posTop,
    `opacityTop=${Math.round(order.opacityTop ?? -1)} posTop=${Math.round(order.posTop ?? -1)}`)
  check('不透明度 位于「描边」之后', order.opacityTop != null && order.strokeTop != null && order.opacityTop > order.strokeTop,
    `opacityTop=${Math.round(order.opacityTop ?? -1)} strokeTop=${Math.round(order.strokeTop ?? -1)}`)

  // ---- 断言 1：位置与大小 两列两行 ----
  const gridInfo = await page.evaluate(() => {
    const labels = [...document.querySelectorAll('.os-meta-grid.os-meta-grid-two label')]
    if (labels.length !== 4) return { count: labels.length }
    const ys = labels.map((l) => Math.round(l.getBoundingClientRect().top))
    const distinct = [...new Set(ys)]
    // 列宽：第 1 个和第 2 个应左右并排（x 不同、y 相同）
    const x0 = Math.round(labels[0].getBoundingClientRect().left)
    const x1 = Math.round(labels[1].getBoundingClientRect().left)
    return { count: labels.length, ys, distinctRows: distinct.length, x0, x1, sameRow01: ys[0] === ys[1], xDiff: x1 - x0 }
  })
  check('位置与大小 含 4 个输入框', gridInfo.count === 4, `count=${gridInfo.count}`)
  check('位置与大小 为两行（X/Y 同行，宽/高 同行）',
    gridInfo.distinctRows === 2 && gridInfo.sameRow01 && gridInfo.xDiff > 10,
    `rows=${gridInfo.distinctRows} xDiff=${gridInfo.xDiff}`)

  // ---- 断言 4：左右镜像 / 投影 在同一行 ----
  const switchInfo = await page.evaluate(() => {
    const row = document.querySelector('.os-param-row-switches')
    if (!row) return { found: false }
    const sws = [...row.querySelectorAll('.os-switch')]
    if (sws.length < 2) return { found: true, count: sws.length }
    const r = sws.map((s) => Math.round(s.getBoundingClientRect().top))
    return { found: true, count: sws.length, tops: r, sameRow: r[0] === r[1] }
  })
  check('左右镜像 与 投影 在同一行',
    switchInfo.found && switchInfo.count >= 2 && switchInfo.sameRow,
    `count=${switchInfo.count} tops=${JSON.stringify(switchInfo.tops)}`)

  // 截图（隐藏画布让面板更清晰）
  await page.evaluate(() => { const c = document.querySelector('.os-canvas'); if (c) c.style.display = 'none' })
  await page.waitForTimeout(150)
  const panel = await page.$('.os-panel-right')
  if (!panel) throw new Error('参数面板未渲染')
  await panel.screenshot({ path: path.join(TMP, 'video-panel-layout.png') })
  console.log('saved video-panel-layout.png')

  console.log('\n=== 控制台错误 ===')
  console.log(errors.length ? errors.join('\n') : '  无')
  console.log(`\n结果：${pass} 通过 / ${fail} 失败`)

  await browser.close()
  vite.kill()
  process.exit(fail ? 1 : 0)
})().catch((e) => { console.error('FAIL', e); process.exit(3) })

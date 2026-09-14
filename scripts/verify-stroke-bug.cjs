/**
 * 复现「描边关闭后再开启，颜色改不了」的 bug：
 *   1) 导入图片 → 加片段 → 选中
 *   2) 设置描边宽度 6px
 *   3) 改描边颜色为红 → 读画布 border 样式
 *   4) 描边宽度归 0（关闭）→ 再设回 6（开启）
 *   5) 再改描边颜色为绿 → 读画布 border 样式
 * 若任一步边框颜色没跟着变，即复现 bug。
 */
const { chromium } = require('playwright')
const { spawn } = require('child_process')
const { execFileSync } = require('child_process')
const http = require('http')
const path = require('path')
const fs = require('fs')

const ROOT = path.join(__dirname, '..')
const KEY = 'animation-editor-project-v1'
const VERSIONS_KEY = 'animation-editor-versions-v1'
const DB_NAME = 'animation-editor-media'
const PORT = process.env.PORT || '5191'
const BASE = `http://localhost:${PORT}/`

const IMG = path.join(__dirname, '_tmp', 'kf-test.png')
const FALLBACK_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)
if (!fs.existsSync(IMG)) {
  fs.mkdirSync(path.dirname(IMG), { recursive: true })
  try {
    execFileSync('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'color=c=0xff6f7c:s=320x180', '-frames:v', '1', '-loglevel', 'error', IMG])
  } catch {
    fs.writeFileSync(IMG, FALLBACK_PNG)
  }
}

let pass = 0, fail = 0
const check = (name, ok, detail) => {
  console.log(`  ${ok ? '✅' : '❌'} ${name}${detail ? ' → ' + detail : ''}`)
  ok ? pass++ : fail++
}

async function waitServer() {
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
  const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--port', PORT, '--strictPort'], {
    cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'],
  })
  let viteLog = ''
  vite.stdout.on('data', (d) => (viteLog += d.toString()))
  vite.stderr.on('data', (d) => (viteLog += d.toString()))
  if (!await waitServer()) {
    console.error('❌ vite 未能启动：\n' + viteLog)
    vite.kill(); process.exit(2)
  }
  console.log('vite ready on ' + PORT)

  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1680, height: 950 } })
  const errors = []
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })

  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await page.evaluate((k) => localStorage.removeItem(k), KEY)
  await page.evaluate((k) => localStorage.removeItem(k), VERSIONS_KEY)
  await page.evaluate((db) => new Promise((res) => { const r = indexedDB.deleteDatabase(db); r.onsuccess = r.onerror = r.onblocked = () => res() }), DB_NAME)
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(900)

  // 导入图片并加到播放头
  await page.click('.os-left-tab:has-text("素材库")')
  await page.waitForTimeout(300)
  await page.setInputFiles('.os-panel-left input[type="file"]', IMG)
  await page.waitForTimeout(1200)
  await page.click('.os-media-act.add')
  await page.waitForTimeout(500)
  await page.click('.os-img-clip')
  await page.waitForTimeout(300)

  // 用 React 受控 input 的方式设值：原生 setter + 派发 input 事件
  const setRange = async (selector, val) => {
    await page.evaluate(({ selector, val }) => {
      const el = document.querySelector(selector)
      const proto = el instanceof HTMLInputElement ? Object.getPrototypeOf(HTMLInputElement.prototype) : null
      const desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')
      desc.set.call(el, String(val))
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
    }, { selector, val })
    await page.waitForTimeout(150)
  }
  const setColor = async (selector, val) => {
    await page.evaluate(({ selector, val }) => {
      const el = document.querySelector(selector)
      const desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')
      desc.set.call(el, val)
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
    }, { selector, val })
    await page.waitForTimeout(150)
  }
  const borderStyle = async () =>
    page.$eval('.os-media-layer', (el) => getComputedStyle(el).borderColor + ' / width=' + getComputedStyle(el).borderTopWidth)

  // 先打两个关键帧（模拟用户日常带关键帧的工作流）
  console.log('\n--- 先给片段打 2 个关键帧 ---')
  const seekClick = async (t) => {
    await page.evaluate((time) => {
      const ticks = [...document.querySelectorAll('.os-tick')]
      const k = Math.max(0, Math.min(ticks.length - 2, Math.floor(time)))
      const a = ticks[k].getBoundingClientRect()
      const b = ticks[k + 1]?.getBoundingClientRect()
      const cx = a.left + a.width / 2
      const pxPerSec = b ? b.left + b.width / 2 - cx : 36
      const rulerEl = document.querySelector('.os-ruler')
      rulerEl.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: cx + (time - k) * pxPerSec, clientY: a.top + 5 }))
    }, t)
    await page.waitForTimeout(250)
  }
  await seekClick(1)
  await page.click('.os-btn-kf')
  await page.waitForTimeout(250)
  await seekClick(2)
  await page.click('.os-btn-kf')
  await page.waitForTimeout(400)
  const kfCount = await page.evaluate(() => (JSON.parse(localStorage.getItem('animation-editor-project-v1') || '{}').imageClips || [])[0]?.keyframes?.length || 0)
  check('已打 2 个关键帧', kfCount === 2, `帧数=${kfCount}`)
  // 把播放头停在第 1 个关键帧上（典型编辑位置）
  await seekClick(1)
  await page.waitForTimeout(200)

  // 找到描边行的 range + color（新结构：取色器是 .os-inline-range 内的独立控件，不在 label 里）
  const strokeInfo = await page.evaluate(() => {
    const row = document.querySelector('.os-inline-range:has(input[type="color"])')
    if (!row) return null
    const range = row.querySelector('input[type="range"]')
    const color = row.querySelector('input[type="color"]')
    return { rangeSel: range ? true : false, colorSel: color ? true : false }
  })
  check('找到描边行（range+独立 color 取色器）', strokeInfo != null && strokeInfo.rangeSel && strokeInfo.colorSel, JSON.stringify(strokeInfo))

  // 布局：素材编辑器里应出现 4 个「标题+滑竿同一行」的行（画面放大/圆角/描边/不透明度）
  const inlineCount = await page.$$eval('.os-panel-body .os-inline-range', (els) => els.length)
  check('出现 4 个内联标题+滑竿行', inlineCount === 4, `数量=${inlineCount}`)

  const SWATCH = '.os-inline-range:has(input[type="color"]) input[type="color"]'
  const WRANGE = '.os-inline-range:has(input[type="color"]) input[type="range"]'

  // 步骤 A：设描边宽度 6，颜色红
  await setRange(WRANGE, 6)
  await setColor(SWATCH, '#ff0000')
  const bA = await borderStyle()
  check('A: 设宽度6+红色 → 边框应为红', /rgb\(255, 0, 0\)/.test(bA) && /6px/.test(bA), bA)

  // 步骤 B：描边关闭（宽度 0）→ 再开启（宽度 6）
  await setRange(WRANGE, 0)
  await page.waitForTimeout(150)
  const bOff = await borderStyle()
  check('B1: 宽度0 → 边框 none', /0px/.test(bOff) || /none/.test(bOff), bOff)
  await setRange(WRANGE, 6)
  await page.waitForTimeout(150)
  const bOn = await borderStyle()
  check('B2: 宽度回6 → 边框恢复', /6px/.test(bOn), bOn)

  // 步骤 C：再改颜色为绿（用 Playwright 点击 + fill，模拟用户点开取色器再选色）
  await page.locator(SWATCH).click()
  await page.waitForTimeout(100)
  await page.locator(SWATCH).fill('#00ff00')
  await page.waitForTimeout(250)
  const bC = await borderStyle()
  check('C: 点击取色器+选绿 → 边框应为绿', /rgb\(0, 255, 0\)/.test(bC), bC)
  const swatchVal = await page.$eval(SWATCH, (el) => el.value)
  check('C2: 取色器 value 同步为 #00ff00', swatchVal.toLowerCase() === '#00ff00', swatchVal)

  // 步骤 D：在 width=0（描边关）状态下选色，再回 width=6 → 这是用户报的核心 bug
  await setRange(WRANGE, 0)
  await page.waitForTimeout(120)
  await setColor(SWATCH, '#0000ff')
  await page.waitForTimeout(150)
  // 此时 width=0，肉眼看不到边框，但要确认 store 真的是蓝
  const storeBlue = await page.evaluate(() => {
    const proj = JSON.parse(localStorage.getItem('animation-editor-project-v1') || '{}')
    return proj.imageClips?.[0]?.borderColor
  })
  check('D1: width=0 时选蓝 → store.borderColor=蓝', String(storeBlue).toLowerCase() === '#0000ff', String(storeBlue))

  await setRange(WRANGE, 6)
  await page.waitForTimeout(150)
  const bD = await borderStyle()
  check('D2: 回 width=6 后边框应真的变蓝', /rgb\(0, 0, 255\)/.test(bD) && /6px/.test(bD), bD)
  // 同时确认取色器自身的 value 也跟着同步了（不会停在旧色上）
  const swatchAfter = await page.$eval(SWATCH, (el) => el.value)
  check('D3: 取色器自身 value 同步为 #0000ff', swatchAfter.toLowerCase() === '#0000ff', swatchAfter)

  console.log('\n=== 控制台错误 ===')
  console.log(errors.length ? errors.join('\n') : '  无')
  console.log(`\n结果：${pass} 通过 / ${fail} 失败`)

  await browser.close()
  vite.kill()
  process.exit(fail ? 1 : 0)
})().catch((e) => { console.error(e); process.exit(3) })

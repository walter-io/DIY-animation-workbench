// 参数面板「标题 + 设置项同行」体检：逐行测量标题与控件的 top 差，并截图。
// 用法：node scripts/probe-param-layout.cjs
const path = require('path')
;(async () => {
const fs = require('fs')
const { spawn } = require('child_process')
const { chromium } = require('playwright')

const PORT = 5197
const PROJECT_ROOT = path.resolve(__dirname, '..')
const TMP = path.join(__dirname, '_tmp')
fs.mkdirSync(TMP, { recursive: true })

const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--port', String(PORT), '--strictPort'], {
  cwd: PROJECT_ROOT,
  stdio: ['ignore', 'pipe', 'pipe'],
})
let killed = false
const killAll = () => {
  if (killed) return
  killed = true
  try { vite.kill() } catch {}
}
process.on('exit', killAll)
process.on('SIGINT', killAll)
process.on('SIGTERM', killAll)

await new Promise((resolve) => {
  const t = setTimeout(resolve, 15000)
  vite.stdout.on('data', (b) => {
    if (b.toString().includes('Local')) { clearTimeout(t); resolve() }
  })
})
console.log('vite ready on', PORT)

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } })
const errs = []
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })
page.on('pageerror', (e) => errs.push('pageerror:' + e.message))
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' })
await page.waitForSelector('.os-app', { timeout: 20000 })

/** 加一张卡：优先字幕卡，其次第一张 */
async function addCard(prefer) {
  const clicked = await page.evaluate((prefer) => {
    const items = [...document.querySelectorAll('.os-lib-item')]
    const pick = items.find((i) => (i.getAttribute('data-effect-id') || '').includes(prefer)) || items[0]
    if (!pick) return null
    const btn = pick.querySelector('.os-lib-act-add')
    if (btn) btn.click()
    else pick.click()
    return pick.getAttribute('data-effect-id')
  }, prefer)
  await page.waitForTimeout(600)
  return clicked
}

const measure = () => page.evaluate(() => {
  const rows = []
  const near = (a, b) => Math.abs(a - b) < 8
  for (const row of document.querySelectorAll('.os-panel-right .os-param-row')) {
    const title =
      row.querySelector('.os-param-label') ||
      row.querySelector('.os-inline-range-label') ||
      row.querySelector(':scope > label:not(.os-field)')
    const ctrl = row.querySelector(
      ':scope > input, :scope > select, :scope > textarea, :scope > .os-seg, :scope > .os-switch, :scope > .os-color-wrap',
    )
    if (!title || !ctrl) continue
    const tb = title.getBoundingClientRect()
    const cb = ctrl.getBoundingClientRect()
    rows.push({
      key: row.getAttribute('data-size') || row.getAttribute('data-enter') || row.getAttribute('data-sub-style') || row.getAttribute('data-content-key') || '',
      title: (title.textContent || '').trim().slice(0, 12),
      ctrl: ctrl.tagName.toLowerCase() + '.' + (ctrl.className || '').split(' ')[0],
      sameRow: near(tb.top, cb.top),
      titleTop: Math.round(tb.top),
      ctrlTop: Math.round(cb.top),
    })
  }
  // meta-grid：统计每行有几对
  const grids = []
  for (const g of document.querySelectorAll('.os-panel-right .os-meta-grid')) {
    const items = [...g.children].map((c) => {
      const r = c.getBoundingClientRect()
      let t = '(no-title)'
      let ctrl = c.querySelector('input, select, textarea')
      if (c.firstChild && c.firstChild.nodeType === 3) t = c.firstChild.textContent.trim().slice(0, 10)
      const txt = c.querySelector('.os-param-label')
      if (txt) t = txt.textContent.trim().slice(0, 10)
      const tb = c.firstChild && c.firstChild.nodeType === 3 ? null : null
      const cb = ctrl ? ctrl.getBoundingClientRect() : null
      return {
        title: t,
        top: Math.round(r.top),
        inline: cb ? Math.abs(r.top - cb.top) < 10 : null,
        _: tb,
      }
    })
    const lineCount = {}
    for (const it of items) lineCount[it.top] = (lineCount[it.top] || 0) + 1
    grids.push({ items, perLine: Object.values(lineCount) })
  }
  // os-field 内部：标题文本与控件是否同一行
  const fields = []
  for (const f of document.querySelectorAll('.os-panel-right .os-field')) {
    const ctrl = f.querySelector('input, select, textarea')
    if (!ctrl) continue
    const cb = ctrl.getBoundingClientRect()
    const fb = f.getBoundingClientRect()
    fields.push({
      title: (f.textContent || '').trim().slice(0, 10),
      inline: Math.abs(cb.top - fb.top) < 10,
      h: Math.round(fb.height),
      w: Math.round(fb.width),
    })
  }
  return { rows, grids, fields }
})

async function report(tag) {
  const r = await measure()
  const bad = r.rows.filter((x) => !x.sameRow)
  console.log(`\n===== ${tag} =====`)
  console.log(`param-row 共 ${r.rows.length} 行，未同行 ${bad.length} 行`)
  for (const b of bad) console.log('  ✗ 未同行:', JSON.stringify(b))
  console.log('meta-grid 每行对数:', JSON.stringify(r.grids.map((g) => g.perLine)))
  for (const g of r.grids) for (const it of g.items) if (it.inline === false) console.log('  ✗ 格内未同行:', JSON.stringify(it))
  const badFields = r.fields.filter((f) => !f.inline)
  console.log(`field 对 ${r.fields.length} 个，标题与控件未同行 ${badFields.length} 个`)
  for (const f of badFields) console.log('  ✗ field 未同行:', JSON.stringify(f))
  const panel = await page.$('.os-panel-right')
  if (panel) await panel.screenshot({ path: path.join(TMP, `param-panel-${tag}.png`) })
  await page.screenshot({ path: path.join(TMP, `param-full-${tag}.png`) })
}

const first = await addCard('subtitle')
console.log('added card:', first)
await report('subtitle')
// 换一张普通卡（内容区有滑杆/下拉/开关）
const second = await addCard('')
console.log('added card:', second)
await report('normal')
// 素材片段面板：需要素材，跳过（报 null 即 no-op）

console.log('\nconsole errors:', errs.slice(0, 5))
await browser.close()
killAll()
})()

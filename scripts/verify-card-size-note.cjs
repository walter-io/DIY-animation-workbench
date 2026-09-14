// 验证卡片「本卡尺寸」行：
//   1) 标题「本卡尺寸」与尺寸档按钮组在同一行（未被提示挤下去）
//   2) 状态提示（跟随设置里的通用尺寸）单独成行，位于按钮行下方，且不挤压按钮
//   3) 尺寸档按钮整体在面板可视范围内（没有被挤出）
const path = require('path')
const { spawn } = require('child_process')
const fs = require('fs')
const http = require('http')
const { chromium } = require('playwright')

const PORT = 5197
const PROJECT_ROOT = path.resolve(__dirname, '..')
const TMP = path.join(__dirname, '_tmp')
fs.mkdirSync(TMP, { recursive: true })
const BASE = `http://localhost:${PORT}`

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

  // 添加一张动效卡
  await page.waitForSelector('.os-lib-item', { timeout: 8000 })
  const libItem = await page.$('.os-lib-item')
  if (!libItem) throw new Error('找不到 .os-lib-item')
  await libItem.click()
  await page.waitForTimeout(400)

  // 选中画布上的卡，进参数面板
  const cardEl = await page.$('.os-canvas .os-card')
  if (!cardEl) throw new Error('画布上找不到 .os-card')
  await cardEl.click()
  await page.waitForTimeout(400)
  await page.waitForSelector('.os-panel-right .os-param-row-inline[data-size="preset"]', { timeout: 8000 })

  const info = await page.evaluate(() => {
    const row = document.querySelector('.os-panel-right .os-param-row-inline[data-size="preset"]')
    const label = row.querySelector('.os-inline-range-label')
    const seg = row.querySelector('.os-seg-cardsize')
    const note = document.querySelector('.os-param-note-line')
    const panel = document.querySelector('.os-panel-right')
    const box = (el) => el ? el.getBoundingClientRect() : null
    const b = (el) => { const r = box(el); return r ? { top: Math.round(r.top), bottom: Math.round(r.bottom) } : null }
    const rl = (el) => el ? Math.round(el.getBoundingClientRect().left) : null
    const rr = (el) => el ? Math.round(el.getBoundingClientRect().right) : null
    return {
      labelBox: b(label),
      segBox: b(seg),
      noteTop: note ? Math.round(note.getBoundingClientRect().top) : null,
      noteText: note ? note.textContent.trim() : null,
      panelRight: panel ? Math.round(panel.getBoundingClientRect().right) : null,
      segLeft: rl(seg),
      segRight: rr(seg),
      segBtns: seg ? seg.querySelectorAll('.os-seg-btn').length : 0,
    }
  })

  // 同一行 = 标题与按钮组在垂直方向有重叠（flex 行内居中，矮的标题会比高的按钮组 top 略低，这是正常的）
  const overlap = info.labelBox && info.segBox &&
    info.labelBox.top < info.segBox.bottom && info.segBox.top < info.labelBox.bottom
  check('标题「本卡尺寸」与按钮组同一行（垂直重叠）',
    !!overlap,
    `labelTop=${info.labelBox?.top} labelBottom=${info.labelBox?.bottom} segTop=${info.segBox?.top} segBottom=${info.segBox?.bottom}`)
  check('状态提示单独成行且在按钮行下方',
    info.noteTop != null && info.segBox && info.noteTop > info.segBox.top && /跟随设置里的通用尺寸/.test(info.noteText || ''),
    `noteTop=${info.noteTop} segTop=${info.segBox?.top} text=${info.noteText}`)
  check('尺寸档按钮整体在面板内（未被挤出）',
    info.segRight != null && info.panelRight != null && info.segRight <= info.panelRight + 1,
    `segRight=${info.segRight} panelRight=${info.panelRight} btns=${info.segBtns}`)

  // 「尺寸」行：标题与 fit 模式按钮组同一行
  const fitInfo = await page.evaluate(() => {
    const row = document.querySelector('.os-panel-right .os-param-row-inline[data-size="fit"]')
    if (!row) return { found: false }
    const label = row.querySelector('.os-inline-range-label')
    const seg = row.querySelector('.os-seg-fit')
    const rb = (el) => { const r = el ? el.getBoundingClientRect() : null; return r ? { top: Math.round(r.top), bottom: Math.round(r.bottom) } : null }
    return {
      found: true,
      label: rb(label),
      seg: rb(seg),
      labelText: label ? label.textContent.trim() : null,
      btns: seg ? seg.querySelectorAll('.os-seg-btn').length : 0,
    }
  })
  const fitOverlap = fitInfo.label && fitInfo.seg &&
    fitInfo.label.top < fitInfo.seg.bottom && fitInfo.seg.top < fitInfo.label.bottom
  check('「尺寸」标题与模式按钮组同一行',
    fitInfo.found && fitOverlap && fitInfo.labelText === '尺寸',
    `text=${fitInfo.labelText} labelTop=${fitInfo.label?.top} segTop=${fitInfo.seg?.top} btns=${fitInfo.btns}`)

  // 截图
  await page.evaluate(() => { const c = document.querySelector('.os-canvas'); if (c) c.style.display = 'none' })
  await page.waitForTimeout(150)
  const panel = await page.$('.os-panel-right')
  await panel.screenshot({ path: path.join(TMP, 'card-size-note.png') })
  console.log('saved card-size-note.png')

  console.log('\n=== 控制台错误 ===')
  console.log(errors.length ? errors.join('\n') : '  无')
  console.log(`\n结果：${pass} 通过 / ${fail} 失败`)

  await browser.close()
  vite.kill()
  process.exit(fail ? 1 : 0)
})().catch((e) => { console.error('FAIL', e); process.exit(3) })

// Quick visual probe of the parameter panel to find what's still off-row
async function main() {
const path = require('path')
const { spawn } = require('child_process')
const fs = require('fs')
const { chromium } = require('playwright')

const PORT = 5193
const PROJECT_ROOT = path.resolve(__dirname, '..')
const TMP = path.join(__dirname, '_tmp')
fs.mkdirSync(TMP, { recursive: true })

const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--port', String(PORT), '--strictPort'], {
  cwd: PROJECT_ROOT, stdio: ['ignore', 'pipe', 'pipe'],
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
  const onData = (buf) => {
    const s = buf.toString()
    if (s.includes('ready') || s.includes('Local')) resolve()
  }
  vite.stdout.on('data', onData)
})
console.log(`vite ready on ${PORT}`)

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

const consoleErrs = []
page.on('console', (m) => { if (m.type() === 'error') consoleErrs.push(m.text()) })
page.on('pageerror', (e) => consoleErrs.push('pageerror:' + e.message))

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' })
await page.waitForSelector('.os-app', { timeout: 15000 })

// 跳过素材库上传，直接点动效库第一张卡测试
await page.waitForTimeout(200)

const cardThumb = await page.$('.os-card-thumb, .os-lib-card, .os-lib-item')
if (cardThumb) await cardThumb.click()
await page.waitForTimeout(500)
const canvas = await page.$('.os-canvas')
if (canvas) {
  const cb = await canvas.boundingBox()
  await page.mouse.click(cb.x + cb.width / 2, cb.y + cb.height / 2)
  await page.waitForTimeout(500)
}
// 选中刚加的卡
const selCard = await page.$('.os-card')
if (selCard) {
  await selCard.click({ force: true })
  await page.waitForTimeout(300)
}
// 备用：用 .os-card-selected
const sel2 = await page.$('.os-card-selected')
if (sel2) {
  await sel2.click({ force: true })
  await page.waitForTimeout(300)
}

// 先看 1) 整体缩放 行：标题和滑竿是否同行
const scaleInfo = await page.evaluate(() => {
  const labels = [...document.querySelectorAll('.os-param-row')]
  const scaleRow = labels.find((r) => r.querySelector('.os-inline-range-label')?.textContent.includes('整体缩放'))
  if (!scaleRow) return null
  const lbl = scaleRow.querySelector('.os-inline-range-label')
  const r = scaleRow.querySelector('input[type="range"]')
  if (!lbl || !r) return null
  const lb = lbl.getBoundingClientRect()
  const rb = r.getBoundingClientRect()
  return { labelTop: lb.top, sliderTop: rb.top, labelLeft: lb.left, sliderLeft: rb.left, sameRow: Math.abs(lb.top - rb.top) < 10 }
})
console.log('1) 整体缩放 行:', JSON.stringify(scaleInfo))

// 2) 入场方式：标题 + 按钮组（label 改成了 span）
const enterInfo = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('.os-param-row')]
  const enterRow = rows.find((r) => r.getAttribute('data-enter') === 'kind')
  if (!enterRow) return null
  const lbl = enterRow.querySelector('.os-inline-range-label') || enterRow.querySelector('label, span')
  const seg = enterRow.querySelector('.os-seg')
  if (!lbl || !seg) return null
  const lb = lbl.getBoundingClientRect()
  const sb = seg.getBoundingClientRect()
  const cs = getComputedStyle(enterRow)
  const lcs = getComputedStyle(lbl)
  const scs = getComputedStyle(seg)
  const btn = seg.querySelector('.os-seg-btn')
  const bcs = btn ? getComputedStyle(btn) : null
  const enterRowRect = enterRow.getBoundingClientRect()
  const childClasses = [...enterRow.children].map((c) => `${c.tagName}.${c.className} h=${c.getBoundingClientRect().height} top=${c.getBoundingClientRect().top}`)
  return {
    rowTop: enterRowRect.top, rowBottom: enterRowRect.bottom, rowH: enterRowRect.height,
    rowClass: enterRow.className,
    rowChildCount: enterRow.children.length,
    rowChildren: childClasses,
    labelTop: lb.top, labelBottom: lb.bottom, labelH: lb.height,
    segTop: sb.top, segBottom: sb.bottom, segH: sb.height,
    sameRow: Math.abs(lb.top - sb.top) < 10,
    rowDisplay: cs.display, rowAlign: cs.alignItems, rowFlexDirection: cs.flexDirection,
    lblMarginTop: lcs.marginTop, lblAlignSelf: lcs.alignSelf, lblPadding: lcs.padding,
    segMarginTop: scs.marginTop, segAlignSelf: scs.alignSelf, segPadding: scs.padding, segBorder: scs.border,
    btnHeight: btn?.getBoundingClientRect().height,
    btnLineHeight: bcs?.lineHeight, btnDisplay: bcs?.display,
  }
})
console.log('2) 入场方式 行:', JSON.stringify(enterInfo, null, 2))

// 3) 本卡尺寸（label 改成了 span）
const cardSizeInfo = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('.os-param-row')]
  const r = rows.find((x) => x.getAttribute('data-size') === 'preset')
  if (!r) return null
  const lbl = r.querySelector('.os-inline-range-label') || r.querySelector('label, span')
  const seg = r.querySelector('.os-seg')
  if (!lbl || !seg) return null
  const lb = lbl.getBoundingClientRect()
  const sb = seg.getBoundingClientRect()
  return { labelTop: lb.top, segTop: sb.top, sameRow: Math.abs(lb.top - sb.top) < 10 }
})
console.log('3) 本卡尺寸 行:', JSON.stringify(cardSizeInfo))

// 4) 背景透明度 - "恢复跟随工程"按钮
// 先主动拖滑竿以触发 cardOpacity
const cardOpSlider = await page.$('.os-param-row[data-card-bg-opacity] input[type="range"]')
if (cardOpSlider) {
  await cardOpSlider.evaluate((el) => {
    el.value = '0.5'
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
  })
}
await page.waitForTimeout(300)
const restoreBtnInfo = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('.os-param-row[data-card-bg-opacity]')]
  if (!rows.length) return { rows: 0 }
  const r = rows[0]
  const btn = r.querySelector('button.os-btn')
  return { rows: rows.length, btnExists: !!btn, btnText: btn?.textContent?.trim() }
})
console.log('4a) 拖滑竿后 按钮:', JSON.stringify(restoreBtnInfo))

// 点一次按钮
const restoreBtn = await page.$('.os-param-row[data-card-bg-opacity] button.os-btn')
if (restoreBtn) {
  await restoreBtn.click()
  await page.waitForTimeout(300)
}
const afterClickInfo = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('.os-param-row[data-card-bg-opacity]')]
  if (!rows.length) return { rows: 0 }
  const r = rows[0]
  const btn = r.querySelector('button.os-btn')
  return { rows: rows.length, btnExists: !!btn, btnText: btn?.textContent?.trim() }
})
console.log('4b) 点按钮后 按钮:', JSON.stringify(afterClickInfo))

// 再拖一次滑竿，再点按钮
if (cardOpSlider) {
  await cardOpSlider.evaluate((el) => {
    el.value = '0.7'
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
  })
}
await page.waitForTimeout(300)
const second = await page.$('.os-param-row[data-card-bg-opacity] button.os-btn')
if (second) {
  await second.click()
  await page.waitForTimeout(300)
}
const afterClick2Info = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('.os-param-row[data-card-bg-opacity]')]
  if (!rows.length) return { rows: 0 }
  const r = rows[0]
  const btn = r.querySelector('button.os-btn')
  return { rows: rows.length, btnExists: !!btn, btnText: btn?.textContent?.trim() }
})
console.log('4c) 拖滑竿+点按钮 第二次:', JSON.stringify(afterClick2Info))

// 5) 卡片强调色 toggle 按钮（动效库 schema 的 accent 字段）
const accentInfo = await page.evaluate(() => {
  // 找带 color 的 .os-color-wrap
  const wrap = document.querySelector('.os-color-wrap')
  if (!wrap) return { hasColorWrap: false }
  const btn = wrap.querySelector('button.os-btn')
  const color = wrap.querySelector('input[type="color"]')
  return {
    hasColorWrap: true,
    btnText: btn?.textContent?.trim(),
    colorValue: color?.value,
  }
})
console.log('5a) 强调色初始状态:', JSON.stringify(accentInfo))

const accentBtn = await page.$('.os-color-wrap button.os-btn')
if (accentBtn) {
  await accentBtn.click()
  await page.waitForTimeout(300)
}
const accentInfo2 = await page.evaluate(() => {
  const wrap = document.querySelector('.os-color-wrap')
  if (!wrap) return null
  const btn = wrap.querySelector('button.os-btn')
  const color = wrap.querySelector('input[type="color"]')
  return {
    btnText: btn?.textContent?.trim(),
    colorValue: color?.value,
  }
})
console.log('5b) 点一次按钮后:', JSON.stringify(accentInfo2))

// 再点一次
if (accentBtn) {
  await accentBtn.click()
  await page.waitForTimeout(300)
}
const accentInfo3 = await page.evaluate(() => {
  const wrap = document.querySelector('.os-color-wrap')
  if (!wrap) return null
  const btn = wrap.querySelector('button.os-btn')
  const color = wrap.querySelector('input[type="color"]')
  return {
    btnText: btn?.textContent?.trim(),
    colorValue: color?.value,
  }
})
console.log('5c) 再点一次按钮后:', JSON.stringify(accentInfo3))

console.log('console errors:', consoleErrs.length, consoleErrs.slice(0, 3))

await browser.close()
killAll()
console.log('DONE')
}

main().catch((e) => { console.error(e); process.exit(1) })

// 验证：① 背景透明度拨杆可开可关 ② 左右栏可拖宽 / 双击复位 ③ 顶栏版本三件套平铺
const path = require('path')
;(async () => {
const fs = require('fs')
const { spawn } = require('child_process')
const { chromium } = require('playwright')

const PORT = 5199
const PROJECT_ROOT = path.resolve(__dirname, '..')
const TMP = path.join(__dirname, '_tmp')
fs.mkdirSync(TMP, { recursive: true })

const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--port', String(PORT), '--strictPort'], {
  cwd: PROJECT_ROOT, stdio: ['ignore', 'pipe', 'pipe'],
})
let killed = false
const killAll = () => { if (killed) return; killed = true; try { vite.kill() } catch {} }
process.on('exit', killAll)
process.on('SIGINT', killAll)
process.on('SIGTERM', killAll)

await new Promise((resolve) => {
  const t = setTimeout(resolve, 15000)
  vite.stdout.on('data', (b) => { if (b.toString().includes('Local')) { clearTimeout(t); resolve() } })
})

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } })
const errs = []
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })
page.on('pageerror', (e) => errs.push('pageerror:' + e.message))
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' })
await page.waitForSelector('.os-app', { timeout: 20000 })

// 加一张卡
await page.evaluate(() => {
  const item = document.querySelector('.os-lib-item')
  const btn = item?.querySelector('.os-lib-act-add')
  if (btn) btn.click(); else item?.click()
})
await page.waitForTimeout(600)

const ok = (c) => (c ? '✅' : '❌')
const note = () => page.$eval('.os-param-row[data-card-bg-opacity] .os-param-note-block', (e) => e.textContent.trim())
const swOn = () => page.$eval('.os-param-row[data-card-bg-opacity] .os-switch-track', (e) => e.classList.contains('on'))

// ① 背景透明度：初始跟随工程 → 点开 → 再关
console.log('\n① 背景透明度拨杆')
console.log('  初始:', await swOn() ? 'on' : 'off', '|', await note())
await page.click('.os-param-row[data-card-bg-opacity] .os-switch-track')
await page.waitForTimeout(300)
const afterOn = await swOn()
console.log('  点一下:', afterOn ? 'on' : 'off', '|', await note())
await page.click('.os-param-row[data-card-bg-opacity] .os-switch-track')
await page.waitForTimeout(300)
const afterOff = await swOn()
console.log('  再点一下:', afterOff ? 'on' : 'off', '|', await note())
console.log('  ', ok(afterOn === true && afterOff === false), '拨杆能开也能关')
// 拖滑竿应自动打开拨杆
await page.$eval('.os-param-row[data-card-bg-opacity] input[type="range"]', (el) => {
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
  set.call(el, '0.4')
  el.dispatchEvent(new Event('input', { bubbles: true }))
})
await page.waitForTimeout(300)
const afterDrag = await swOn()
console.log('  拖滑竿后:', afterDrag ? 'on' : 'off', '|', await note())
console.log('  ', ok(afterDrag === true), '拖滑竿自动开启本卡单独设置')

// ② 左右栏拖宽
console.log('\n② 面板拖拽')
const leftW = () => page.$eval('.os-left', (e) => Math.round(e.getBoundingClientRect().width))
const rightW = () => page.$eval('.os-panel-right', (e) => Math.round(e.getBoundingClientRect().width))
console.log('  默认 左', await leftW(), '右', await rightW())
const r1 = await page.$('.os-resizer-left')
if (!r1) console.log('  ❌ 找不到左拖拽条')
else {
  const b = await r1.boundingBox()
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
  await page.mouse.down()
  await page.mouse.move(b.x + b.width / 2 + 90, b.y + b.height / 2, { steps: 8 })
  await page.mouse.up()
  await page.waitForTimeout(300)
  const w = await leftW()
  console.log('  左栏拖 +90 →', w, ok(w > 290 && w < 330))
  // 双击复位
  await r1.dblclick()
  await page.waitForTimeout(300)
  const w2 = await leftW()
  console.log('  双击复位 →', w2, ok(w2 === 220))
}
const r2 = await page.$('.os-resizer-right')
if (!r2) console.log('  ❌ 找不到右拖拽条')
else {
  const b = await r2.boundingBox()
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
  await page.mouse.down()
  await page.mouse.move(b.x + b.width / 2 - 70, b.y + b.height / 2, { steps: 8 })
  await page.mouse.up()
  await page.waitForTimeout(300)
  const w = await rightW()
  console.log('  右栏拖 +70 →', w, ok(w > 300 && w < 340))
}
const stored = await page.evaluate(() => localStorage.getItem('animation-editor-panel-width-v1'))
console.log('  localStorage:', stored)
// 刷新后是否记住
await page.reload({ waitUntil: 'networkidle' })
await page.waitForSelector('.os-app', { timeout: 20000 })
await page.waitForTimeout(400)
console.log('  刷新后 右栏宽度:', await rightW())

// ③ 顶栏版本三件套
console.log('\n③ 顶栏版本按钮')
const btns = await page.$$eval('.os-topbar-right .os-topbar-group button', (els) =>
  els.map((e) => {
    const r = e.getBoundingClientRect()
    return { text: e.textContent.trim(), visible: r.width > 0 && r.height > 0 }
  }),
)
console.log(' ', JSON.stringify(btns))
console.log('  ', ok(btns.length === 3 && btns.every((b) => b.visible)), '三个按钮都平铺可见')
const ddLabels = await page.$$eval('.os-topbar-right .os-dd-btn', (els) => els.map((e) => e.textContent.trim()))
console.log('  顶栏按钮:', JSON.stringify(ddLabels))

await page.screenshot({ path: path.join(TMP, 'tweaks-full.png') })
const panel = await page.$('.os-panel-right')
if (panel) await panel.screenshot({ path: path.join(TMP, 'tweaks-panel.png') })
console.log('\nconsole errors:', errs.slice(0, 5))
await browser.close()
killAll()
})()

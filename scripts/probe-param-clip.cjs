// 素材片段参数面板体检：上传样例视频 → 拖到轨道 → 选中 → 截图
const path = require('path')
;(async () => {
const fs = require('fs')
const { spawn } = require('child_process')
const { chromium } = require('playwright')

const PORT = 5198
const PROJECT_ROOT = path.resolve(__dirname, '..')
const TMP = path.join(__dirname, '_tmp')
const SAMPLE = path.join(TMP, 'host-sample.mp4')

const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--port', String(PORT), '--strictPort'], {
  cwd: PROJECT_ROOT, stdio: ['ignore', 'pipe', 'pipe'],
})
let killed = false
const killAll = () => { if (killed) return; killed = true; try { vite.kill() } catch {} }
process.on('exit', killAll)
process.on('SIGINT', killAll)

await new Promise((resolve) => {
  const t = setTimeout(resolve, 15000)
  vite.stdout.on('data', (b) => { if (b.toString().includes('Local')) { clearTimeout(t); resolve() } })
})

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } })
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' })
await page.waitForSelector('.os-app', { timeout: 20000 })

// 切到素材库 Tab（左栏双 Tab：动效库 / 素材库）
const tab = await page.$('text=素材库')
if (tab) { await tab.click(); await page.waitForTimeout(400) }

// 上传样例视频
const fileInput = await page.$('input[type="file"]')
if (!fileInput) { console.log('NO file input'); process.exit(1) }
await fileInput.setInputFiles(SAMPLE)
await page.waitForTimeout(2500)

// 把素材拖到轨道：找素材库项，用 HTML5 拖拽或点击"添加到轨道"按钮
const added = await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find((b) => /添加|加入|轨道/.test(b.textContent || ''))
  if (btn) { btn.click(); return btn.textContent.trim() }
  return null
})
console.log('add btn:', added)
await page.waitForTimeout(1200)

// 选中时间轴上的素材片段
const clip = (await page.$('.os-img-clip')) || (await page.$('.os-clip'))
console.log('img-clip count:', await page.$('.os-img-clip').then(a=>a.length));
if (clip) { const bb=await clip.boundingBox(); console.log('bb',bb); await page.mouse.click(bb.x+bb.width/2, bb.y+bb.height/2); await page.waitForTimeout(600) }

const panel = await page.$('.os-panel-right')
if (panel) await panel.screenshot({ path: path.join(TMP, 'param-panel-clip.png') })

// 测量 meta-grid 每行对数 + field 同行
const info = await page.evaluate(() => {
  const out = { grids: [], fields: [] }
  for (const g of document.querySelectorAll('.os-panel-right .os-meta-grid')) {
    const tops = {}
    for (const c of g.children) {
      const t = Math.round(c.getBoundingClientRect().top)
      tops[t] = (tops[t] || 0) + 1
    }
    out.grids.push(Object.values(tops))
  }
  for (const f of document.querySelectorAll('.os-panel-right .os-field')) {
    const ctrl = f.querySelector('input, select')
    if (!ctrl) continue
    out.fields.push({
      title: (f.textContent || '').trim().slice(0, 8),
      inline: Math.abs(ctrl.getBoundingClientRect().top - f.getBoundingClientRect().top) < 10,
    })
  }
  return out
})
console.log('clip meta-grid perLine:', JSON.stringify(info.grids))
console.log('clip fields:', JSON.stringify(info.fields))

await browser.close()
killAll()
})()

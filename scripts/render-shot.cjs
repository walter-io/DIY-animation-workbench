const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')

const OUT = path.resolve(__dirname, '../_screenshots')
fs.mkdirSync(OUT, { recursive: true })

const project = {
  name: '验证工程',
  skin: 'dark',
  fps: 30,
  duration: 2,
  layout: 'edit',
  instances: [
    { id: 's1', effectId: 'core-number-roller', name: '核心数字', start: 0, duration: 2, slot: 'left', params: { label: '累计交付', target: 12847, suffix: '+', duration: 2, align: 'center' } },
    { id: 's2', effectId: 'compare-bars', name: '对比条', start: 0, duration: 2, slot: 'right', params: { leftLabel: '上周', rightLabel: '本周', leftValue: 42, rightValue: 88, unit: '%', duration: 1.5 } },
    { id: 's3', effectId: 'golden-reveal', name: '金句', start: 0, duration: 2, slot: 'bottom', params: { tag: '结论', lines: '增长来自新渠道\n留存明显提升', duration: 2.5 } },
  ],
}

async function shot(skin) {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })
  await page.addInitScript((args) => {
    window.__EXPORT_PROJECT = args.p
    window.__EXPORT_ALPHA = false
  }, { p: { ...project, skin } })
  await page.goto('http://localhost:5173/?render=1', { waitUntil: 'networkidle' })
  await page.waitForFunction(() => window.__render && window.__render.ready, { timeout: 20000 })
  await page.evaluate(() => window.__render.seek(1.2))
  await page.waitForTimeout(220)
  await page.screenshot({ path: path.join(OUT, `render-${skin}.png`) })
  await browser.close()
}

;(async () => {
  await shot('dark')
  await shot('light')
  console.log('render shots done')
})().catch((e) => { console.error(e); process.exit(1) })

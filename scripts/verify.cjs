const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')
const http = require('http')

const BASE = 'http://localhost:5173'
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
    { id: 's3', effectId: 'golden-reveal', name: '金句', start: 0, duration: 2, slot: 'left', params: { tag: '结论', lines: '增长来自新渠道\n留存明显提升', duration: 2.5 } },
  ],
}

function postExport(payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload)
    const req = http.request(
      `${BASE}/api/export`,
      { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } },
      (res) => {
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => resolve({ status: res.statusCode, type: res.headers['content-type'], buf: Buffer.concat(chunks) }))
      },
    )
    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } })

  // 1) 正常 UI
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.waitForSelector('.os-app', { timeout: 15000 })
  await page.waitForTimeout(400)
  await page.screenshot({ path: path.join(OUT, 'verify-ui.png') })
  const hasLib = await page.locator('.os-lib-item').count()
  const hasClips = await page.locator('.os-clip').count()
  console.log('UI: lib-items=%d clips=%d', hasLib, hasClips)

  // 2) 渲染模式
  await page.goto(`${BASE}/?render=1`, { waitUntil: 'networkidle' })
  await page.waitForFunction(() => window.__render && window.__render.ready, { timeout: 20000 })
  await page.evaluate(() => window.__render.seek(1.0))
  await page.waitForTimeout(200)
  await page.screenshot({ path: path.join(OUT, 'verify-render.png') })
  console.log('Render mode: ready OK')

  await browser.close()

  // 3) 真实导出（小工程，快速）
  const t0 = Date.now()
  const res = await postExport({ project, fps: 10, format: 'mp4', transparent: false })
  const dt = ((Date.now() - t0) / 1000).toFixed(1)
  const outFile = path.join(OUT, 'test-export.mp4')
  fs.writeFileSync(outFile, res.buf)
  console.log('Export: status=%d type=%s bytes=%d time=%ss', res.status, res.type, res.buf.length, dt)
  console.log('ALL DONE')
})().catch((e) => {
  console.error('VERIFY FAILED:', e.message)
  process.exit(1)
})

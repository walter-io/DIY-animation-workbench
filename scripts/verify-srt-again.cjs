/* 字幕功能端到端验证：t=2.5s 显示第1句 / t=6.5s 显示第2句 / t=4.5s 无字幕 */
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')

const BASE = process.env.BASE || 'http://localhost:5173'
const OUT = path.resolve(__dirname, '../_screenshots')
fs.mkdirSync(OUT, { recursive: true })

const SRT = `1
00:00:01,000 --> 00:00:04,000
欢迎来到本期节目

2
00:00:05,000 --> 00:00:08,500
今天我们用数据讲增长
`

const project = {
  name: 'srt-verify',
  skin: 'dark',
  style: 'glass',
  font: 'sans',
  fps: 30,
  duration: 9,
  layout: 'edit',
  instances: [
    {
      id: 's1',
      effectId: 'srt-subtitle',
      name: '口播字幕',
      start: 0,
      duration: 9,
      slot: 'bottom',
      params: { srt: SRT, fontSize: 44, align: 'center', color: '#ffffff', box: true, bg: 'rgba(0,0,0,0.55)' },
    },
  ],
}

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  await page.addInitScript((args) => {
    const g = globalThis
    g.__EXPORT_PROJECT = args.p
    g.__EXPORT_ALPHA = false
  }, { p: project })
  await page.goto(BASE + '/?render=1', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => { const r = globalThis.__render; return r && r.ready }, { timeout: 30000 })
  await page.evaluate(() => globalThis.document.fonts.ready)

  const shot = async (t, name) => {
    await page.evaluate((tt) => {
      globalThis.__render.seek(tt)
      return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
    }, t)
    await page.waitForTimeout(150)
    await page.locator('.os-canvas').screenshot({ path: path.join(OUT, name) })
    const bar = await page.evaluate(() => document.querySelector('.os-srt-bar')?.textContent ?? '')
    console.log(name, `t=${t}s`, '->', JSON.stringify(bar))
  }

  await shot(2.5, 'srt-2.5s.png')
  await shot(6.5, 'srt-6.5s.png')
  await shot(4.5, 'srt-4.5s.png')

  await browser.close().catch(() => {})
  console.log('done')
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })

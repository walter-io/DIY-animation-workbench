const { chromium } = require('playwright')
const BASE = 'http://127.0.0.1:5173'

async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))

  // hf-number-counter（fullscreen + fill）→ 内容提取：counter-panel 放大填满
  const project = {
    name: 'extract-test', skin: 'dark', style: 'glass', font: 'sans', fps: 30, duration: 6, layout: 'edit',
    instances: [
      { id: 'i1', effectId: 'hf-number-counter', name: '数字计数器', start: 0, duration: 5, slot: 'center',
        params: { title: '累计用户数', targetValue: 1285000, prefix: '', suffix: '+', note: '突破百万里程碑', accent: '#FF5A36', background: '#12100E', foreground: '#F4EFE7', duration: 5 } },
    ],
  }
  await page.addInitScript((p) => { globalThis.__EXPORT_PROJECT = p; globalThis.__EXPORT_ALPHA = false }, project)
  await page.goto(BASE + '/?render=1', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => globalThis.__render?.ready, { timeout: 15000 })
  await page.waitForTimeout(3000)
  await page.evaluate(() => globalThis.__render.seek(3))
  await page.waitForTimeout(800)

  const frame = page.frames().find((f) => f !== page.mainFrame())
  const info = await frame.evaluate(() => {
    const root = document.getElementById('root')
    const panel = document.querySelector('.counter-panel')
    const title = document.querySelector('.title')
    const value = document.querySelector('.value')
    const note = document.querySelector('.note')
    return {
      rootTransform: root?.style.transform,
      panelRect: panel ? (() => { const r = panel.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } })() : null,
      titleText: title?.textContent,
      valueText: value?.textContent,
      noteText: note?.textContent,
      viewport: { w: window.innerWidth, h: window.innerHeight },
    }
  })
  console.log('提取后:', JSON.stringify(info, null, 2))
  await page.screenshot({ path: 'E:/AI/tools/animation-controller/_reverse_tmp/hf-extract-verify.png' })

  if (errors.length) { console.log('--- errors ---'); errors.slice(0, 5).forEach((e) => console.log(e)) }
  else console.log('NO page errors')
  await browser.close()
}
main().catch((e) => { console.error('FAIL:', e); process.exit(1) })

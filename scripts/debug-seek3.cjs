const { chromium } = require('playwright')
const BASE = 'http://127.0.0.1:5173'
const project = {
  name: 'hf-test', skin: 'dark', style: 'glass', font: 'sans', fps: 30, duration: 6, layout: 'edit',
  instances: [{ id: 'i1', effectId: 'hf-number-counter', name: '数字计数器', start: 0, duration: 5, slot: 'center',
    params: { title: '累计用户数', targetValue: 1285000, prefix: '', suffix: '+', note: '突破百万里程碑', accent: '#FF5A36', background: '#12100E', foreground: '#F4EFE7', duration: 5 } }],
}
async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  await page.addInitScript((p) => { globalThis.__EXPORT_PROJECT = p; globalThis.__EXPORT_ALPHA = false }, project)
  await page.goto(BASE + '/?render=1', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => globalThis.__render?.ready, { timeout: 15000 })
  await page.waitForTimeout(2500)
  const frame = page.frames().find((f) => f !== page.mainFrame())
  const val = () => frame.evaluate(() => document.getElementById('value')?.textContent)

  console.log('init:', await val())
  // A: paused + progress
  await frame.evaluate(() => { window.__timelines.main.paused(true); window.__timelines.main.progress(0.5) })
  console.log('A paused progress(0.5):', await val())
  // B: paused + seek + render
  await frame.evaluate(() => { const tl = window.__timelines.main; tl.paused(true); tl.seek(3.0); tl.render(3.0, false, false) })
  console.log('B seek+render(3.0):', await val())
  // C: totalTime setter
  await frame.evaluate(() => { const tl = window.__timelines.main; tl.paused(true); tl.totalTime(2.0, false) })
  console.log('C totalTime(2.0):', await val())
  // D: seek with suppressEvents=false
  await frame.evaluate(() => { const tl = window.__timelines.main; tl.paused(true); tl.seek(1.5, false) })
  console.log('D seek(1.5,false):', await val())
  await browser.close()
}
main().catch((e) => { console.error('FAIL:', e); process.exit(1) })

const { chromium } = require('playwright')
const BASE = 'http://127.0.0.1:5173'

async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))

  // 1. 全屏模式：hf-number-counter（fullscreen）→ 应渲染为 os-fullscreen-instance 铺满画布
  const project = {
    name: 'fullscreen-test', skin: 'dark', style: 'glass', font: 'sans', fps: 30, duration: 6, layout: 'edit',
    instances: [
      { id: 'i1', effectId: 'hf-number-counter', name: '数字计数器', start: 0, duration: 5, slot: 'center',
        params: { title: '累计用户数', targetValue: 1285000, prefix: '', suffix: '+', note: '突破百万里程碑', accent: '#FF5A36', background: '#12100E', foreground: '#F4EFE7', duration: 5 } },
    ],
  }
  await page.addInitScript((p) => { globalThis.__EXPORT_PROJECT = p; globalThis.__EXPORT_ALPHA = false }, project)
  await page.goto(BASE + '/?render=1', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => globalThis.__render?.ready, { timeout: 15000 })
  await page.waitForTimeout(3000)

  const fullscreenInfo = await page.evaluate(() => {
    const fs = document.querySelector('.os-fullscreen-instance')
    const slot = document.querySelector('.os-slot')
    const canvas = document.querySelector('.os-canvas')
    return {
      hasFullscreen: !!fs,
      hasSlotCard: !!slot,
      canvasSize: canvas ? `${canvas.clientWidth}x${canvas.clientHeight}` : null,
      fullscreenSize: fs ? `${fs.clientWidth}x${fs.clientHeight}` : null,
      hasCardDecor: !!document.querySelector('.os-fullscreen-instance .os-card'),
      iframeInFullscreen: !!document.querySelector('.os-fullscreen-instance iframe'),
    }
  })
  console.log('全屏渲染:', JSON.stringify(fullscreenInfo))
  await page.evaluate(() => globalThis.__render.seek(2.5))
  await page.waitForTimeout(800)
  const val = await page.evaluate(() => {
    const iframe = document.querySelector('.os-fullscreen-instance iframe')
    return null // iframe 内通过 frame 访问
  })
  const frame = page.frames().find((f) => f !== page.mainFrame())
  const titleText = frame ? await frame.evaluate(() => document.querySelector('.title')?.textContent) : null
  console.log('全屏 iframe 标题:', titleText)

  await page.screenshot({ path: 'E:/AI/tools/animation-controller/_reverse_tmp/hf-fullscreen-verify.png' })

  // 2. overlay 模式：hf-concept-spotlight → 应保持小卡
  const p2 = {
    name: 'overlay-test', skin: 'dark', style: 'glass', font: 'sans', fps: 30, duration: 6, layout: 'edit',
    instances: [
      { id: 'i1', effectId: 'hf-concept-spotlight', name: '概念解释', start: 0, duration: 5, slot: 'center',
        params: { label: '核心概念', term: '提示词工程', definition: '把目标、约束说清楚', note: '术语解释', accent: '#FF5A36', foreground: '#F4EFE7', duration: 5 } },
    ],
  }
  await page.addInitScript((p) => { globalThis.__EXPORT_PROJECT = p; globalThis.__EXPORT_ALPHA = false }, p2)
  await page.goto(BASE + '/?render=1', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => globalThis.__render?.ready, { timeout: 15000 })
  await page.waitForTimeout(2500)
  const overlayInfo = await page.evaluate(() => ({
    hasFullscreen: !!document.querySelector('.os-fullscreen-instance'),
    hasSlot: !!document.querySelector('.os-slot'),
    hasCardDecor: !!document.querySelector('.os-slot .os-card'),
  }))
  console.log('overlay 渲染:', JSON.stringify(overlayInfo))
  await page.screenshot({ path: 'E:/AI/tools/animation-controller/_reverse_tmp/hf-overlay-verify.png' })

  if (errors.length) { console.log('--- errors ---'); errors.slice(0, 5).forEach((e) => console.log(e)) }
  else console.log('NO page errors')
  await browser.close()
}
main().catch((e) => { console.error('FAIL:', e); process.exit(1) })

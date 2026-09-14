/* 定位 seek 失效根因：直接操作 iframe 内部 timeline */
const { chromium } = require('playwright')

const BASE = 'http://127.0.0.1:5173'
const project = {
  name: 'hf-test',
  skin: 'dark',
  style: 'glass',
  font: 'sans',
  fps: 30,
  duration: 6,
  layout: 'edit',
  instances: [
    {
      id: 'i1',
      effectId: 'hf-number-counter',
      name: '数字计数器',
      start: 0,
      duration: 5,
      slot: 'center',
      params: {
        title: '累计用户数',
        targetValue: 1285000,
        prefix: '',
        suffix: '+',
        note: '突破百万里程碑',
        accent: '#FF5A36',
        background: '#12100E',
        foreground: '#F4EFE7',
        duration: 5,
      },
    },
  ],
}

async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  page.on('pageerror', (e) => console.log('PAGE ERROR:', e.message))

  await page.addInitScript((p) => { globalThis.__EXPORT_PROJECT = p; globalThis.__EXPORT_ALPHA = false }, project)
  await page.goto(BASE + '/?render=1', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => globalThis.__render?.ready, { timeout: 15000 })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(2500)

  const frame = page.frames().find((f) => f !== page.mainFrame())
  if (!frame) { console.log('NO IFRAME'); await browser.close(); return }

  // 1. 检查 iframe 内 timeline 状态
  const tlInfo = await frame.evaluate(() => {
    const tl = window.__timelines?.main
    return { hasTimeline: !!tl, totalDuration: tl ? tl.duration() : null, gsap: !!window.gsap }
  })
  console.log('timeline info:', JSON.stringify(tlInfo))

  // 2. 直接驱动 iframe 内部 timeline
  const before = await frame.evaluate(() => document.querySelector('.value')?.textContent)
  console.log('value before direct seek:', before)
  await frame.evaluate(() => {
    const tl = window.__timelines.main
    tl.seek(2.5)
  })
  await page.waitForTimeout(300)
  const after = await frame.evaluate(() => document.querySelector('.value')?.textContent)
  console.log('value after direct seek(2.5):', after)

  // 3. 尝试父→子 postMessage（模拟组件逻辑）
  await page.evaluate(() => {
    const f = document.querySelector('iframe')
    f.contentWindow.postMessage({ __hf: 'number-counter', type: 'seek', t: 1.0 }, '*')
  })
  await page.waitForTimeout(300)
  const afterMsg = await frame.evaluate(() => document.querySelector('.value')?.textContent)
  console.log('value after postMessage seek(1.0):', afterMsg)

  await browser.close()
}

main().catch((e) => { console.error('FAIL:', e); process.exit(1) })

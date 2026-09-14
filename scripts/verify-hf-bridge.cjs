/* 验证 hyperframes 桥接链路（内联 HTML + progress 驱动）：
 * registry 加载 → iframe srcDoc 渲染 → seek 同步 → 数字/标题正确 */
const { chromium } = require('playwright')

const BASE = 'http://127.0.0.1:5173'

async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  const errors = []
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('console.error: ' + m.text())
  })

  // 1. registry 校验
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1000)
  const reg = await page.evaluate(async () => (await (await fetch('/api/registry')).json()).length)
  console.log('registry total cards:', reg)

  // 2. render 模式验证 hf-number-counter（数字滚动，seek 必须让数字变化）
  const project = {
    name: 'hf-test', skin: 'dark', style: 'glass', font: 'sans', fps: 30, duration: 6, layout: 'edit',
    instances: [{
      id: 'i1', effectId: 'hf-number-counter', name: '数字计数器', start: 0, duration: 5, slot: 'center',
      params: { title: '累计用户数', targetValue: 1285000, prefix: '', suffix: '+', note: '突破百万里程碑', accent: '#FF5A36', background: '#12100E', foreground: '#F4EFE7', duration: 5 },
    }],
  }
  await page.addInitScript((p) => { globalThis.__EXPORT_PROJECT = p; globalThis.__EXPORT_ALPHA = false }, project)
  await page.goto(BASE + '/?render=1', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => globalThis.__render?.ready, { timeout: 15000 })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(2500)

  const frame = page.frames().find((f) => f !== page.mainFrame())
  console.log('iframe count:', page.frames().length - 1, '| has hf frame:', !!frame)
  if (!frame) { console.log('FAIL: no iframe'); await browser.close(); return }

  const html = await frame.content()
  console.log('bridge injected:', html.includes('__hyperframes'), '| local gsap:', html.includes('/vendor/gsap.min.js'))
  const titleText = await frame.evaluate(() => document.querySelector('.title, #title')?.textContent)
  console.log('title:', titleText)

  // seek 到 50% → 数字应滚动到约 64 万
  await page.evaluate(() => { globalThis.__render.seek(2.5) })
  await page.waitForTimeout(500)
  const v50 = await frame.evaluate(() => document.querySelector('.value')?.textContent)
  console.log('value @50%:', v50)

  // seek 到 90% → 数字接近 1285000
  await page.evaluate(() => { globalThis.__render.seek(4.5) })
  await page.waitForTimeout(500)
  const v90 = await frame.evaluate(() => document.querySelector('.value')?.textContent)
  console.log('value @90%:', v90)

  await page.screenshot({ path: 'E:/AI/tools/animation-controller/_reverse_tmp/hf-bridge-verify.png' })
  console.log('screenshot saved')

  // 3. 再验证一个折线模板（line-chart-draw，本仓库此前缺失）
  const p2 = {
    name: 'hf-line', skin: 'dark', style: 'glass', font: 'sans', fps: 30, duration: 8, layout: 'edit',
    instances: [{
      id: 'i1', effectId: 'hf-line-chart-draw', name: '折线绘制', start: 0, duration: 7, slot: 'center',
      params: { title: '月活跃用户增长', subtitle: '2024 全年', labels: '1月,2月,3月,4月', values: '120,200,320,450', accent: '#FF5A36', background: '#12100E', foreground: '#F4EFE7', duration: 7 },
    }],
  }
  await page.addInitScript((p) => { globalThis.__EXPORT_PROJECT = p; globalThis.__EXPORT_ALPHA = false }, p2)
  await page.goto(BASE + '/?render=1', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => globalThis.__render?.ready, { timeout: 15000 })
  await page.waitForTimeout(2500)
  const frame2 = page.frames().find((f) => f !== page.mainFrame())
  const lcTitle = await frame2.evaluate(() => document.querySelector('.title, #title, [class*=title]')?.textContent)
  console.log('line-chart title:', lcTitle)
  const hasSvgPath = await frame2.evaluate(() => !!document.querySelector('svg path, .line, [class*=line]'))
  console.log('line-chart has svg path:', hasSvgPath)

  if (errors.length) {
    console.log('--- errors ---')
    for (const e of errors.slice(0, 10)) console.log(e)
  } else {
    console.log('NO page errors')
  }
  await browser.close()
}

main().catch((e) => { console.error('FAIL:', e); process.exit(1) })

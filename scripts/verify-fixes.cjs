const { chromium } = require('playwright')
const BASE = 'http://127.0.0.1:5173'

async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1500, height: 900 } })
  const errors = []
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))

  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2000)

  // 1. 大屏标注：hf 卡列表项应有 badge
  const badgeCount = await page.evaluate(() => document.querySelectorAll('.os-lib-badge').length)
  const hfItemCount = await page.evaluate(() => document.querySelectorAll('[data-effect-id^="hf-"]').length)
  console.log('大屏badge数量:', badgeCount, '| hf卡列表项:', hfItemCount)

  // 2. 双击添加：双击 kpi-card → 新增实例
  const before = await page.evaluate(() => document.querySelectorAll('.os-slot').length)
  await page.evaluate(() => {
    const el = document.querySelector('[data-effect-id="kpi-card"]')
    const opts = { bubbles: true, cancelable: true, view: window, detail: 2 }
    el.dispatchEvent(new MouseEvent('mousedown', opts))
    el.dispatchEvent(new MouseEvent('mouseup', opts))
    el.dispatchEvent(new MouseEvent('click', opts))
    el.dispatchEvent(new MouseEvent('mousedown', opts))
    el.dispatchEvent(new MouseEvent('mouseup', opts))
    el.dispatchEvent(new MouseEvent('click', opts))
    el.dispatchEvent(new MouseEvent('dblclick', opts))
  })
  await page.waitForTimeout(500)
  const after = await page.evaluate(() => document.querySelectorAll('.os-slot').length)
  console.log('双击添加: 画布卡片', before, '→', after)

  // 3. accent 换色渲染：给 kpi-card 实例设 accent=#ff0000，检查数字颜色变量生效
  const project = {
    name: 'accent-test', skin: 'dark', style: 'glass', font: 'sans', fps: 30, duration: 6, layout: 'edit',
    instances: [{
      id: 'i1', effectId: 'kpi-card', name: 'KPI 单指标', start: 0, duration: 3, slot: 'left',
      params: { label: '核心指标', target: 35800, suffix: '', unit: '', trend: 'up', accent: '#ff2d55' },
    }],
  }
  await page.addInitScript((p) => { globalThis.__EXPORT_PROJECT = p; globalThis.__EXPORT_ALPHA = false }, project)
  await page.goto(BASE + '/?render=1', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => globalThis.__render?.ready, { timeout: 15000 })
  await page.waitForTimeout(1200)
  await page.evaluate(() => globalThis.__render.seek(2))
  await page.waitForTimeout(600)

  const slotStyle = await page.evaluate(() => {
    const slot = document.querySelector('.os-slot')
    if (!slot) return null
    const cs = getComputedStyle(slot)
    return {
      strong: cs.getPropertyValue('--stage-accent-strong').trim(),
      data: cs.getPropertyValue('--stage-data').trim(),
    }
  })
  console.log('accent 变量注入:', JSON.stringify(slotStyle))
  await page.screenshot({ path: 'E:/AI/tools/animation-controller/_reverse_tmp/hf-accent-verify.png' })

  if (errors.length) { console.log('--- errors ---'); errors.slice(0, 5).forEach((e) => console.log(e)) }
  else console.log('NO page errors')
  await browser.close()
}
main().catch((e) => { console.error('FAIL:', e); process.exit(1) })

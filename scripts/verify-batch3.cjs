const { chromium } = require('playwright')
const BASE = 'http://127.0.0.1:5173'

async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1500, height: 900 } })
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2000)

  await page.evaluate(() => {
    const more = [...document.querySelectorAll('button')].find((b) => b.textContent?.includes('更多'))
    more?.click()
  })
  await page.waitForTimeout(300)
  await page.evaluate(() => {
    const batch = [...document.querySelectorAll('.os-dd-item')].find((b) => b.textContent?.includes('批量工作台'))
    batch?.click()
  })
  await page.waitForTimeout(300)

  const plan = JSON.stringify({
    project: '增长复盘', outputFormat: 'mp4',
    scenes: [
      { timecode: '00:03', templateId: 'number-counter', note: '总用户里程碑', variables: { title: '总用户', targetValue: 35800, suffix: '' } },
      { timecode: '00:10', templateId: 'line-chart-draw', note: '增长趋势', variables: { title: '月活趋势' } },
    ],
  })
  await page.evaluate((p) => {
    const ta = document.querySelector('.os-batch-form textarea')
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set
    setter.call(ta, p)
    ta.dispatchEvent(new Event('input', { bubbles: true }))
  }, plan)
  await page.waitForTimeout(200)
  await page.evaluate(() => {
    ;[...document.querySelectorAll('.os-batch-actions button')].find((b) => b.textContent?.includes('校验方案'))?.click()
  })
  await page.waitForTimeout(400)
  await page.evaluate(() => {
    ;[...document.querySelectorAll('.os-modal button')].find((b) => b.textContent?.includes('载入时间轴'))?.click()
  })
  await page.waitForTimeout(800)

  // seek 到 5s（number-counter 在 3s 开始）
  await page.evaluate(() => {
    const r = window.__render
    if (r?.seek) r.seek(5)
    else {
      // 编辑模式下通过 store 不可直接访问，尝试点击时间轴
    }
  })
  // 编辑模式没有 __render，尝试点击时间轴上的位置
  const tline = await page.evaluate(() => {
    const el = document.querySelector('.os-timeline')
    if (!el) return { hasTimeline: false }
    const items = el.querySelectorAll('[class*="item"], [class*="block"], [class*="seg"]')
    return { hasTimeline: true, itemCount: items.length }
  })
  console.log('时间轴:', JSON.stringify(tline))

  // 检查 localStorage 中的工程是否包含实例
  const stored = await page.evaluate(() => {
    try {
      const p = JSON.parse(localStorage.getItem('animation-editor-project-v1') || 'null')
      return { name: p?.name, instances: p?.instances?.length, ids: p?.instances?.map((i) => i.effectId) }
    } catch { return null }
  })
  console.log('localStorage 工程:', JSON.stringify(stored))
  await browser.close()
}
main().catch((e) => { console.error('FAIL:', e); process.exit(1) })

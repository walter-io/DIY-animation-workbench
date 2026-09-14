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
  const result = await page.evaluate(() => ({
    errs: [...document.querySelectorAll('.os-lint-item')].map((e) => e.textContent?.trim()),
    planList: [...document.querySelectorAll('.os-batch-plan .os-version-item')].map((e) => e.textContent?.trim()),
  }))
  console.log('校验:', JSON.stringify(result))

  await page.evaluate(() => {
    ;[...document.querySelectorAll('.os-modal button')].find((b) => b.textContent?.includes('载入时间轴'))?.click()
  })
  await page.waitForTimeout(800)
  const loaded = await page.evaluate(() => ({
    slots: document.querySelectorAll('.os-slot').length,
    timelineItems: document.querySelectorAll('.os-timeline-item, [class*=timeline] [class*=item]').length,
  }))
  console.log('载入时间轴:', JSON.stringify(loaded))
  await page.screenshot({ path: 'E:/AI/tools/animation-controller/_reverse_tmp/hf-batch-ok.png' })
  await browser.close()
}
main().catch((e) => { console.error('FAIL:', e); process.exit(1) })

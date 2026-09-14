const { chromium } = require('playwright')
const BASE = 'http://127.0.0.1:5173'

async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1500, height: 900 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))

  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2000)

  // 打开批量工作台
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')]
    const more = btns.find((b) => b.textContent?.includes('更多'))
    more?.click()
  })
  await page.waitForTimeout(400)
  await page.evaluate(() => {
    const items = [...document.querySelectorAll('.os-dd-item')]
    const batch = items.find((b) => b.textContent?.includes('批量工作台'))
    batch?.click()
  })
  await page.waitForTimeout(400)
  const modalShown = await page.evaluate(() => !!document.querySelector('.os-modal-mask'))
  console.log('批量工作台打开:', modalShown)

  // 粘贴方案
  const plan = JSON.stringify({
    project: '增长复盘', outputFormat: 'mp4',
    scenes: [
      { timecode: '00:03', templateId: 'number-counter', note: '总用户里程碑', variables: { title: '总用户', targetValue: 35800, suffix: '' } },
      { timecode: '00:10', templateId: 'line-chart-draw', note: '增长趋势', variables: { title: '月活趋势' } },
      { timecode: '00:20', templateId: 'bad-tpl', note: '坏模板', variables: {} },
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
    const btns = [...document.querySelectorAll('.os-batch-actions button')]
    btns.find((b) => b.textContent?.includes('校验方案'))?.click()
  })
  await page.waitForTimeout(400)
  const result = await page.evaluate(() => {
    const errs = [...document.querySelectorAll('.os-lint-item')].map((e) => e.textContent?.trim())
    const planList = [...document.querySelectorAll('.os-batch-plan .os-version-item')].map((e) => e.textContent?.trim())
    return { errs, planList }
  })
  console.log('校验结果:', JSON.stringify(result, null, 2))

  // 载入时间轴
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('.os-modal-footer button, .os-modal button')]
    const load = btns.find((b) => b.textContent?.includes('载入时间轴'))
    load?.click()
  })
  await page.waitForTimeout(600)
  const loaded = await page.evaluate(() => {
    const slots = document.querySelectorAll('.os-slot').length
    const projectName = document.querySelector('.os-project-name')?.textContent
    return { slots, projectName }
  })
  console.log('载入时间轴:', JSON.stringify(loaded))

  await page.screenshot({ path: 'E:/AI/tools/animation-controller/_reverse_tmp/hf-batch-verify.png' })
  if (errors.length) { console.log('--- errors ---'); errors.slice(0, 5).forEach((e) => console.log(e)) }
  else console.log('NO page errors')
  await browser.close()
}
main().catch((e) => { console.error('FAIL:', e); process.exit(1) })

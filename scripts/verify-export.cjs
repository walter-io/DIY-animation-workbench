const { chromium } = require('playwright')
const BASE = 'http://127.0.0.1:5173'

async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1500, height: 900 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))

  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)

  // 1. 打开导出面板，验证 webm 选项
  await page.evaluate(() => {
    ;[...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === '导出')?.click()
  })
  await page.waitForTimeout(400)
  const formats = await page.evaluate(() => {
    const sel = document.querySelector('.os-export-form select')
    return sel ? [...sel.options].map((o) => o.text) : []
  })
  console.log('导出格式选项:', JSON.stringify(formats))

  // 选 webm 看透明开关
  await page.evaluate(() => {
    const sel = document.querySelector('.os-export-form select')
    const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set
    setter.call(sel, 'webm')
    sel.dispatchEvent(new Event('change', { bubbles: true }))
  })
  await page.waitForTimeout(300)
  const webmState = await page.evaluate(() => {
    const toggle = document.querySelector('.os-export-form input[type=checkbox]')
    const span = document.querySelector('.os-export-form .os-toggle span')
    return { transparentEnabled: !toggle?.disabled, transparentChecked: toggle?.checked, label: span?.textContent }
  })
  console.log('WebM 透明开关:', JSON.stringify(webmState))
  await page.keyboard.press('Escape')
  await page.waitForTimeout(200)

  // 2. 预设切换：选中一个 hf 卡，验证场景预设按钮
  await page.evaluate(() => {
    const item = document.querySelector('[data-effect-id="hf-number-counter"]')
    item?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, detail: 2 }))
  })
  await page.waitForTimeout(600)
  await page.evaluate(() => {
    // 选中刚添加的实例
    const slot = document.querySelector('.os-slot')
    slot?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  await page.waitForTimeout(400)
  const presetBtns = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('.os-param-row')]
    const presetRow = rows.find((r) => r.textContent?.includes('场景预设'))
    return presetRow ? [...presetRow.querySelectorAll('button')].map((b) => b.textContent?.trim()) : []
  })
  console.log('hf 场景预设按钮:', JSON.stringify(presetBtns))

  await page.screenshot({ path: 'E:/AI/tools/animation-controller/_reverse_tmp/hf-presets-verify.png' })
  if (errors.length) { console.log('--- errors ---'); errors.slice(0, 5).forEach((e) => console.log(e)) }
  else console.log('NO page errors')
  await browser.close()
}
main().catch((e) => { console.error('FAIL:', e); process.exit(1) })

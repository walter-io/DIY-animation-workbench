const { chromium } = require('playwright')
const BASE = 'http://127.0.0.1:5173'

async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1500, height: 900 } })
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)

  // 双击添加 hf-number-counter
  await page.evaluate(() => {
    document.querySelector('[data-effect-id="hf-number-counter"]')
      ?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, detail: 2 }))
  })
  await page.waitForTimeout(1000)

  const result = await page.evaluate(() => {
    const panel = document.querySelector('.os-panel-right')
    // 找到"场景预设"标签所在行
    const rows = [...panel.querySelectorAll('.os-param-row')]
    const presetRow = rows.find((r) => r.querySelector('label')?.textContent?.includes('场景预设'))
    if (!presetRow) return { found: false }
    const btns = [...presetRow.querySelectorAll('button')].map((b) => b.textContent?.trim())
    return { found: true, btns }
  })
  console.log('预设按钮:', JSON.stringify(result))
  await page.screenshot({ path: 'E:/AI/tools/animation-controller/_reverse_tmp/hf-presets2.png' })
  await browser.close()
}
main().catch((e) => { console.error('FAIL:', e); process.exit(1) })

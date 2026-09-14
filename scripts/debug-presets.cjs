const { chromium } = require('playwright')
const BASE = 'http://127.0.0.1:5173'

async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1500, height: 900 } })
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)

  // 双击添加 hf-number-counter
  await page.evaluate(() => {
    const item = document.querySelector('[data-effect-id="hf-number-counter"]')
    item?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, detail: 2 }))
  })
  await page.waitForTimeout(800)

  const state = await page.evaluate(() => {
    const slots = [...document.querySelectorAll('.os-slot')]
    const selected = document.querySelector('.os-card-selected')
    const params = document.querySelector('.os-panel-right')
    return {
      slotCount: slots.length,
      selected: selected ? selected.className : null,
      panelText: params?.textContent?.slice(0, 120),
      hasPresetRow: params?.textContent?.includes('场景预设'),
    }
  })
  console.log('双击后状态:', JSON.stringify(state, null, 2))
  await browser.close()
}
main().catch((e) => { console.error('FAIL:', e); process.exit(1) })

/* 验证动效库悬停预览里“要点清单卡”的宽度是否自适应。 */
const { chromium } = require('playwright')

const BASE = 'http://127.0.0.1:5173'

async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1500, height: 950 } })
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('[data-effect-id="bullet-list"]', { timeout: 15000 })

  await page.hover('[data-effect-id="bullet-list"]')
  await page.waitForSelector('.os-lib-preview-fixed .os-card', { timeout: 5000 })
  await page.waitForTimeout(600)

  const info = await page.evaluate(() => {
    const card = document.querySelector('.os-lib-preview-fixed .os-card')
    const canvas = document.querySelector('.os-lib-preview-canvas')
    const r = card.getBoundingClientRect()
    const cr = canvas.getBoundingClientRect()
    return {
      card: { w: Math.round(r.width), h: Math.round(r.height) },
      canvas: { w: Math.round(cr.width), h: Math.round(cr.height) },
      cardComputed: getComputedStyle(card).width,
      cardStyle: card.getAttribute('style'),
      canvasTransform: canvas.style.transform,
    }
  })
  console.log('LIBPREVIEW:', JSON.stringify(info))
  await browser.close()
}

main().catch((e) => {
  console.error('FAIL:', e)
  process.exit(1)
})

const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')

async function capture() {
  const outDir = path.resolve(__dirname, '../_screenshots')
  fs.mkdirSync(outDir, { recursive: true })

  const browser = await chromium.launch()
  const page = await browser.newPage({
    viewport: { width: 1600, height: 1000 },
  })

  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' })
  await page.waitForSelector('.os-canvas', { timeout: 10000 })

  const cardIds = ['core-number-roller', 'compare-bars', 'golden-reveal']

  for (let i = 0; i < cardIds.length; i++) {
    const id = cardIds[i]
    await page.click(`.os-card-item:nth-child(${i + 1})`)
    await page.waitForTimeout(200)

    await page.click('.os-btn:has-text("播放")')

    const duration = await page.$eval('.os-range-value', (el) =>
      parseFloat(el.textContent || '2'),
    )
    await page.waitForTimeout(duration * 600)

    await page.screenshot({
      path: path.join(outDir, `${id}.png`),
      fullPage: false,
    })

    await page.click('.os-btn-ghost')
    await page.waitForTimeout(100)
  }

  await page.screenshot({
    path: path.join(outDir, 'workspace.png'),
    fullPage: false,
  })

  await browser.close()
  console.log('Screenshots saved to', outDir)
}

capture().catch((err) => {
  console.error(err)
  process.exit(1)
})

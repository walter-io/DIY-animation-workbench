// 验证：动效库搜 "复刻" 命中数为 0（名称/描述/分类均无复刻字样，保持原创）
const { spawn } = require('child_process')
const path = require('path')
const { chromium } = require('playwright')
const PORT = 5193
const ROOT = path.resolve(__dirname, '..')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function waitFor(url, ms = 60000) {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) {
    try { if ((await fetch(url)).ok) return } catch {}
    await sleep(500)
  }
  throw new Error('dev server not reachable')
}
;(async () => {
  const vite = spawn(
    `"${process.env.NODE_EXE || 'node'}" ./node_modules/vite/bin/vite.js --port ${PORT} --host ::1 --strictPort`,
    { cwd: ROOT, shell: true, stdio: 'ignore' },
  )
  try {
    await waitFor(`http://localhost:${PORT}/`)
    const browser = await chromium.launch()
    const page = await browser.newPage({ viewport: { width: 1600, height: 900 } })
    await page.goto(`http://localhost:${PORT}/`)
    await page.waitForSelector('.os-lib-item', { timeout: 30000 })
    await page.fill('.os-lib-search', '复刻')
    await sleep(300)
    const hits = await page.locator('.os-lib-item').count()
    console.log('search "复刻" hits (expect 0):', hits)
    // 顺便确认描述里没有复刻：抓前几张卡片的描述文本
    await page.fill('.os-lib-search', '')
    await sleep(200)
    const sample = await page.locator('.os-lib-item').first().locator('.os-lib-desc').textContent().catch(() => '')
    console.log('first card desc sample:', sample)
    await browser.close()
  } finally {
    vite.kill()
  }
  process.exit(0)
})().catch((e) => { console.error(e); process.exit(1) })

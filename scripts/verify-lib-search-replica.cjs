// 验证：动效库搜索 "replica" 能命中全部复刻卡（含 v4 新增 10 张）
const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')
const { chromium } = require('playwright')

const PORT = 5189
const ROOT = path.resolve(__dirname, '..')

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function waitFor(url, ms = 60000) {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) {
    try {
      const res = await fetch(url)
      if (res.ok) return
    } catch {}
    await sleep(500)
  }
  throw new Error('dev server not reachable: ' + url)
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

    // 1) 不搜索：库里总卡片数
    const total = await page.locator('.os-lib-item').count()

    // 2) 搜 "replica"
    await page.fill('.os-lib-search', 'replica')
    await sleep(300)
    const replicaIds = await page.locator('.os-lib-item').evaluateAll((els) =>
      els.map((el) => el.getAttribute('data-effect-id')),
    )

    // 3) 搜 "复刻"
    await page.fill('.os-lib-search', '复刻')
    await sleep(300)
    const fkCount = await page.locator('.os-lib-item').count()

    // 4) 搜 v4 具体 ID
    await page.fill('.os-lib-search', 'replica-yellow-ball-badge')
    await sleep(300)
    const ballHit = await page.locator('.os-lib-item').count()

    console.log('total lib items:', total)
    console.log('search "replica" hits:', replicaIds.length)
    console.log(replicaIds.join('\n'))
    console.log('search "复刻" hits:', fkCount)
    console.log('search "replica-yellow-ball-badge" hits:', ballHit)

    const v4 = [
      'replica-quad-tabs-tile',
      'replica-cost-dashboard',
      'replica-cost-rows',
      'replica-channel-stack',
      'replica-timeline-steps',
      'replica-bracket-stats',
      'replica-confetti-tiles',
      'replica-funnel-conversion',
      'replica-2cards-vs-graphic',
      'replica-yellow-ball-badge',
    ]
    const missing = v4.filter((id) => !replicaIds.includes(id))
    console.log(missing.length === 0 ? 'V4-ALL-PRESENT' : 'V4-MISSING: ' + missing.join(','))

    await browser.close()
  } finally {
    vite.kill()
  }
  process.exit(0)
})().catch((e) => {
  console.error(e)
  process.exit(1)
})

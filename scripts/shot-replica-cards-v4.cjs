// 一键预览 v4 Replica 卡（2026-09-09 第四段源视频，10 张全新卡）
const path = require('path')
const fs = require('fs')
const { chromium } = require('playwright')

const PORT = 5188
const BASE = `http://localhost:${PORT}`
const OUT = path.resolve(__dirname, '_tmp', 'replica-cards-v4')
fs.mkdirSync(OUT, { recursive: true })

const CARDS = [
  { id: 'replica-quad-tabs-tile',     name: '01-quad-tabs-tile',     delay: 500 },
  { id: 'replica-cost-dashboard',     name: '02-cost-dashboard',     delay: 700 },
  { id: 'replica-cost-rows',          name: '03-cost-rows',          delay: 800 },
  { id: 'replica-channel-stack',      name: '04-channel-stack',      delay: 800 },
  { id: 'replica-timeline-steps',     name: '05-timeline-steps',     delay: 900 },
  { id: 'replica-bracket-stats',      name: '06-bracket-stats',      delay: 800 },
  { id: 'replica-confetti-tiles',     name: '07-confetti-tiles',     delay: 600 },
  { id: 'replica-funnel-conversion',  name: '08-funnel-conversion',  delay: 800 },
  { id: 'replica-2cards-vs-graphic',  name: '09-2cards-vs-graphic',  delay: 800 },
  { id: 'replica-yellow-ball-badge',  name: '10-yellow-ball-badge',  delay: 800 },
]

;(async () => {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })

  await page.goto(BASE)
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})

  // 干净画布：写入空 project → reload
  const emptyProject = JSON.stringify({
    version: 1,
    meta: { duration: 10, fps: 30, width: 1920, height: 1080 },
    instances: [],
    imageClips: [],
    subtitles: [],
    mediaAssets: [],
  })

  for (const card of CARDS) {
    await page.evaluate((p) => {
      try { localStorage.setItem('animation-editor-project-v1', p) } catch {}
    }, emptyProject)
    await page.reload()
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
    await page.waitForSelector('.os-lib-item', { timeout: 10000 })

    const sel = `.os-lib-item[data-effect-id="${card.id}"]`
    const has = await page.locator(sel).count()
    if (!has) {
      console.warn(`[skip] ${card.id}`)
      continue
    }
    await page.locator(sel).first().click({ force: true })
    await page.waitForTimeout(card.delay + 300)
    const png = path.join(OUT, `${card.name}.png`)
    await page.screenshot({ path: png, fullPage: false })
    console.log(`[ok]   ${card.id}`)
  }

  await browser.close()
  console.log(`\n生成目录: ${OUT}`)
})().catch((e) => { console.error(e); process.exit(1) })
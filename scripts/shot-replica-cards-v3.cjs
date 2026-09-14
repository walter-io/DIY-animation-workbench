// 一键预览 12 张 v3 Replica 卡（2026-09-09 第三段源视频）：逐卡点击动效库加入，截图画布。
const path = require('path')
const fs = require('fs')
const { chromium } = require('playwright')

const PORT = 5188
const BASE = `http://localhost:${PORT}`
const OUT = path.resolve(__dirname, '_tmp', 'replica-cards-v3')
fs.mkdirSync(OUT, { recursive: true })

const CARDS = [
  { id: 'replica-section-nav',       name: '01-section-nav',       delay: 500 },
  { id: 'replica-right-claim',       name: '02-right-claim',       delay: 500 },
  { id: 'replica-answer-card',       name: '03-answer-card',       delay: 500 },
  { id: 'replica-vs-hero',           name: '04-vs-hero',           delay: 600 },
  { id: 'replica-ab-question',       name: '05-ab-question',       delay: 600 },
  { id: 'replica-prev-card',         name: '06-prev-card',         delay: 500 },
  { id: 'replica-s-flow',            name: '07-s-flow',            delay: 900 },
  { id: 'replica-section-showcase',  name: '08-section-showcase',  delay: 900 },
  { id: 'replica-numbered-list',     name: '09-numbered-list',     delay: 800 },
  { id: 'replica-time-cost',         name: '10-time-cost',         delay: 900 },
  { id: 'replica-stat-hero',         name: '11-stat-hero',         delay: 600 },
  { id: 'replica-side-note',         name: '12-side-note',         delay: 600 },
]

;(async () => {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })

  await page.goto(BASE)
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
  await page.evaluate(() => { try { localStorage.clear() } catch {} })
  await page.reload()
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
  await page.waitForSelector('.os-lib-item', { timeout: 10000 })

  for (const card of CARDS) {
    await page.evaluate(() => {
      try {
        const k = 'animation-editor-project-v1'
        const raw = localStorage.getItem(k)
        if (raw) {
          const p = JSON.parse(raw)
          if (p.instances) p.instances = []
          localStorage.setItem(k, JSON.stringify(p))
        }
      } catch {}
    })
    const sel = `.os-lib-item[data-effect-id="${card.id}"]`
    const has = await page.locator(sel).count()
    if (!has) {
      console.warn(`[skip] ${card.id} — not in library`)
      continue
    }
    await page.locator(sel).first().click({ force: true })
    await page.waitForTimeout(card.delay + 300)
    const png = path.join(OUT, `${card.name}.png`)
    await page.screenshot({ path: png, fullPage: false })
    console.log(`[ok]   ${card.id} → ${png}`)
  }

  await browser.close()
  console.log(`\n生成截图目录: ${OUT}`)
})().catch((e) => { console.error(e); process.exit(1) })
// 一键预览 17 张 Replica 卡：每个都通过点击动效库加入时间轴，截图画布。
const path = require('path')
const fs = require('fs')
const { chromium } = require('playwright')

const PORT = 5188
const BASE = `http://localhost:${PORT}`
const OUT = path.resolve(__dirname, '_tmp', 'replica-cards')
fs.mkdirSync(OUT, { recursive: true })

const CARDS = [
  { id: 'replica-eyebrow-card',    name: '01-eyebrow-card',    extraDelay: 400 },
  { id: 'replica-orbit-cluster',   name: '02-orbit-cluster',   extraDelay: 600 },
  { id: 'replica-orbit-ring',      name: '03-orbit-ring',      extraDelay: 800 },
  { id: 'replica-number-stat',     name: '04-number-stat',     extraDelay: 500 },
  { id: 'replica-code-window',     name: '05-code-window',     extraDelay: 500 },
  { id: 'replica-question-headline', name: '06-question-headline', extraDelay: 500 },
  { id: 'replica-eyebrow-banner',  name: '07-eyebrow-banner',  extraDelay: 500 },
  { id: 'replica-brand-card',      name: '08-brand-card',      extraDelay: 500 },
  { id: 'replica-mascot-figure',   name: '09-mascot-figure',   extraDelay: 600 },
  { id: 'replica-headline-highlight', name: '10-headline-highlight', extraDelay: 500 },
  { id: 'replica-step-card',       name: '11-step-card',       extraDelay: 500 },
  { id: 'replica-step-list',       name: '12-step-list',       extraDelay: 700 },
  { id: 'replica-mascot-arrow-loop', name: '13-mascot-arrow-loop', extraDelay: 700 },
  { id: 'replica-section-divider', name: '14-section-divider', extraDelay: 500 },
  { id: 'replica-icon-bubble',     name: '15-icon-bubble',     extraDelay: 600 },
  { id: 'replica-cta-pill',        name: '16-cta-pill',        extraDelay: 500 },
  { id: 'replica-icon-cluster',    name: '17-icon-cluster',    extraDelay: 700 },
]

;(async () => {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })

  // 1. 先清掉 localStorage 再加载，保证是干净状态
  await page.goto(BASE)
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
  await page.evaluate(() => { try { localStorage.clear() } catch {} })
  await page.reload()
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})

  // 2. 等动效库加载完
  await page.waitForSelector('.os-lib-item', { timeout: 10000 })

  // 3. 找画布区域
  const canvas = await page.locator('.os-canvas, .os-stage, .os-preview-canvas, [data-canvas]').first()

  for (const card of CARDS) {
    // 清掉已添加的实例（直接重置 store 更简单）
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

    // 触发 React 内部事件：点击动效库对应卡片
    const sel = `.os-lib-item[data-effect-id="${card.id}"]`
    const has = await page.locator(sel).count()
    if (!has) {
      console.warn(`[skip] ${card.id} — not in library`)
      continue
    }
    await page.locator(sel).first().click({ force: true })
    await page.waitForTimeout(card.extraDelay + 300)

    // 截全屏图
    const png = path.join(OUT, `${card.name}.png`)
    await page.screenshot({ path: png, fullPage: false })
    console.log(`[ok]   ${card.id} → ${png}`)
  }

  await browser.close()
  console.log(`\n生成 ${CARDS.length} 张卡片截图，目录: ${OUT}`)
})().catch((e) => { console.error(e); process.exit(1) })
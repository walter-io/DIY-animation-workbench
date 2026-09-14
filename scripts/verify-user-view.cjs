/* 按用户截图相似状态渲染：浅色主题 + 要点清单卡，测量并截图。 */
const { chromium } = require('playwright')

const BASE = 'http://127.0.0.1:5173'
const STORAGE_KEY = 'animation-editor-project-v1'

const project = {
  name: 'user-view-check',
  skin: 'light',
  style: 'glass',
  font: 'sans',
  cardOpacity: 0.65,
  fps: 30,
  duration: 12,
  layout: 'edit',
  instances: [
    {
      id: 'i1',
      effectId: 'bullet-list',
      name: '要点清单卡',
      start: 0,
      duration: 5,
      slot: 'center',
      params: { title: '三个要点', items: '第一点\n第二点\n第三点' },
    },
  ],
}

async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 712, height: 407 } })
  await page.addInitScript(
    ({ key, value }) => {
      localStorage.setItem(key, JSON.stringify(value))
    },
    { key: STORAGE_KEY, value: project },
  )
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2500)

  const info = await page.evaluate(() => {
    const canvas = document.querySelector('.os-canvas')
    const slot = canvas?.querySelector('.os-slot')
    const card = slot?.querySelector('.os-card')
    const cr = canvas?.getBoundingClientRect()
    const sr = slot?.getBoundingClientRect()
    const r = card?.getBoundingClientRect()
    return {
      canvas: cr ? { x: Math.round(cr.x), y: Math.round(cr.y), w: Math.round(cr.width), h: Math.round(cr.height) } : null,
      slot: sr ? { x: Math.round(sr.x), y: Math.round(sr.y), w: Math.round(sr.width), h: Math.round(sr.height) } : null,
      card: r ? { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } : null,
      cardComputed: card ? getComputedStyle(card).width : null,
      slotClass: slot ? slot.className : null,
    }
  })
  console.log('USERVIEW:', JSON.stringify(info))
  await page.screenshot({ path: 'E:/AI/tools/animation-controller/_reverse_tmp/user-view.png' })
  await page.screenshot({ path: 'E:/AI/tools/animation-controller/_reverse_tmp/user-view-full.png', fullPage: true })
  await browser.close()
}

main().catch((e) => {
  console.error('FAIL:', e)
  process.exit(1)
})

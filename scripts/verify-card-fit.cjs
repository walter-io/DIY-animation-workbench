/* 验证 React 卡外层容器是否随内容自适应。 */
const { chromium } = require('playwright')

const BASE = 'http://127.0.0.1:5173'
const STORAGE_KEY = 'animation-editor-project-v1'

const project = {
  name: 'card-fit-test',
  skin: 'dark',
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
  const page = await browser.newPage({ viewport: { width: 1500, height: 950 } })
  const errors = []
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('console.error: ' + m.text())
  })
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
    const slot = canvas ? canvas.querySelector('.os-slot') : null
    const card = slot ? slot.querySelector('.os-card') : null
    const zoom = slot ? slot.querySelector('.os-content-zoom') : null
    const cr = canvas ? canvas.getBoundingClientRect() : null
    const sr = slot ? slot.getBoundingClientRect() : null
    const cardR = card ? card.getBoundingClientRect() : null
    const zr = zoom ? zoom.getBoundingClientRect() : null
    return {
      canvas: cr ? { w: Math.round(cr.width), h: Math.round(cr.height) } : null,
      slot: sr ? { w: Math.round(sr.width), h: Math.round(sr.height) } : null,
      card: cardR ? { w: Math.round(cardR.width), h: Math.round(cardR.height) } : null,
      zoom: zr ? { w: Math.round(zr.width), h: Math.round(zr.height) } : null,
      cardInlineWidth: card ? card.getAttribute('style') : null,
      slotClass: slot ? slot.className : null,
      cardComputed: card ? getComputedStyle(card).width : null,
      zoomComputed: zoom ? getComputedStyle(zoom).width : null,
      bodyText: (document.body && document.body.innerText || '').slice(0, 200),
    }
  })
  console.log('FIT:', JSON.stringify(info))
  if (errors.length) {
    console.log('--- errors ---')
    errors.slice(0, 8).forEach((e) => console.log(e))
  }
  await browser.close()
}

main().catch((e) => {
  console.error('FAIL:', e)
  process.exit(1)
})

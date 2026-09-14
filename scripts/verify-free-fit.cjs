/* 验证自由定位的普通卡在未手动缩放时仍按内容自适应。 */
const { chromium } = require('playwright')

const BASE = 'http://127.0.0.1:5173'
const STORAGE_KEY = 'animation-editor-project-v1'

const project = {
  name: 'free-fit-test',
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
      free: true,
      x: 100,
      y: 120,
      w: 1900,
      h: 900,
      baseW: 1900,
      baseH: 900,
      params: { title: '三个要点', items: '第一点\n第二点\n第三点' },
    },
  ],
}

async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1500, height: 950 } })
  await page.addInitScript(
    ({ key, value }) => {
      localStorage.setItem(key, JSON.stringify(value))
    },
    { key: STORAGE_KEY, value: project },
  )
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2000)

  const info = await page.evaluate(() => {
    const inst = document.querySelector('.os-free-instance')
    const card = inst?.querySelector('.os-card')
    const r = inst?.getBoundingClientRect()
    const cr = card?.getBoundingClientRect()
    return {
      instClass: inst?.className ?? null,
      inst: r ? { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } : null,
      card: cr ? { w: Math.round(cr.width), h: Math.round(cr.height) } : null,
      cardComputed: card ? getComputedStyle(card).width : null,
    }
  })
  console.log('FREE:', JSON.stringify(info))
  await browser.close()
}

main().catch((e) => {
  console.error('FAIL:', e)
  process.exit(1)
})

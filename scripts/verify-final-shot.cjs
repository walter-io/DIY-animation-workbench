/* 截取当前页面并测量“要点清单卡”画布尺寸。 */
const { chromium } = require('playwright')

const BASE = 'http://127.0.0.1:5173'
const STORAGE_KEY = 'animation-editor-project-v1'

const project = {
  name: 'final-check',
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
  await page.addInitScript(
    ({ key, value }) => {
      localStorage.setItem(key, JSON.stringify(value))
    },
    { key: STORAGE_KEY, value: project },
  )
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)

  const info = await page.evaluate(() => {
    const card = document.querySelector('.os-slot .os-card')
    const slot = document.querySelector('.os-slot')
    const r = card.getBoundingClientRect()
    const sr = slot.getBoundingClientRect()
    return {
      cardScreen: { w: Math.round(r.width), h: Math.round(r.height) },
      slotScreen: { w: Math.round(sr.width), h: Math.round(sr.height) },
      cardComputed: getComputedStyle(card).width,
      slotClass: slot.className,
    }
  })
  console.log('FINAL:', JSON.stringify(info))
  await page.screenshot({ path: 'E:/AI/tools/animation-controller/_reverse_tmp/card-fit-final.png' })
  await browser.close()
}

main().catch((e) => {
  console.error('FAIL:', e)
  process.exit(1)
})

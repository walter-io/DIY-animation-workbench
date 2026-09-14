/* 验证 React 卡默认强调色为蓝、金色特殊色保留。 */
const { chromium } = require('playwright')

const BASE = 'http://127.0.0.1:5173'
const STORAGE_KEY = 'animation-editor-project-v1'

const project = {
  name: 'accent-test',
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
      effectId: 'kpi-card',
      name: '核心指标',
      start: 0,
      duration: 5,
      slot: 'center',
      params: { label: '核心指标', target: 35800, suffix: '', unit: '', trend: 'up' },
    },
  ],
}

async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } })
  await page.addInitScript(
    ({ key, value }) => {
      localStorage.setItem(key, JSON.stringify(value))
    },
    { key: STORAGE_KEY, value: project },
  )
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.os-slot .os-card', { timeout: 15000 })
  await page.waitForTimeout(1200)

  const info = await page.evaluate(() => {
    const slot = document.querySelector('.os-slot')
    const cs = getComputedStyle(slot)
    const canvas = document.querySelector('.os-canvas')
    const canvasStyle = canvas ? getComputedStyle(canvas) : null
    return {
      accentStrong: cs.getPropertyValue('--stage-accent-strong').trim(),
      data: cs.getPropertyValue('--stage-data').trim(),
      primary: cs.getPropertyValue('--stage-primary').trim(),
      special: cs.getPropertyValue('--stage-special').trim(),
      canvasAccent: canvasStyle ? canvasStyle.getPropertyValue('--stage-accent').trim() : null,
      canvasSpecial: canvasStyle ? canvasStyle.getPropertyValue('--stage-special').trim() : null,
    }
  })
  console.log('ACCENT:', JSON.stringify(info))
  await browser.close()
}

main().catch((e) => {
  console.error('FAIL:', e)
  process.exit(1)
})

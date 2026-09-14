/* 验证多张轻量卡自适应后的尺寸，以及 HF 叠加卡不被误收缩。 */
const { chromium } = require('playwright')

const BASE = 'http://127.0.0.1:5173'
const STORAGE_KEY = 'animation-editor-project-v1'

const project = {
  name: 'card-fit-multi',
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
    {
      id: 'i2',
      effectId: 'steps-card',
      name: '步骤流程卡',
      start: 0,
      duration: 5,
      slot: 'right',
      params: { title: '三步上手', steps: '第一步,导入素材\n第二步,选择模板\n第三步,导出成品' },
    },
    {
      id: 'i3',
      effectId: 'hf-stat-duel',
      name: '双数值对峙',
      start: 0,
      duration: 5,
      slot: 'left',
      params: {
        leftLabel: '手动制作',
        leftValue: 12,
        leftUnit: '小时',
        rightLabel: 'AI 协作',
        rightValue: 3,
        rightUnit: '小时',
        operator: '>',
        verdict: '重复制作时间减少 75%',
        accent: '#FF5A36',
        foreground: '#F4EFE7',
      },
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
  await page.waitForTimeout(2500)

  const info = await page.evaluate(() => {
    const canvas = document.querySelector('.os-canvas')
    const slots = Array.from(canvas.querySelectorAll('.os-slot'))
    return slots.map((slot) => {
      const card = slot.querySelector('.os-card')
      const zoom = slot.querySelector('.os-content-zoom')
      const r = (card || zoom || slot).getBoundingClientRect()
      return {
        cls: slot.className,
        w: Math.round(r.width),
        h: Math.round(r.height),
        hasCard: !!card,
      }
    })
  })
  console.log('MULTI:', JSON.stringify(info))
  await browser.close()
}

main().catch((e) => {
  console.error('FAIL:', e)
  process.exit(1)
})

/* 模拟拖动右下角缩放：从内容自适应切到手动尺寸，确认不会跳回大卡。 */
const { chromium } = require('playwright')

const BASE = 'http://127.0.0.1:5173'
const STORAGE_KEY = 'animation-editor-project-v1'

const project = {
  name: 'resize-fit-test',
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
      x: 200,
      y: 200,
      w: 1900,
      h: 900,
      baseW: 1900,
      baseH: 900,
      autoFit: true,
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
  await page.waitForTimeout(1800)

  const before = await page.evaluate(() => {
    const inst = document.querySelector('.os-free-instance')
    const r = inst.getBoundingClientRect()
    return { cls: inst.className, w: Math.round(r.width), h: Math.round(r.height) }
  })
  console.log('BEFORE:', JSON.stringify(before))

  const handle = await page.locator('.os-free-resize').boundingBox()
  if (!handle) throw new Error('no resize handle')
  const sx = handle.x + handle.width / 2
  const sy = handle.y + handle.height / 2
  await page.mouse.move(sx, sy)
  await page.mouse.down()
  await page.mouse.move(sx + 120, sy + 60, { steps: 6 })
  await page.mouse.up()
  await page.waitForTimeout(800)

  const after = await page.evaluate(() => {
    const inst = document.querySelector('.os-free-instance')
    const card = inst.querySelector('.os-card')
    const r = inst.getBoundingClientRect()
    const cr = card.getBoundingClientRect()
    return {
      cls: inst.className,
      inst: { w: Math.round(r.width), h: Math.round(r.height) },
      card: { w: Math.round(cr.width), h: Math.round(cr.height) },
      cardComputed: getComputedStyle(card).width,
    }
  })
  console.log('AFTER:', JSON.stringify(after))
  await browser.close()
}

main().catch((e) => {
  console.error('FAIL:', e)
  process.exit(1)
})

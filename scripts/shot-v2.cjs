const { chromium } = require('playwright')

const HOST = process.argv[2] ?? 'http://127.0.0.1:5181'

const project = {
  name: 'v2',
  skin: 'dark',
  style: 'glass',
  font: 'sans',
  palette: { accent: '#5ac8fa', data: '#5ac8fa', special: '#ffd166' },
  cardOpacity: 0.65,
  fps: 30,
  duration: 20,
  layout: 'edit',
  instances: [
    { id: 'b1', effectId: 'core-number-roller', name: '数字滚动', start: 0, duration: 8, slot: 'left', fit: 'auto', params: { label: '累计交付', target: 12847, suffix: '+', duration: 2, align: 'left', accent: '' } },
    { id: 'b2', effectId: 'bullet-list', name: '要点清单', start: 2, duration: 10, slot: 'right', fit: 'auto', params: { title: '三个要点', items: '第一点内容\n第二点内容\n第三点内容', accent: '' } },
  ],
}

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1680, height: 950 } })
  const errors = []
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })

  await page.goto(HOST, { waitUntil: 'networkidle' })
  await page.evaluate((p) => localStorage.setItem('animation-editor-project-v1', JSON.stringify(p)), project)
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)

  // ---- 1) 单独新增卡片：点库里的卡片（此时 b1 已被选中）
  const before = await page.$$eval('.os-clip', (n) => n.length)
  await page.click('.os-lib-item[data-effect-id="quote-card"]')
  await page.waitForTimeout(500)
  const after = await page.$$eval('.os-clip', (n) => n.length)
  await page.screenshot({ path: 'v2-1-add.png' })
  console.log('clips before/after add:', before, after)

  // ---- 2) 悬停显示 + / ⇄ 按钮
  await page.hover('.os-lib-item[data-effect-id="big-title"]')
  await page.waitForTimeout(300)
  await page.screenshot({ path: 'v2-2-actions.png' })

  // ---- 3) 背景透明度滑杆
  await page.evaluate(() => {
    const rows = [...document.querySelectorAll('.os-param-row')]
    const row = rows.find((r) => r.textContent.includes('背景透明度'))
    const input = row?.querySelector('input[type=range]')
    if (input) {
      input.value = '0.15'
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new Event('change', { bubbles: true }))
    }
  })
  await page.waitForTimeout(500)
  await page.screenshot({ path: 'v2-3-opacity.png' })

  // ---- 4) 拖拽轨道加高
  const rz = await page.$('.os-timeline-resizer')
  const rb = await rz.boundingBox()
  await page.mouse.move(rb.x + rb.width / 2, rb.y + rb.height / 2)
  await page.mouse.down()
  await page.mouse.move(rb.x + rb.width / 2, rb.y - 180, { steps: 12 })
  await page.mouse.up()
  await page.waitForTimeout(400)
  await page.screenshot({ path: 'v2-4-track-tall.png' })

  // ---- 5) 拖回变小
  const rz2 = await page.$('.os-timeline-resizer')
  const rb2 = await rz2.boundingBox()
  await page.mouse.move(rb2.x + rb2.width / 2, rb2.y + rb2.height / 2)
  await page.mouse.down()
  await page.mouse.move(rb2.x + rb2.width / 2, rb2.y + 200, { steps: 10 })
  await page.mouse.up()
  await page.waitForTimeout(400)
  await page.screenshot({ path: 'v2-5-track-short.png' })

  console.log('errors:', errors.slice(0, 5))
  await browser.close()
})()

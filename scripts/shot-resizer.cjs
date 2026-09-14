const { chromium } = require('playwright')

const project = {
  name: 'resizer', skin: 'dark', style: 'glass', font: 'sans',
  palette: { accent: '#5ac8fa', data: '#5ac8fa', special: '#ffd166' },
  cardOpacity: 0.65, fps: 30, duration: 20, layout: 'edit',
  instances: [
    { id: 'r1', effectId: 'core-number-roller', name: '数字滚动', start: 0, duration: 8, slot: 'left', fit: 'auto', params: { label: '累计交付', target: 12847, suffix: '+', duration: 2, align: 'left', accent: '' } },
    { id: 'r2', effectId: 'bullet-list', name: '要点清单', start: 2, duration: 10, slot: 'right', fit: 'auto', params: { title: '三个要点', items: '第一点\n第二点\n第三点', accent: '' } },
    { id: 'r3', effectId: 'section-header', name: '段头', start: 6, duration: 8, slot: 'center', fit: 'box', free: true, x: 600, y: 760, w: 720, h: 220, params: { num: '02', title: '第二部分', subtitle: '这里讲结构', accent: '' } },
  ],
}

const boxOf = (page, sel) => page.$eval(sel, (el) => {
  const r = el.getBoundingClientRect()
  return { x: r.x, y: r.y, w: Math.round(r.width), h: Math.round(r.height) }
})

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1680, height: 950 } })
  const errors = []
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })

  await page.goto('http://127.0.0.1:5182', { waitUntil: 'networkidle' })
  await page.evaluate((p) => localStorage.setItem('animation-editor-project-v1', JSON.stringify(p)), project)
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)

  const rz = await boxOf(page, '.os-timeline-resizer')
  console.log('resizer box:', rz)
  const tl1 = await boxOf(page, '.os-timeline')
  console.log('timeline h (default):', tl1.h)

  // 1) hover 边界条：线变亮 + 抓手出现 + 显示 badge
  await page.mouse.move(rz.x + rz.w / 2, rz.y + rz.h / 2)
  await page.waitForTimeout(300)
  await page.screenshot({ path: 'rz-1-hover.png' })

  // 2) 往上拖 → 轨道变高（拖拽中截图，看 badge）
  await page.mouse.down()
  await page.mouse.move(rz.x + rz.w / 2, rz.y - 150, { steps: 14 })
  await page.waitForTimeout(200)
  await page.screenshot({ path: 'rz-2-dragging-up.png' })
  await page.mouse.up()
  await page.waitForTimeout(300)
  const tl2 = await boxOf(page, '.os-timeline')
  console.log('timeline h (after drag up 150):', tl2.h)
  await page.screenshot({ path: 'rz-3-tall.png' })

  // 3) 往下拖 → 轨道变矮
  const rz2 = await boxOf(page, '.os-timeline-resizer')
  await page.mouse.move(rz2.x + rz2.w / 2, rz2.y + rz2.h / 2)
  await page.mouse.down()
  await page.mouse.move(rz2.x + rz2.w / 2, rz2.y + 200, { steps: 12 })
  await page.mouse.up()
  await page.waitForTimeout(300)
  const tl3 = await boxOf(page, '.os-timeline')
  console.log('timeline h (after drag down 200):', tl3.h)
  await page.screenshot({ path: 'rz-4-short.png' })

  // 4) 双击恢复默认
  const rz3 = await boxOf(page, '.os-timeline-resizer')
  await page.mouse.dblclick(rz3.x + rz3.w / 2, rz3.y + rz3.h / 2)
  await page.waitForTimeout(300)
  const tl4 = await boxOf(page, '.os-timeline')
  console.log('timeline h (after dblclick reset):', tl4.h)

  // 5) 键盘方向键微调
  await page.focus('.os-timeline-resizer')
  await page.keyboard.press('ArrowUp')
  await page.keyboard.press('ArrowUp')
  await page.waitForTimeout(200)
  const tl5 = await boxOf(page, '.os-timeline')
  console.log('timeline h (after 2x ArrowUp):', tl5.h)
  await page.screenshot({ path: 'rz-5-keyboard.png' })

  console.log('errors:', errors.slice(0, 5))
  await browser.close()
})()

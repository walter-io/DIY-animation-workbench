const { chromium } = require('playwright')

const HOST = process.argv[2] ?? 'http://127.0.0.1:5180'

const project = {
  name: 'paint-test',
  skin: 'dark',
  style: 'glass',
  font: 'sans',
  palette: { accent: '#5ac8fa', data: '#5ac8fa', special: '#ffd166' },
  cardOpacity: 0.65,
  fps: 30,
  duration: 20,
  layout: 'edit',
  instances: [
    {
      id: 'hdr',
      effectId: 'section-header',
      name: '段头卡',
      start: 0,
      duration: 20,
      slot: 'center',
      fit: 'box',
      free: true,
      x: 540,
      y: 380,
      w: 840,
      h: 320,
      params: { num: '01', title: '第一部分', subtitle: '本段讲什么是真正重要', accent: '' },
    },
  ],
}

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1680, height: 950 } })
  const errors = []
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })

  await page.goto(HOST, { waitUntil: 'networkidle' })
  await page.evaluate((p) => {
    localStorage.setItem('animation-editor-project-v1', JSON.stringify(p))
  }, project)
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(800)

  // 把播放头推到 2s，让动画进行一段（段头卡 01 的 opacity 是 progress*4）
  await page.evaluate(() => {
    // 找到时间轴点击 2s 位置：.os-ruler click 触 dispatch seek
    // 简单起见：模拟点击 .os-ruler 上的第 2 秒
    const ruler = document.querySelector('.os-ruler')
    if (ruler) {
      const r = ruler.getBoundingClientRect()
      // 假设 duration=20s，时间轴宽度 = r.width
      const x = r.left + (2 / 20) * r.width
      const e = new MouseEvent('click', { bubbles: true, clientX: x, clientY: r.top + 5 })
      ruler.dispatchEvent(e)
    }
  })
  await page.waitForTimeout(400)

  // 开着色笔
  await page.click('button:has-text("着色笔")')
  await page.waitForTimeout(300)

  // 用 mouse 直接点 "01" 文字区域（卡片左侧大字）
  const canvas = await page.$('.os-canvas')
  const box = await canvas.boundingBox()
  // hdr 卡片 x=540..1380, y=380..700 在画布坐标；比例映射到屏幕
  // 文字"01"在卡的左 20% 处
  const sx = box.x + (540 + 200) / 1920 * box.width
  const sy = box.y + (380 + 160) / 1080 * box.height
  await page.mouse.move(sx, sy)
  await page.waitForTimeout(400)
  await page.screenshot({ path: 'paint-1-hover.png' })
  await page.mouse.click(sx, sy)
  await page.waitForTimeout(500)
  await page.screenshot({ path: 'paint-2-popover.png' })

  // 选玫红（第二排第一个色块 #ff7ab0）
  const swatch = await page.$('.os-paint-pop .os-paint-swatches button:nth-child(5)')
  if (swatch) {
    await swatch.click()
    await page.waitForTimeout(400)
  }
  await page.screenshot({ path: 'paint-3-applied.png' })

  // 取右侧面板 局部着色列表
  const paintItems = await page.evaluate(() => {
    return [...document.querySelectorAll('.os-paint-item .os-paint-item-text')].map((el) => el.textContent)
  })
  console.log('paint items:', paintItems)
  console.log('errors:', errors.slice(0, 5))

  await browser.close()
})()

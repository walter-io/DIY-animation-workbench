const { chromium } = require('playwright')

const HOST = process.argv[2] ?? 'http://127.0.0.1:5180'
const project = {
  name: 'shot',
  skin: 'dark',
  style: 'glass',
  font: 'sans',
  palette: { accent: '#5ac8fa', data: '#5ac8fa', special: '#ffd166' },
  cardOpacity: 0.65,
  fps: 30,
  duration: 20,
  layout: 'edit',
  instances: [
    { id: 'a1', effectId: 'core-number-roller', name: '数字滚动', start: 0, duration: 6, slot: 'left', fit: 'auto', params: { label: '累计交付', target: 12847, suffix: '+', duration: 2, align: 'left', accent: '' } },
    { id: 'a2', effectId: 'bullet-list', name: '要点清单', start: 0, duration: 6, slot: 'right', fit: 'auto', params: { title: '三个要点', items: '第一点内容\n第二点内容\n第三点内容', accent: '' } },
    { id: 'a3', effectId: 'section-header', name: '段头卡', start: 0, duration: 6, slot: 'center', fit: 'box', free: true, x: 600, y: 800, w: 720, h: 200, params: { num: '01', title: '第一部分', subtitle: '本段讲什么是真正重要', accent: '' } },
    { id: 'a4', effectId: 'srcvid-hero-title', name: '主标题', start: 7, duration: 6, slot: 'center', fit: 'full', params: { title: '正式搬到台前', subtitle: '一套个人IP内容工程的公开拆解', accent: '' } },
    { id: 'a5', effectId: 'bar-chart-race', name: '条形图竞速', start: 14, duration: 6, slot: 'left', fit: 'box', free: true, x: 200, y: 200, w: 720, h: 480, params: { title: '区域数据竞速', subtitle: '前十排名变化', rows: '华东,23320\n华南,17730\n华北,12400\n西南,8600\n东北,6200\n华中,5100\n西北,4300\n海外,3200', unit: '', color: 'var(--stage-data)', showRank: true, size: 1, accent: '' } },
  ],
}

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1680, height: 950 } })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))

  await page.goto(HOST, { waitUntil: 'networkidle' })
  await page.evaluate((p) => {
    localStorage.setItem('animation-editor-project-v1', JSON.stringify(p))
  }, project)
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(3500)

  // 1. 整体总览（auto / box / full 共存）
  await page.screenshot({ path: 'shot-overview.png' })

  // 2. 拖到主标题出现，验证铺满
  await page.evaluate(() => {
    // 触发 seek：通过点击时间轴中段无法直接；用 store API 不可行。
    // 用键盘空格播放然后再 seek 太复杂；简单：把当前 time 改成 9
    // 直接派发 seek 事件没法（store 是闭包的），改用 playback 加速。
  })
  await page.click('.os-transport .os-btn:not(.os-btn-ghost)')  // 播放
  await page.waitForTimeout(1500)
  await page.screenshot({ path: 'shot-fullscreen.png' })
  await page.click('.os-transport .os-btn:not(.os-btn-ghost)')  // 暂停

  // 3. 切到 紫色 主题
  await page.click('button:has-text("主题色")')
  await page.waitForTimeout(300)
  await page.click('button:has-text("紫罗兰")')
  await page.waitForTimeout(300)
  await page.screenshot({ path: 'shot-violet.png' })
  // 关闭弹窗
  await page.keyboard.press('Escape')
  await page.waitForTimeout(200)

  // 4. 切回冰蓝
  await page.click('button:has-text("主题色")')
  await page.click('button:has-text("冰蓝")')
  await page.keyboard.press('Escape')

  // 5. 打开着色笔
  await page.click('button:has-text("着色笔")')
  await page.waitForTimeout(300)
  await page.screenshot({ path: 'shot-paint-mode.png' })

  // 6. 模拟悬停 + 点击 段头卡的 "01" 区域
  const target = await page.$('.os-canvas')
  const box = await target.boundingBox()
  // 段头卡 (a3) 在 600,800 canvas 处，宽720高200；按缩放估算屏幕坐标
  // canvas 在画布区域 252~1428，宽度 1176；画布大小 1920，所以 600/1920 * 1176 = 367
  // 文字"01"在卡左半区
  const x = box.x + (200 / 1920) * box.width
  const y = box.y + (900 / 1080) * box.height
  await page.mouse.move(x, y)
  await page.waitForTimeout(300)
  await page.screenshot({ path: 'shot-paint-hover.png' })
  await page.mouse.click(x, y)
  await page.waitForTimeout(400)
  await page.screenshot({ path: 'shot-paint-popover.png' })
  // 选个玫红色
  const popSwatch = await page.$('.os-paint-pop .os-paint-swatches .os-paint-swatch')
  if (popSwatch) await popSwatch.click()
  await page.waitForTimeout(400)
  await page.screenshot({ path: 'shot-paint-applied.png' })
  // 退出着色
  await page.keyboard.press('Escape')
  await page.waitForTimeout(200)

  // 7. 选 bullet-list，看右面板 尺寸/颜色 区域
  await page.click('[data-effect-id="bullet-list"]')
  await page.waitForTimeout(400)
  await page.screenshot({ path: 'shot-panel.png' })

  console.log('errors:', JSON.stringify(errors.slice(0, 6)))
  await browser.close()
})()

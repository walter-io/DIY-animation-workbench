const { chromium } = require('playwright')

const project = {
  name: 'host-test', skin: 'dark', style: 'glass', font: 'sans',
  palette: { accent: '#5ac8fa', data: '#5ac8fa', special: '#ffd166' },
  host: {
    layout: 'off', x: 1384, y: 754, w: 480, h: 270,
    circular: false, radius: 24, mirror: true,
    borderWidth: 4, borderColor: '#ffffff', shadow: true, opacity: 1,
  },
  cardOpacity: 0.65, fps: 30, duration: 20, layout: 'edit', presets: [],
  instances: [
    { id: 'h1', effectId: 'section-header', name: '段头', start: 0, duration: 20, slot: 'center', fit: 'full', params: { num: '01', title: '第一部分', subtitle: '这里讲结构', accent: '' } },
  ],
}

const probe = (page) => page.evaluate(() => {
  const host = document.querySelector('.os-host')
  const safe = document.querySelector('.os-content-safe')
  const card = document.querySelector('.os-inst')
  const canvas = document.querySelector('.os-canvas')
  const box = (el) => {
    if (!el) return null
    const r = el.getBoundingClientRect()
    const cr = canvas.getBoundingClientRect()
    const k = 1920 / cr.width
    return { x: Math.round((r.left - cr.left) * k), y: Math.round((r.top - cr.top) * k), w: Math.round(r.width * k), h: Math.round(r.height * k) }
  }
  return {
    host: box(host),
    hostRadius: host ? getComputedStyle(host).borderRadius : null,
    hostBorder: host ? getComputedStyle(host).borderTopWidth : null,
    safe: box(safe),
    card: box(card),
    hasVideo: !!document.querySelector('.os-host video'),
  }
})

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1680, height: 950 } })
  const errors = []
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })

  await page.goto('http://127.0.0.1:5190/', { waitUntil: 'networkidle' })
  await page.evaluate((p) => localStorage.setItem('animation-editor-project-v1', JSON.stringify(p)), project)
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(900)

  // 导入出镜视频（走 UI：顶栏「出镜」→ 文件选择）
  await page.click('button:has-text("出镜")')
  await page.waitForTimeout(300)
  await page.setInputFiles('.os-dd-form input[type=file]', 'public/host-sample.mp4')
  await page.waitForTimeout(700)
  await page.screenshot({ path: 'host-1-picker.png', clip: { x: 0, y: 0, width: 1680, height: 560 } })

  const layouts = ['circle-br', 'circle-bl', 'card-br', 'split-right', 'bar-bottom', 'full']
  for (const id of layouts) {
    await page.evaluate((layout) => {
      // 通过点击预设按钮切换
      const btn = [...document.querySelectorAll('.os-host-opt')].find((b) => b.title && b.title.length > 0)
      void btn
      void layout
    }, id)
  }
  // 直接点缩略图按钮（第 n 个）
  const order = ['不显示', '右下圆', '左下圆', '右下圆角卡', '左下圆角卡', '右侧半屏', '左侧半屏', '底部横条', '全屏垫底', '自定义']
  for (const name of ['右下圆', '右侧半屏', '底部横条', '全屏垫底']) {
    const idx = order.indexOf(name)
    const btns = await page.$$('.os-host-opt')
    await btns[idx].click()
    await page.waitForTimeout(500)
    const p = await probe(page)
    console.log(`【${name}】 host=${JSON.stringify(p.host)} r=${p.hostRadius} border=${p.hostBorder}`)
    console.log(`        内容区=${JSON.stringify(p.safe)}  卡片=${JSON.stringify(p.card)}  video=${p.hasVideo}`)
    await page.screenshot({ path: `host-${name}.png`, clip: { x: 250, y: 40, width: 1180, height: 700 } })
  }

  console.log('errors:', errors.slice(0, 5))
  await browser.close()
})()

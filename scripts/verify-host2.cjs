const { chromium } = require('playwright')

const baseHost = {
  layout: 'off', x: 1384, y: 754, w: 480, h: 270,
  circular: false, radius: 24,
  focalX: 50, focalY: 50, zoom: 1, mirror: false,
  borderWidth: 4, borderColor: '#ffffff', shadow: true, opacity: 1,
}

const project = {
  name: 'host2', skin: 'dark', style: 'glass', font: 'sans',
  palette: { accent: '#5ac8fa', data: '#5ac8fa', special: '#ffd166' },
  host: { ...baseHost }, hostClips: [], cardOpacity: 0.65,
  fps: 30, duration: 24, layout: 'edit', presets: [],
  instances: [
    { id: 'i1', effectId: 'section-header', name: '段头', start: 0, duration: 24, slot: 'center', fit: 'full', params: { num: '01', title: '测试', subtitle: '内容区随布局变', accent: '' } },
  ],
}

const probe = (page) => page.evaluate(() => {
  const host = document.querySelector('.os-host')
  const video = document.querySelector('.os-host video')
  const safe = document.querySelector('.os-content-safe')
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
    radius: host ? getComputedStyle(host).borderRadius : null,
    objPos: video ? getComputedStyle(video).objectPosition : null,
    vTransform: video ? getComputedStyle(video).transform : null,
    safe: box(safe),
  }
})

const seek = async (page, t) => {
  await page.evaluate((time) => {
    const ruler = document.querySelector('.os-ruler')
    const r = ruler.getBoundingClientRect()
    ruler.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: r.left + (time / 24) * r.width, clientY: r.top + 5 }))
  }, t)
  await page.waitForTimeout(350)
}

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1680, height: 950 } })
  const errors = []
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })

  await page.goto('http://127.0.0.1:5191/', { waitUntil: 'networkidle' })
  await page.evaluate((p) => {
    localStorage.removeItem('animation-editor-host-mirror-default-fixed')
    localStorage.setItem('animation-editor-project-v1', JSON.stringify(p))
  }, project)
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(900)

  await page.click('button:has-text("出镜")')
  await page.waitForTimeout(300)
  await page.setInputFiles('.os-dd-form input[type=file]', 'public/host-sample.mp4')
  await page.waitForTimeout(700)

  // ===== 问题 2：镜像默认必须关 =====
  const mirrorState = await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('animation-editor-project-v1') || '{}')
    return { mirror: raw.host?.mirror, fixed: localStorage.getItem('animation-editor-host-mirror-default-fixed') }
  })
  console.log('【2. 镜像】默认值 =', mirrorState.mirror, '| 迁移标记 =', mirrorState.fixed)

  // ===== 问题 1：镜头焦点可选 =====
  const order = ['不显示', '右下圆', '左下圆', '右下圆角卡', '左下圆角卡', '右侧半屏', '左侧半屏', '底部横条', '全屏垫底', '自定义']
  const btns = await page.$$('.os-host-opt')
  await btns[order.indexOf('右下圆')].click()
  await page.waitForTimeout(400)
  console.log('\n【1. 镜头焦点】')
  for (const name of ['正中', '右', '左下']) {
    const cells = await page.$$('.os-focal-cell')
    const idx = ['左上', '上', '右上', '左', '正中', '右', '左下', '下', '右下'].indexOf(name)
    await cells[idx].click()
    await page.waitForTimeout(350)
    const p = await probe(page)
    console.log(`  焦点「${name}」→ object-position = ${p.objPos}`)
  }
  // 放大
  await page.evaluate(() => {
    const row = [...document.querySelectorAll('.os-dd-row')].find((r) => r.textContent.includes('画面放大'))
    const input = row?.querySelector('input[type=range]')
    if (input) {
      const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
      set.call(input, '1.8')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    }
  })
  await page.waitForTimeout(350)
  const zoomed = await probe(page)
  console.log(`  放大 1.8× → transform = ${zoomed.vTransform}`)

  // ===== 问题 3：机位分段 =====
  console.log('\n【3. 机位分段】')
  await seek(page, 0)
  await page.click('button:has-text("＋ 播放头处加一段")')
  await page.waitForTimeout(300)
  await seek(page, 8)
  await page.click('button:has-text("＋ 播放头处加一段")')
  await page.waitForTimeout(300)
  await seek(page, 16)
  await page.click('button:has-text("＋ 播放头处加一段")')
  await page.waitForTimeout(300)

  const clips = await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('animation-editor-project-v1') || '{}')
    return raw.hostClips.map((c) => ({ start: c.start, duration: c.duration, layout: c.layout }))
  })
  console.log('  已建段:', JSON.stringify(clips))

  // 给三段分别设不同布局：0-5 右下圆 / 8-13 左侧半屏 / 16-21 底部横条
  const setLayout = async (t, layoutName) => {
    await seek(page, t)
    const b = await page.$$('.os-host-opt')
    await b[order.indexOf(layoutName)].click()
    await page.waitForTimeout(350)
  }
  await setLayout(1, '右下圆')
  await setLayout(9, '左侧半屏')
  await setLayout(17, '底部横条')

  const clips2 = await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('animation-editor-project-v1') || '{}')
    return raw.hostClips.map((c) => `${c.start}-${c.start + c.duration}s:${c.layout}`)
  })
  console.log('  各段布局:', JSON.stringify(clips2))

  // 播放头走到不同段，看画面几何是否跟着变
  for (const [t, label] of [[2, '第1段(右下圆)'], [10, '第2段(左侧半屏)'], [18, '第3段(底部横条)'], [23, '段外(全局off)']]) {
    await seek(page, t)
    const p = await probe(page)
    console.log(`  t=${t}s ${label}: host=${JSON.stringify(p.host)} r=${p.radius} 内容区=${JSON.stringify(p.safe)}`)
  }

  // 机位轨道 DOM
  const lane = await page.evaluate(() => {
    const c = [...document.querySelectorAll('.os-host-clip')]
    const labels = [...document.querySelectorAll('.os-track-label')].map((n) => n.textContent)
    return { count: c.length, names: c.map((n) => n.textContent.replace(/[↔]/g, '')), labels }
  })
  console.log('  机位轨道:', JSON.stringify(lane))

  await seek(page, 10)
  await page.screenshot({ path: 'host2-split.png', clip: { x: 250, y: 40, width: 1180, height: 660 } })
  await page.click('button:has-text("出镜")')
  await page.waitForTimeout(400)
  await page.screenshot({ path: 'host2-panel.png', clip: { x: 1150, y: 0, width: 530, height: 950 } })

  console.log('\nerrors:', errors.slice(0, 5))
  await browser.close()
})()

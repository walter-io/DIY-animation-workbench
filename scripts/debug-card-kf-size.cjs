/**
 * 诊断脚本：铺满↔自适应关键帧建立后，各种「改尺寸」操作逐一过一遍，
 * 打印每步之后的关键帧数据与画布实测外框，定位用户报的「尺寸不行」。
 *
 *   node scripts/debug-card-kf-size.cjs   （自己拉起 vite，跑完杀掉）
 */
const { chromium } = require('playwright')
const { spawn } = require('child_process')
const http = require('http')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const KEY = 'animation-editor-project-v1'
const PORT = process.env.PORT || '5194'
const BASE = `http://localhost:${PORT}/`

const readProject = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || '{}'), KEY)

const cardBox = (page) =>
  page.evaluate(() => {
    const el = document.querySelector('[data-paint-id] .os-card')
    const canvas = document.querySelector('.os-canvas')
    if (!el || !canvas) return null
    const r = el.getBoundingClientRect()
    const c = canvas.getBoundingClientRect()
    return {
      x: Math.round(((r.left - c.left) * 1920) / c.width),
      y: Math.round(((r.top - c.top) * 1080) / c.height),
      w: Math.round((r.width * 1920) / c.width),
      h: Math.round((r.height * 1080) / c.height),
    }
  })

const dump = (label, page) =>
  (async () => {
    const proj = await readProject(page)
    const kfs = (proj.instances[0].keyframes ?? []).map((k) => ({
      t: +k.t.toFixed(2),
      x: k.x,
      y: k.y,
      w: k.w,
      h: k.h,
      s: k.scale,
    }))
    const box = await cardBox(page)
    console.log(`\n--- ${label}`)
    console.log('    帧数据:', JSON.stringify(kfs))
    console.log('    画布实测:', JSON.stringify(box))
    return { kfs, box }
  })()

const project = {
  name: 'card-kf-size-debug',
  skin: 'dark',
  style: 'glass',
  font: 'sans',
  palette: { accent: '#5ac8fa', data: '#5ac8fa', special: '#ffd166' },
  host: { layout: 'off' },
  hostClips: [],
  fps: 30,
  duration: 10,
  layout: 'edit',
  presets: [],
  instances: [
    {
      id: 'card_1',
      effectId: 'bullet-list',
      name: '要点清单卡',
      start: 0,
      duration: 8,
      slot: 'center',
      fit: 'full',
      params: { title: '测试卡', items: '第一点\n第二点\n第三点' },
    },
  ],
}

async function waitServer() {
  for (let i = 0; i < 80; i++) {
    const ok = await new Promise((resolve) => {
      const r = http.get(BASE, () => resolve(true))
      r.on('error', () => resolve(false))
      r.setTimeout(500, () => {
        r.destroy()
        resolve(false)
      })
    })
    if (ok) return true
    await new Promise((r) => setTimeout(r, 500))
  }
  return false
}

;(async () => {
  const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--port', PORT, '--strictPort'], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  vite.stdout.on('data', () => {})
  vite.stderr.on('data', () => {})
  const ready = await waitServer()
  if (!ready) {
    console.error('vite failed')
    vite.kill()
    process.exit(2)
  }
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1680, height: 950 } })
  const errors = []
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })

  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.evaluate((k) => localStorage.removeItem(k), KEY)
  await page.evaluate(({ p, k }) => localStorage.setItem(k, JSON.stringify(p)), { p: project, k: KEY })
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)

  const seek = async (t) => {
    await page.evaluate((time) => {
      const ticks = [...document.querySelectorAll('.os-tick')]
      const k = Math.max(0, Math.min(ticks.length - 2, Math.floor(time)))
      const a = ticks[k].getBoundingClientRect()
      const b = ticks[k + 1]?.getBoundingClientRect()
      const cx = a.left + a.width / 2
      const pps = b ? b.left + b.width / 2 - cx : 36
      document
        .querySelector('.os-ruler')
        .dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: cx + (time - k) * pps, clientY: a.top + 5 }))
    }, t)
    await page.waitForTimeout(300)
  }

  await page.click('.os-tracks .os-clip')
  await page.waitForTimeout(300)

  console.log('=== A. 建立铺满→自适应 两帧（上一轮已验证的路径）===')
  await seek(1)
  await page.click('.os-btn-kf')
  await page.waitForTimeout(400)
  await dump('t1 按 🔑 后', page)
  await seek(4)
  await page.click('.os-seg-fit button:has-text("内容自适应")')
  await page.waitForTimeout(800)
  await dump('t4 点内容自适应后', page)

  console.log('\n=== B. 回第一帧改「宽」输入框（点菱形精确跳转后改）===')
  await page.click('.os-kf-marker >> nth=0')
  await page.waitForTimeout(500)
  await dump('点第一帧菱形后（应显示铺满框）', page)
  const wInput = page.locator('.os-param-row:has(label:has-text("宽")) input[type="number"]').first()
  await wInput.fill('900')
  await page.waitForTimeout(500)
  await dump('改宽=900 后', page)

  console.log('\n=== C. 在第二帧上改「缩放」滑杆 ===')
  await page.click('.os-kf-marker >> nth=1')
  await page.waitForTimeout(500)
  // 动画区的「缩放」滑杆（data-size="scale" 上面那排是布局档，动画区是第二个 range）
  const scaleSlider = page.locator('.os-inline-range:has-text("缩放") input[type="range"]').last()
  await scaleSlider.fill('1.5')
  await page.waitForTimeout(500)
  await dump('第二帧缩放 150% 后', page)

  console.log('\n=== D. 尺寸档「小」===')
  await page.click('.os-seg-cardsize button:has-text("小")')
  await page.waitForTimeout(500)
  await dump('点尺寸档「小」后', page)

  console.log('\n=== E. 画布拖拽缩放手柄 ===')
  const handle = await page.locator('.os-free-resize').boundingBox()
  if (handle) {
    await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2)
    await page.mouse.down()
    await page.mouse.move(handle.x + handle.width / 2 + 120, handle.y + handle.height / 2 + 60, { steps: 8 })
    await page.mouse.up()
    await page.waitForTimeout(500)
  }
  await dump('拖拽缩放后', page)

  console.log('\n=== E2. 画布拖拽移动（位移写入，x/y 不应漂移）===')
  const card = await page.locator('[data-paint-id]').boundingBox()
  if (card) {
    await page.mouse.move(card.x + card.width / 2, card.y + card.height / 2)
    await page.mouse.down()
    await page.mouse.move(card.x + card.width / 2 + 100, card.y + card.height / 2 + 60, { steps: 8 })
    await page.mouse.up()
    await page.waitForTimeout(500)
  }
  await dump('拖拽移动后', page)

  console.log('\n=== F. 播放到中间看补间 ===')
  await seek(2.5)
  await page.waitForTimeout(400)
  await dump('t2.5 补间中', page)

  console.log('\n报错:', errors.length ? errors.slice(0, 3).join(' | ') : '无')
  await browser.close()
  vite.kill()
  process.exit(0)
})().catch((e) => {
  console.error(e)
  process.exit(2)
})

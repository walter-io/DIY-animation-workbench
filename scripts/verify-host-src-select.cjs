/**
 * 验证出镜素材条的截断体验改进：
 *   1. 手柄够大（>12px），能抓得住
 *   2. 点击素材条 → 选中高亮 + 参数面板出现数字编辑器
 *   3. 拖手柄截断（手动操作）
 *   4. 参数面板数字改入点/时长（精确截断，不依赖小拖柄）
 */
const { chromium } = require('playwright')
const path = require('path')

const KEY = 'animation-editor-project-v1'
const PORT = process.env.PORT || '5188'
const DURATION = 24
const HOST_VIDEO = path.join(__dirname, '_tmp', 'host-sample.mp4')
const SHOT = path.join(__dirname, '_tmp', 'host-src-select.png')

const project = {
  name: 'host-src-test', skin: 'dark', style: 'glass', font: 'sans',
  palette: { accent: '#5ac8fa', data: '#5ac8fa', special: '#ffd166' },
  host: { layout: 'circle-br', x: 1384, y: 754, w: 480, h: 270, circular: false, radius: 24, focalX: 50, focalY: 50, zoom: 1, mirror: false, borderWidth: 4, borderColor: '#ffffff', shadow: true, opacity: 1 },
  hostClips: [], cardOpacity: 0.65, fps: 30, duration: DURATION, layout: 'edit', presets: [],
  instances: [
    { id: 'i1', effectId: 'section-header', name: '段头', start: 0, duration: DURATION, slot: 'center', fit: 'full', params: { num: '01', title: '测试', subtitle: 'x', accent: '' } },
  ],
}

const readProject = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('animation-editor-project-v1') || '{}'))
const readTrack = async (page) => (await readProject(page)).hostTracks?.[0]

const seek = async (page, t) => {
  await page.evaluate((time) => {
    const ticks = [...document.querySelectorAll('.os-tick')]
    const k = Math.max(0, Math.min(ticks.length - 2, Math.floor(time)))
    const a = ticks[k].getBoundingClientRect()
    const b = ticks[k + 1]?.getBoundingClientRect()
    const cx = a.left + a.width / 2
    const pxPerSec = b ? b.left + b.width / 2 - cx : 36
    const ruler = document.querySelector('.os-ruler')
    ruler.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: cx + (time - k) * pxPerSec, clientY: a.top + 5 }))
  }, t)
  await page.waitForTimeout(300)
  return await page.evaluate(() => {
    const txt = (document.querySelector('.os-time')?.textContent || '0:00').split('/')[0].trim()
    const [m, s] = txt.split(':').map(Number)
    return m * 60 + s
  })
}

const hasHost = (page) => page.evaluate(() => !!document.querySelector('.os-host'))

const dragBy = async (page, selector, dx) => {
  const el = await page.$(selector)
  if (!el) throw new Error('找不到：' + selector)
  const box = await el.boundingBox()
  const y = box.y + box.height / 2
  const x0 = box.x + box.width / 2
  await page.mouse.move(x0, y)
  await page.mouse.down()
  await page.mouse.move(x0 + dx, y, { steps: 8 })
  await page.mouse.up()
  await page.waitForTimeout(350)
}

let pass = 0, fail = 0
const check = (name, ok, detail) => {
  console.log(`  ${ok ? '✅' : '❌'} ${name}${detail ? ' → ' + detail : ''}`)
  ok ? pass++ : fail++
}
const near = (a, b, t = 0.03) => Math.abs(a - b) <= t

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1680, height: 950 } })
  const errors = []
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })

  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle' })
  await page.evaluate((p) => localStorage.setItem('animation-editor-project-v1', JSON.stringify(p)), project)
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(900)

  // 导入出镜视频
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => (x.textContent || '').includes('出镜 ·'))
    b && b.click()
  })
  await page.waitForTimeout(350)
  await page.setInputFiles('.os-dd-form input[type=file]', HOST_VIDEO)
  await page.waitForTimeout(1200)
  await page.keyboard.press('Escape')
  await page.mouse.click(840, 60)
  await page.waitForTimeout(400)

  // 选中卡片，让参数面板出现
  await page.click('.os-clip')
  await page.waitForTimeout(300)

  // ===== 1. 手柄尺寸够大，能抓住 =====
  console.log('\n=== 1. 手柄够大（>12px 能抓住）===')
  const handleDims = await page.evaluate(() => {
    const h = document.querySelector('.os-host-src .os-clip-handle-right')
    if (!h) return null
    const r = h.getBoundingClientRect()
    return { w: Math.round(r.width), h: Math.round(r.height) }
  })
  check('右手柄宽度 ≥ 10px', handleDims && handleDims.w >= 10, JSON.stringify(handleDims))
  check('右手柄高度 ≥ 12px（探出条子上下）', handleDims && handleDims.h >= 12, JSON.stringify(handleDims))

  // ===== 2. 点击素材条 → 选中高亮 + 参数面板出现数字编辑器 =====
  console.log('\n=== 2. 点击素材条 → 选中高亮 ===')
  await page.click('.os-host-src')
  await page.waitForTimeout(350)
  const selClass = await page.evaluate(() => document.querySelector('.os-host-src')?.className || '')
  check('素材条获得 .selected 高亮', selClass.includes('selected'), selClass)

  const panelText = await page.evaluate(() =>
    (document.querySelector('.os-panel-right')?.textContent || '').slice(0, 300)
  )
  check('参数面板出现「起点」编辑器', panelText.includes('起点'), panelText.slice(0, 80))
  check('参数面板出现「入点」编辑器', panelText.includes('入点'), '')
  check('参数面板出现「时长」编辑器', panelText.includes('时长'), '')
  check('参数面板出现「源总时长」只读字段', panelText.includes('源总时长'), '')

  // ===== 3. 参数面板改入点 → 截断生效 =====
  console.log('\n=== 3. 参数面板改入点（精确截断，不依赖小拖柄）===')
  let track = await readTrack(page)
  const SRC = track?.sourceDuration ?? 10
  const origTrimIn = track?.trimIn ?? 0
  check('初始入点为 0', near(origTrimIn, 0), String(origTrimIn))

  // 把入点改为 2s（裁掉前 2 秒）
  await page.evaluate(() => {
    const inputs = [...document.querySelectorAll('.os-host-track-grid input[type="number"]')]
    // inputs[0]=起点, [1]=入点, [2]=时长
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
    set.call(inputs[1], '2')
    inputs[1].dispatchEvent(new Event('input', { bubbles: true }))
  })
  await page.waitForTimeout(400)

  track = await readTrack(page)
  check('入点被改成 2s', near(track?.trimIn ?? -1, 2), `trimIn=${track?.trimIn}`)
  // 轨道上读数也要更新
  const trimText = await page.evaluate(() =>
    document.querySelector('.os-host-src .os-clip-trim')?.textContent || ''
  )
  check('轨道上裁剪读数显示「2.0~12.0s / 10.0s」', trimText.includes('2.0'), trimText)

  // ===== 4. 参数面板改时长 → 出点跟着变 =====
  console.log('\n=== 4. 参数面板改时长 ===')
  await page.evaluate(() => {
    const inputs = [...document.querySelectorAll('.os-host-track-grid input[type="number"]')]
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
    set.call(inputs[2], '5')
    inputs[2].dispatchEvent(new Event('input', { bubbles: true }))
  })
  await page.waitForTimeout(400)
  track = await readTrack(page)
  check('时长被改成 5s', near(track?.duration ?? -1, 5), `duration=${track?.duration}`)
  const trimText2 = await page.evaluate(() =>
    document.querySelector('.os-host-src .os-clip-trim')?.textContent || ''
  )
  check('轨道读数变为「2.0~7.0s / 10.0s」（出点 = 2+5）', trimText2.includes('7.0'), trimText2)

  // ===== 5. 区间外画面消失（截断真的生效）=====
  console.log('\n=== 5. 截断生效：区间外无画面 ===')
  // 当前：起点 0，时长 5，所以素材条覆盖 0~5s
  // 拖到 t=0.5s（在区间内）
  const at1 = await seek(page, 0.5)
  const has1 = await hasHost(page)
  // t=8s（区间外：起点0+时长5，区间只到 5s）
  const at2 = await seek(page, 8)
  const has2 = await hasHost(page)
  check('t≈0.5s（区间内）：有画面', has1, `落点 ${at1}s`)
  check('t≈8s（区间外 0+5=5s 截断后）：无画面', !has2, `落点 ${at2}s`)

  // ===== 6. 拖手柄截断 =====
  console.log('\n=== 6. 拖手柄截断 ===')
  const pps = await page.evaluate((key) => {
    const el = document.querySelector('.os-host-src')
    const raw = JSON.parse(localStorage.getItem(key) || '{}')
    return el && raw.hostTracks?.[0] ? el.getBoundingClientRect().width / raw.hostTracks[0].duration : 36
  }, KEY)
  await dragBy(page, '.os-host-src .os-clip-handle-right', -2 * pps)
  await page.waitForTimeout(400)
  track = await readTrack(page)
  check('拖手柄往左 2s → 时长变为 3s', near(track?.duration ?? -1, 3), `duration=${track?.duration}`)

  // 轨道读数
  const trimText3 = await page.evaluate(() =>
    document.querySelector('.os-host-src .os-clip-trim')?.textContent || ''
  )
  check('轨道读数更新为「2.0~5.0s / 10.0s」', trimText3.includes('5.0'), trimText3)

  // ===== 7. 截图 =====
  const panel = await page.$('.os-panel-right')
  if (panel) await panel.screenshot({ path: SHOT })
  console.log(`\n参数面板截图：${path.relative(process.cwd(), SHOT)}`)

  console.log('\n=== 控制台错误 ===')
  console.log(errors.length ? errors.join('\n') : '  无')
  console.log(`\n结果：${pass} 通过 / ${fail} 失败`)
  await browser.close()
  process.exit(fail ? 1 : 0)
})()

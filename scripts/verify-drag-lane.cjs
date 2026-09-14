/**
 * 时间轴拖动验证（需要 dev server 绑 IPv4）：
 *
 *   npx vite --port 5188 --strictPort --host 127.0.0.1
 *   npm run verify:drag
 *
 * A. 上下拖动换轨道：动效卡可以在「左/右/中/下/上」之间换泳道
 * B. 上下换轨时不影响左右移动（时间仍然跟着走）
 * C. 口播字幕锁定在字幕轨，拖不上去也拖不下来
 */
const { chromium } = require('playwright')

const BASE = process.env.VERIFY_BASE || 'http://127.0.0.1:5188'
const KEY = 'animation-editor-project-v1'

const DEFAULT_HOST = {
  layout: 'off', x: 1384, y: 754, w: 480, h: 270, circular: false, radius: 24,
  focalX: 50, focalY: 50, zoom: 1, mirror: false, borderWidth: 4,
  borderColor: '#ffffff', shadow: true,
}

const mk = (instances) => ({
  name: 'drag-test', skin: 'dark', style: 'glass', font: 'sans',
  palette: { accent: '#5ac8fa', data: '#5ac8fa', special: '#ffd166' },
  host: { ...DEFAULT_HOST }, hostClips: [],
  subtitleStyle: { fontSize: 44, align: 'center', color: '#ffffff', box: true, bg: 'rgba(0,0,0,0.55)', slot: 'bottom' },
  cardOpacity: 0.35, cardOpacityV2: true, fps: 30, duration: 10, layout: 'edit', presets: [],
  instances,
})

const card = (id, slot, start = 1) => ({
  id, effectId: 'bullet-list', name: '要点清单卡', start, duration: 3, slot, fit: 'auto', params: {},
})

let passed = 0
let failed = 0
function ok(name, cond, detail) {
  if (cond) { passed++; console.log(`  ✓ ${name}`) }
  else { failed++; console.log(`  ✗ ${name}${detail !== undefined ? ` — ${detail}` : ''}`) }
}
function section(t) { console.log(`\n${t}`) }

async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1680, height: 950 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))

  const readProject = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || 'null'), KEY)
  const load = async (instances) => {
    await page.evaluate((p) => localStorage.setItem('animation-editor-project-v1', JSON.stringify(p)), mk(instances))
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1300)
  }
  /** 量出一条泳道的行高：相邻两条泳道上片段的 top 之差 */
  const measureRowH = () =>
    page.evaluate(() => {
      const tops = [...document.querySelectorAll('.os-clip')].map((el) => parseFloat(el.style.top))
      const uniq = [...new Set(tops)].sort((a, b) => a - b)
      return uniq.length >= 2 ? Math.round(uniq[1] - uniq[0]) : 0
    })
  /** 抓住片段中心拖动 (dx, dy) 像素 */
  const drag = async (id, dx, dy) => {
    const b = await page.locator(`.os-tracks .os-clip[data-inst-id="${id}"]`).boundingBox()
    if (!b) return false
    const cx = b.x + b.width / 2
    const cy = b.y + b.height / 2
    await page.mouse.move(cx, cy)
    await page.mouse.down()
    await page.mouse.move(cx + dx, cy + dy, { steps: 10 })
    await page.mouse.up()
    await page.waitForTimeout(250)
    return true
  }

  await page.goto(BASE, { waitUntil: 'domcontentloaded' })

  // ── 先量行高
  await load([card('a', 'left'), card('b', 'right')])
  const rowH = await measureRowH()
  ok('能量出泳道行高', rowH >= 8, String(rowH))
  console.log(`  行高 = ${rowH}px`)

  // ── A. 上下换轨道
  section('A. 上下拖动换轨道')
  await load([card('a', 'left')])
  let p = await readProject()
  ok('初始在左侧轨道', p.instances[0].slot === 'left', p.instances[0].slot)

  await drag('a', 0, rowH)
  p = await readProject()
  ok('向下拖一行 → 右侧', p.instances[0].slot === 'right', p.instances[0].slot)

  await drag('a', 0, rowH)
  p = await readProject()
  ok('再拖一行 → 居中', p.instances[0].slot === 'center', p.instances[0].slot)

  await drag('a', 0, rowH)
  p = await readProject()
  ok('再拖一行 → 底部', p.instances[0].slot === 'bottom', p.instances[0].slot)

  await drag('a', 0, rowH)
  p = await readProject()
  ok('再拖一行 → 顶部', p.instances[0].slot === 'top', p.instances[0].slot)

  await drag('a', 0, rowH)
  p = await readProject()
  ok('拖到底不会跑出轨道（停在顶部）', p.instances[0].slot === 'top', p.instances[0].slot)

  // 此时在顶部（第 6 行），向上 2 行应到居中（第 4 行）
  await drag('a', 0, -rowH * 2)
  p = await readProject()
  ok('向上拖回 → 居中', p.instances[0].slot === 'center', p.instances[0].slot)

  await drag('a', 0, -rowH * 6)
  p = await readProject()
  ok('拖到顶不会跑到字幕轨（停在左侧）', p.instances[0].slot === 'left', p.instances[0].slot)

  // ── B. 换轨道的同时左右仍生效
  section('B. 换轨道不影响左右移动')
  await load([card('a', 'left', 1)])
  const before = (await readProject()).instances[0].start
  await drag('a', 120, rowH)
  p = await readProject()
  ok('起点跟着右移', p.instances[0].start > before, `${before} → ${p.instances[0].start}`)
  ok('同时换了轨道', p.instances[0].slot === 'right', p.instances[0].slot)

  // ── C. 字幕锁在字幕轨
  section('C. 口播字幕锁定在字幕轨')
  await load([
    { id: 's1', effectId: 'srt-subtitle', name: '字幕', start: 0, duration: 3, slot: 'bottom', fit: 'auto', params: { text: '第一句' } },
    { id: 'c1', effectId: 'bullet-list', name: '卡', start: 5, duration: 3, slot: 'left', fit: 'auto', params: {} },
  ])
  const subBefore = (await readProject()).instances.find((i) => i.id === 's1')
  await drag('s1', 0, rowH * 2)
  const subAfter = (await readProject()).instances.find((i) => i.id === 's1')
  ok('字幕槽位没被拖动改掉', subAfter.slot === subBefore.slot, `${subBefore.slot} → ${subAfter.slot}`)
  const subLane = await page.evaluate(() => {
    const el = document.querySelector('.os-tracks .os-clip[data-inst-id="s1"]')
    return el ? el.style.top : null
  })
  ok('字幕仍在字幕轨（top = 3px）', subLane === '3px', String(subLane))

  ok('无页面报错', errors.length === 0, errors.slice(0, 2).join(' | '))
  await page.close()
  browser.close().catch(() => undefined)
}

main()
  .then(() => {
    console.log('\n' + '─'.repeat(48))
    console.log(failed === 0 ? `全部通过：${passed} 项` : `通过 ${passed} 项，失败 ${failed} 项`)
    return new Promise((r) => process.stdout.write('', r))
  })
  .then(() => process.exit(failed === 0 ? 0 : 1))
  .catch((e) => {
    console.log('\n执行出错：', e && e.message ? e.message : e)
    process.exit(1)
  })

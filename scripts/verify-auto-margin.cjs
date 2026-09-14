/**
 * 内容自适应卡的边距验证（需要 dev server 绑 IPv4）：
 *
 *   npx vite --port 5188 --strictPort --host 127.0.0.1
 *   npm run verify:margin
 *
 * 规则：内容自适应（fit=auto）的卡，靠边的那一侧边距 ×1.5（56 → 84）。
 *   左侧卡加左边距，右侧卡加右边距；居中 / 贴底 / 贴顶不受影响。
 * 自定义尺寸（fit=box）与自由定位的卡保持原边距，不变。
 */
const { chromium } = require('playwright')

const BASE = process.env.VERIFY_BASE || 'http://127.0.0.1:5188'
const KEY = 'animation-editor-project-v1'

const DEFAULT_HOST = {
  layout: 'off', x: 1384, y: 754, w: 480, h: 270, circular: false, radius: 24,
  focalX: 50, focalY: 50, zoom: 1, mirror: false, borderWidth: 4,
  borderColor: '#ffffff', shadow: true,
}

const project = {
  name: 'auto-margin', skin: 'dark', style: 'glass', font: 'sans',
  palette: { accent: '#5ac8fa', data: '#5ac8fa', special: '#ffd166' },
  host: { ...DEFAULT_HOST }, hostClips: [],
  subtitleStyle: { fontSize: 44, align: 'center', color: '#ffffff', box: true, bg: 'rgba(0,0,0,0.55)', slot: 'bottom' },
  cardOpacity: 0.35, cardOpacityV2: true,
  fps: 30, duration: 8, layout: 'edit', presets: [],
  instances: [
    { id: 'a_left', effectId: 'bullet-list', name: '左·自适应', start: 0, duration: 8, slot: 'left', fit: 'auto', params: {} },
    { id: 'a_right', effectId: 'bullet-list', name: '右·自适应', start: 0, duration: 8, slot: 'right', fit: 'auto', params: {} },
    { id: 'a_center', effectId: 'bullet-list', name: '中·自适应', start: 0, duration: 8, slot: 'center', fit: 'auto', params: {} },
    { id: 'b_left', effectId: 'bullet-list', name: '左·自定义', start: 0, duration: 8, slot: 'left', fit: 'box', w: 500, h: 300, params: {} },
    { id: 'b_right', effectId: 'bullet-list', name: '右·自定义', start: 0, duration: 8, slot: 'right', fit: 'box', w: 500, h: 300, params: {} },
    { id: 'f_free', effectId: 'bullet-list', name: '自由定位', start: 0, duration: 8, slot: 'left', fit: 'auto', free: true, x: 400, y: 300, params: {} },
    { id: 's_sub', effectId: 'srt-subtitle', name: '字幕', start: 0, duration: 8, slot: 'bottom', fit: 'auto', params: { text: '一句字幕' } },
  ],
}

let passed = 0
let failed = 0
function ok(name, cond, detail) {
  if (cond) { passed++; console.log(`  ✓ ${name}`) }
  else { failed++; console.log(`  ✗ ${name}${detail !== undefined ? ` — ${detail}` : ''}`) }
}

const BASE_MARGIN = 56
const WIDE_MARGIN = 84 // 56 × 1.5
const CANVAS_W = 1920

async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1680, height: 950 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))

  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.evaluate((p) => localStorage.setItem('animation-editor-project-v1', JSON.stringify(p)), project)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1400)

  const geom = await page.evaluate(() => {
    const out = {}
    for (const el of document.querySelectorAll('.os-inst')) {
      const id = el.getAttribute('data-paint-id')
      if (id) out[id] = { left: el.style.left, transform: el.style.transform, maxWidth: el.style.maxWidth }
    }
    return out
  })
  const px = (v) => (v == null ? null : Math.round(parseFloat(v)))

  console.log('\n实测（画布 1920×1080，无出镜画面时内容区 = 整块画布）')
  for (const [k, v] of Object.entries(geom)) {
    console.log(`  ${k.padEnd(10)} left=${String(v.left).padStart(8)}  maxWidth=${v.maxWidth || '-'}  ${v.transform}`)
  }

  console.log('')
  ok('左侧自适应卡：左边距 84px（56 的 1.5 倍）', px(geom.a_left?.left) === WIDE_MARGIN, String(geom.a_left?.left))
  ok(
    '右侧自适应卡：右边距 84px（left = 1920 - 84）',
    px(geom.a_right?.left) === CANVAS_W - WIDE_MARGIN,
    String(geom.a_right?.left),
  )
  ok('居中自适应卡：不受影响（left = 960）', px(geom.a_center?.left) === CANVAS_W / 2, String(geom.a_center?.left))
  ok('左侧自定义尺寸卡：仍是 56px', px(geom.b_left?.left) === BASE_MARGIN, String(geom.b_left?.left))
  ok(
    '右侧自定义尺寸卡：仍是 56px',
    px(geom.b_right?.left) === CANVAS_W - BASE_MARGIN,
    String(geom.b_right?.left),
  )
  ok('自由定位卡：不受边距影响（用自身 x 坐标）', px(geom.f_free?.left) === 400, String(geom.f_free?.left))

  ok(
    '字幕（贴底）不受左右边距影响',
    geom.s_sub && px(geom.s_sub.left) === CANVAS_W / 2,
    String(geom.s_sub?.left),
  )
  ok(
    '贴边卡留出另一侧基础边距，不会溢出内容区',
    WIDE_MARGIN + px(geom.a_left?.maxWidth) <= CANVAS_W - BASE_MARGIN,
    `${WIDE_MARGIN} + ${geom.a_left?.maxWidth} vs ${CANVAS_W - BASE_MARGIN}`,
  )

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

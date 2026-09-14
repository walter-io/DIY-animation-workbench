/**
 * 卡片入场与编辑态可见性验证（需要 dev server 绑 IPv4）：
 *
 *   npx vite --port 5188 --strictPort --host 127.0.0.1
 *   npm run verify:enter
 *
 * A. 编辑态可见性：播放头停在片段开头时，卡片必须看得见
 *    （修复前：所有卡在 progress=0 时内容 opacity 都是 0，画面上完全看不到）
 * B. 入场方式：无 / 淡入 / 左进入 / 右进入，在真实进度下的变换是否正确
 * C. 速度：倍率越大，同样时间内走得越远
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
  name: 'enter-test', skin: 'dark', style: 'glass', font: 'sans',
  palette: { accent: '#5ac8fa', data: '#5ac8fa', special: '#ffd166' },
  host: { ...DEFAULT_HOST }, hostClips: [],
  subtitleStyle: { fontSize: 44, align: 'center', color: '#ffffff', box: true, bg: 'rgba(0,0,0,0.55)', slot: 'bottom' },
  cardOpacity: 0.35, cardOpacityV2: true, fps: 30, duration: 6, layout: 'edit', presets: [],
  instances,
})

const card = (over) => ({
  id: 'c1', effectId: 'bullet-list', name: '要点清单卡',
  start: 0, duration: 6, slot: 'center', fit: 'auto', params: {}, ...over,
})

let passed = 0
let failed = 0
function ok(name, cond, detail) {
  if (cond) { passed++; console.log(`  ✓ ${name}`) }
  else { failed++; console.log(`  ✗ ${name}${detail !== undefined ? ` — ${detail}` : ''}`) }
}
function section(t) { console.log(`\n${t}`) }

/** 读入场层与内容元素的实际渲染值 */
const READ = `(() => {
  const inst = document.querySelector('.os-inst')
  if (!inst) return null
  const enter = inst.querySelector('.os-inst-enter')
  const leaf = [...inst.querySelectorAll('*')].filter(
    (e) => e.children.length === 0 && (e.textContent || '').trim().length > 0,
  )[0]
  let eff = 1
  let cur = leaf || inst
  while (cur && cur !== document.body) {
    eff *= parseFloat(getComputedStyle(cur).opacity || '1')
    cur = cur.parentElement
  }
  return {
    enterOpacity: enter ? Number(parseFloat(getComputedStyle(enter).opacity).toFixed(3)) : null,
    enterTransform: enter ? getComputedStyle(enter).transform : null,
    contentEffective: Number(eff.toFixed(3)),
  }
})()`

/** 从 matrix(a,b,c,d,tx,ty) 里取出水平位移 */
function txOf(transform) {
  if (!transform || transform === 'none') return 0
  const m = /matrix\(([^)]+)\)/.exec(transform)
  if (!m) return 0
  const p = m[1].split(',').map((s) => parseFloat(s.trim()))
  return Math.round(p[4] ?? 0)
}

async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1680, height: 950 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))

  // ── A. 编辑态：播放头在片段开头也要看得见
  section('A. 编辑态可见性（播放头停在片段开头）')
  for (const [label, effectId] of [
    ['要点清单卡', 'bullet-list'],
    ['标签行卡', 'label-row'],
    ['关键词弹跳高亮', 'srcvid-keyword-pop'],
  ]) {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' })
    await page.evaluate((p) => localStorage.setItem('animation-editor-project-v1', JSON.stringify(p)),
      mk([card({ effectId, name: effectId })]))
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1200)
    const r = await page.evaluate(READ)
    ok(
      `${label}：看得见（内容有效不透明度 ${r ? r.contentEffective : 'null'}）`,
      r && r.contentEffective > 0.25,
      JSON.stringify(r),
    )
  }

  // ── B/C. 入场方式与速度：用导出模式精确控制播放头
  const openStage = async (instances) => {
    await page.addInitScript((p) => { window.__EXPORT_PROJECT = p }, mk(instances))
    await page.goto(`${BASE}/?render=1`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1200)
    const ready = await page.evaluate(() => !!(window.__render && window.__render.ready))
    return ready
  }
  const seek = async (sec) => {
    await page.evaluate((t) => window.__render.seek(t), sec)
    await page.waitForTimeout(160)
    return page.evaluate(READ)
  }

  section('B. 入场方式（导出模式，逐帧精确控制）')
  ok('导出舞台就绪', await openStage([card({ enter: 'fade' })]))

  let r = await seek(0)
  ok('淡入：起点全透明', r && r.enterOpacity < 0.02, JSON.stringify(r))
  r = await seek(1)
  ok('淡入：1 秒后已完成', r && r.enterOpacity > 0.99, JSON.stringify(r))

  await openStage([card({ enter: 'left' })])
  r = await seek(0)
  ok('左进入：起点在左侧（位移为负）', r && txOf(r.enterTransform) <= -100, JSON.stringify(r))
  r = await seek(1)
  ok('左进入：结束后回到原位', r && txOf(r.enterTransform) === 0, JSON.stringify(r))

  await openStage([card({ enter: 'right' })])
  r = await seek(0)
  ok('右进入：起点在右侧（位移为正）', r && txOf(r.enterTransform) >= 100, JSON.stringify(r))

  await openStage([card({ enter: 'none' })])
  r = await seek(0)
  ok('无入场：起点就是最终状态', r && r.enterOpacity > 0.99 && txOf(r.enterTransform) === 0, JSON.stringify(r))

  section('C. 速度（倍率越大走得越快）')
  await openStage([card({ enter: 'fade', enterSpeed: 1 })])
  const slow = await seek(0.15)
  await openStage([card({ enter: 'fade', enterSpeed: 3 })])
  const fast = await seek(0.15)
  ok(
    '3× 比 1× 在同一时刻推进得更远',
    slow && fast && fast.enterOpacity > slow.enterOpacity,
    `1×=${slow && slow.enterOpacity}  3×=${fast && fast.enterOpacity}`,
  )
  ok('1× 在 0.15s 时还没走完', slow && slow.enterOpacity < 0.95, String(slow && slow.enterOpacity))
  ok('3× 在 0.15s 时基本走完', fast && fast.enterOpacity > 0.9, String(fast && fast.enterOpacity))

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

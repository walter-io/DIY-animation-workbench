/**
 * 端到端验证「动效卡关键帧：铺满画布 ↔ 内容自适应 的逐帧外观与补间」：
 *
 *   npx vite --port 5193 --strictPort（脚本自己拉起 / 杀掉）
 *   node scripts/verify-card-kf-fit.cjs
 *
 * 用户操作路径：
 *   1. 卡是「铺满画布」→ 播放头 t1 按 🔑 打第一帧 → 画面应当一动不动
 *   2. 播放头 t2 点「内容自适应」→ 第二帧自动生成，画面切到自适应
 *   3. 第一帧的画面不被第二帧影响（点第一帧菱形回去看，还是铺满）
 *   4. 两帧之间是平滑补间（中间时刻的宽高严格介于两帧之间）
 *   5. 档位没变时再点一次 = 在当前时刻固化一帧（铺满 → 铺满也打帧）
 */
const { chromium } = require('playwright')
const { spawn } = require('child_process')
const http = require('http')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const KEY = 'animation-editor-project-v1'
const VERSIONS_KEY = 'animation-editor-versions-v1'
const PORT = process.env.PORT || '5193'
const BASE = `http://localhost:${PORT}/`

let pass = 0
let fail = 0
const check = (name, ok, detail) => {
  console.log(`  ${ok ? '✅' : '❌'} ${name}${detail !== undefined && !ok ? ' → ' + detail : ''}`)
  ok ? pass++ : fail++
}
const near = (a, b, tol = 6) => Math.abs(a - b) <= tol

const readProject = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || '{}'), KEY)

/** 卡片本体在画布上的实际外框（画布像素）—— 量 .os-card，包裹层/内边距不影响对比 */
const cardBoxOnCanvas = (page) =>
  page.evaluate(() => {
    const el = document.querySelector('[data-paint-id] .os-card')
    const canvas = document.querySelector('.os-canvas')
    if (!el || !canvas) return null
    const r = el.getBoundingClientRect()
    const c = canvas.getBoundingClientRect()
    const kx = 1920 / c.width
    const ky = 1080 / c.height
    return {
      x: (r.left - c.left) * kx,
      y: (r.top - c.top) * ky,
      w: r.width * kx,
      h: r.height * ky,
    }
  })

const project = {
  name: 'card-kf-fit',
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
  let viteLog = ''
  vite.stdout.on('data', (d) => (viteLog += d.toString()))
  vite.stderr.on('data', (d) => (viteLog += d.toString()))
  const ready = await waitServer()
  if (!ready) {
    console.error('❌ vite 未能启动：\n' + viteLog)
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
  await page.evaluate((k) => localStorage.removeItem(k), VERSIONS_KEY)
  await page.evaluate(({ p, k }) => localStorage.setItem(k, JSON.stringify(p)), { p: project, k: KEY })
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)

  // 播放头 seek（秒 → 标尺点击）
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

  console.log('\n=== 1. 铺满卡打第一帧：画面一动不动 ===')
  await page.click('.os-tracks .os-clip')
  await page.waitForTimeout(300)
  await seek(1)
  const before = await cardBoxOnCanvas(page)
  check('铺满卡初始占满内容区（卡本体 1824×1000，内边距内缩）', before && before.w > 1800 && before.h > 980, JSON.stringify(before))

  await page.click('.os-btn-kf')
  await page.waitForTimeout(400)
  let proj = await readProject(page)
  const kfs = proj.instances[0].keyframes ?? []
  check('🔑 生成了第一帧', kfs.length === 1, `帧数=${kfs.length}`)
  check('第一帧带位置与尺寸', kfs[0] && kfs[0].w > 0 && kfs[0].x != null, JSON.stringify(kfs[0]))
  const afterKf1 = await cardBoxOnCanvas(page)
  check(
    '打帧后画面不动（位置/尺寸一致）',
    afterKf1 && near(afterKf1.x, before.x, 2) && near(afterKf1.w, before.w, 2) && near(afterKf1.h, before.h, 2),
    JSON.stringify({ before, after: afterKf1 }),
  )

  console.log('\n=== 2. 第二帧：点「内容自适应」===')
  await seek(4)
  await page.click('.os-seg-fit button:has-text("内容自适应")')
  await page.waitForTimeout(800)
  proj = await readProject(page)
  const keys2 = proj.instances[0].keyframes ?? []
  check('自适应点按生成了第二帧', keys2.length === 2, `帧数=${keys2.length}`)
  const kf1 = keys2[0]
  const kf2 = keys2[1]
  check(
    '第二帧与第一帧不同（不再无效）',
    kf2 && (Math.abs(kf2.w - kf1.w) > 40 || Math.abs(kf2.h - kf1.h) > 40),
    JSON.stringify({ kf1: { w: kf1.w, h: kf1.h, x: kf1.x, y: kf1.y }, kf2: kf2 && { w: kf2.w, h: kf2.h, x: kf2.x, y: kf2.y } }),
  )
  const atKf2 = await cardBoxOnCanvas(page)
  check(
    '第二帧时刻画面就是自适应外框',
    atKf2 && near(atKf2.w, kf2.w, 4) && near(atKf2.h, kf2.h, 4) && near(atKf2.x, kf2.x, 4),
    JSON.stringify({ expect: { x: kf2.x, y: kf2.y, w: kf2.w, h: kf2.h }, got: atKf2 }),
  )

  console.log('\n=== 3. 回看第一帧：不被第二帧影响 ===')
  await page.click('.os-kf-marker >> nth=0')
  await page.waitForTimeout(600)
  const backAtKf1 = await cardBoxOnCanvas(page)
  check(
    '第一帧仍是铺满（位置/尺寸与打帧时一致）',
    backAtKf1 && near(backAtKf1.w, kf1.w, 4) && near(backAtKf1.h, kf1.h, 4) && near(backAtKf1.x, kf1.x, 4),
    JSON.stringify({ expect: { x: kf1.x, y: kf1.y, w: kf1.w, h: kf1.h }, got: backAtKf1 }),
  )

  console.log('\n=== 4. 两帧之间平滑补间 ===')
  await seek(2.5)
  await page.waitForTimeout(400)
  const mid = await cardBoxOnCanvas(page)
  const midW = mid ? mid.w : 0
  const lo = Math.min(kf1.w, kf2.w)
  const hi = Math.max(kf1.w, kf2.w)
  check(
    '中间时刻宽度严格介于两帧之间',
    midW > lo + 10 && midW < hi - 10,
    `w=${midW} 应在 (${lo}, ${hi})`,
  )

  console.log('\n=== 5. 档位没变再点一次 = 当前时刻固化一帧 ===')
  await seek(6)
  const cntBefore = (await readProject(page)).instances[0].keyframes.length
  await page.click('.os-seg-fit button:has-text("内容自适应")')
  await page.waitForTimeout(800)
  const keys3 = (await readProject(page)).instances[0].keyframes ?? []
  check('同档位再点生成了第三帧', keys3.length === cntBefore + 1, `帧数=${keys3.length}`)
  const kf3 = keys3[keys3.length - 1]
  const at6 = await cardBoxOnCanvas(page)
  check(
    '第三帧外框与当前画面一致',
    at6 && near(at6.w, kf3.w, 4) && near(at6.x, kf3.x, 4),
    JSON.stringify({ expect: { x: kf3.x, w: kf3.w }, got: at6 }),
  )

  check('无页面报错', errors.length === 0, errors.slice(0, 2).join(' | '))

  await browser.close()
  vite.kill()
  console.log(`\n结果：${pass} 通过，${fail} 失败`)
  process.exit(fail ? 1 : 0)
})().catch((e) => {
  console.error(e)
  process.exit(2)
})

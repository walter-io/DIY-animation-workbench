/**
 * 验证三条新需求：
 *
 *   ① 播放头支持在标尺上按住拖动（连续 scrub），不再只能单击秒数轨道
 *   ② 时间轴关键帧菱形可点击选中，选中后可 Delete 删除（参数面板同步高亮）
 *   ③ 视频/图片片段在画布上可右下角拖拽改大小（像动效卡）；视频参数面板加回「出镜布局」预设
 *
 * 自包含：脚本自己 spawn vite dev server（沙箱会杀掉 `&` 后台进程，必须同进程拉起），
 * 跑完再杀掉。注意 vite 默认只监听 IPv6 ::1，必须用 localhost。
 */
const { chromium } = require('playwright')
const { spawn } = require('child_process')
const { execFileSync } = require('child_process')
const http = require('http')
const path = require('path')
const fs = require('fs')

const ROOT = path.join(__dirname, '..')
const KEY = 'animation-editor-project-v1'
const VERSIONS_KEY = 'animation-editor-versions-v1'
const DB_NAME = 'animation-editor-media'
const PORT = process.env.PORT || '5189'
const BASE = `http://localhost:${PORT}/`

const IMG = path.join(__dirname, '_tmp', 'kf-test.png')
const VID = path.join(__dirname, '_tmp', 'kf-test.mp4')
const SHOT = path.join(__dirname, '_tmp', 'kf-playhead-resize.png')

const FALLBACK_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

if (!fs.existsSync(IMG)) {
  fs.mkdirSync(path.dirname(IMG), { recursive: true })
  try {
    execFileSync('ffmpeg', [
      '-y', '-f', 'lavfi', '-i', 'color=c=0xff6f7c:s=320x180',
      '-frames:v', '1', '-loglevel', 'error', IMG,
    ])
  } catch {
    fs.writeFileSync(IMG, FALLBACK_PNG)
  }
}
if (!fs.existsSync(VID)) {
  try {
    execFileSync('ffmpeg', [
      '-y', '-f', 'lavfi', '-i', 'color=c=0x3366ff:s=320x180',
      '-t', '3', '-r', '30', '-pix_fmt', 'yuv420p', '-loglevel', 'error', VID,
    ])
  } catch {
    /* 无视频则跳过视频相关用例 */
  }
}

let pass = 0
let fail = 0
const check = (name, ok, detail) => {
  console.log(`  ${ok ? '✅' : '❌'} ${name}${detail ? ' → ' + detail : ''}`)
  ok ? pass++ : fail++
}
const near = (a, b, tol = 0.05) => Math.abs(a - b) <= tol

const readProject = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || '{}'), KEY)

async function waitServer() {
  for (let i = 0; i < 80; i++) {
    const ok = await new Promise((resolve) => {
      const r = http.get(BASE, () => resolve(true))
      r.on('error', () => resolve(false))
      r.setTimeout(500, () => { r.destroy(); resolve(false) })
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
  console.log('vite ready on ' + PORT)

  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1680, height: 950 } })
  const errors = []
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })

  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await page.evaluate((k) => localStorage.removeItem(k), KEY)
  await page.evaluate((k) => localStorage.removeItem(k), VERSIONS_KEY)
  await page.evaluate((db) => new Promise((res) => {
    const r = indexedDB.deleteDatabase(db)
    r.onsuccess = r.onerror = r.onblocked = () => res()
  }), DB_NAME)
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(900)

  // ===== 1. 播放头拖动 scrub（需求①） =====
  console.log('\n=== 1. 播放头拖动 scrub ===')
  const t0 = await page.$eval('.os-time', (el) => el.textContent.split('/')[0].trim())
  const ruler = await page.locator('.os-ruler').boundingBox()
  check('标尺存在且可定位', ruler != null && ruler.width > 100, `w=${ruler && ruler.width}`)

  // 注意：标尺会被 CSS flex 拉伸到填满可视区（可能比内容区宽），
  // 播放头实际只在 contentWidth = duration*pxPerSec 区间内移动。
  // 所以用「6s 刻度」的屏幕位置做落点，而不是标尺视觉中点。
  const target6 = await page.evaluate(() => {
    const ticks = [...document.querySelectorAll('.os-tick')]
    const t = ticks[6]
    const r = t.getBoundingClientRect()
    return r.left + r.width / 2
  })
  const y = ruler.y + ruler.height / 2
  await page.mouse.move(ruler.x + 10, y)
  await page.mouse.down()
  await page.mouse.move(target6, y, { steps: 12 })
  await page.mouse.up()
  await page.waitForTimeout(300)

  const t1 = await page.$eval('.os-time', (el) => {
    const [m, s] = el.textContent.split('/')[0].trim().split(':').map(Number)
    return m * 60 + s
  })
  const dur = await page.$eval('.os-time', (el) => {
    const [m, s] = el.textContent.split('/')[1].trim().split(':').map(Number)
    return m * 60 + s
  })
  check('拖动后播放头离开 0', t1 > 1, `起始=${t0} → 拖后=${t1.toFixed(1)}s`)
  check('拖到 6s 刻度 → 落点≈6s', near(t1, 6, 0.3), `期望≈6.0s 实际=${t1.toFixed(1)}s`)

  // ===== 2. 关键帧选中 + 删除（需求②） =====
  console.log('\n=== 2. 关键帧选中 + 删除 ===')
  // 先把播放头拖回 0，再导入图片并加到播放头
  await page.mouse.move(ruler.x + 5, y)
  await page.mouse.down()
  await page.mouse.up()
  await page.waitForTimeout(200)

  await page.click('.os-left-tab:has-text("素材库")')
  await page.waitForTimeout(300)
  await page.setInputFiles('.os-panel-left input[type="file"]', IMG)
  await page.waitForTimeout(1200)
  await page.click('.os-media-act.add')
  await page.waitForTimeout(500)
  await page.click('.os-img-clip')
  await page.waitForTimeout(300)

  // 打两个关键帧（1s、2s）
  const seekClick = async (t) => {
    await page.evaluate((time) => {
      const ticks = [...document.querySelectorAll('.os-tick')]
      const k = Math.max(0, Math.min(ticks.length - 2, Math.floor(time)))
      const a = ticks[k].getBoundingClientRect()
      const b = ticks[k + 1]?.getBoundingClientRect()
      const cx = a.left + a.width / 2
      const pxPerSec = b ? b.left + b.width / 2 - cx : 36
      const rulerEl = document.querySelector('.os-ruler')
      rulerEl.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: cx + (time - k) * pxPerSec, clientY: a.top + 5 }))
    }, t)
    await page.waitForTimeout(250)
  }
  await seekClick(1)
  await page.click('.os-btn-kf')
  await page.waitForTimeout(250)
  await seekClick(2)
  await page.click('.os-btn-kf')
  await page.waitForTimeout(400)

  let proj = await readProject(page)
  let keys = proj.imageClips?.[0]?.keyframes ?? []
  check('打了两个关键帧', keys.length === 2, `帧数=${keys.length}`)
  check('时间轴渲染 2 个菱形', (await page.$$eval('.os-kf-marker', (els) => els.length)) === 2)

  // 点击第一个菱形 → 选中态
  await page.click('.os-kf-marker')
  await page.waitForTimeout(300)
  check('点击菱形后出现选中态', (await page.$$eval('.os-kf-marker.selected', (els) => els.length)) === 1)
  check('参数面板关键帧列表出现选中项', (await page.$$eval('.os-kf-item-selected', (els) => els.length)) === 1)
  check('参数面板显示关键帧列表（2 项）', (await page.$$eval('.os-kf-item', (els) => els.length)) === 2)

  // 按 Delete → 删除选中的关键帧
  await page.keyboard.press('Delete')
  await page.waitForTimeout(400)
  proj = await readProject(page)
  keys = proj.imageClips?.[0]?.keyframes ?? []
  check('Delete 后关键帧从 2 → 1', keys.length === 1, `帧数=${keys.length}`)
  check('删除后无选中态残留', (await page.$$eval('.os-kf-marker.selected', (els) => els.length)) === 0)
  check('参数面板列表同步为 1 项', (await page.$$eval('.os-kf-item', (els) => els.length)) === 1)

  // ===== 3. 视频 resize + 出镜布局（需求③） =====
  console.log('\n=== 3. 视频 resize + 出镜布局 ===')
  const hasVideo = fs.existsSync(VID)
  if (!hasVideo) {
    console.log('  ⚠️ 无视频样本，跳过视频用例')
  } else {
    await page.setInputFiles('.os-panel-left input[type="file"]', VID)
    await page.waitForTimeout(1500)
    // 用「＋」把视频加到播放头（默认 0）
    const vidAdd = await page.$$('.os-media-act.add')
    await vidAdd[vidAdd.length - 1].click()
    await page.waitForTimeout(600)

    proj = await readProject(page)
    const vClip = (proj.imageClips || []).find((c) => (proj.mediaAssets || []).find((a) => a.id === c.assetId)?.kind === 'video')
    check('视频片段已生成（带 trimIn/sourceDuration）', vClip != null && typeof vClip.trimIn === 'number', vClip ? `trimIn=${vClip.trimIn} sd=${vClip.sourceDuration}` : '无')
    if (vClip) {
      // 选中视频片段（点时间轴素材条）
      const clips = await page.$$('.os-img-clip')
      await clips[clips.length - 1].click()
      await page.waitForTimeout(400)

      // resize 手柄出现
      const handle = await page.locator('.os-media-resize').boundingBox()
      check('画布上出现 resize 手柄', handle != null, handle ? `@${handle.x},${handle.y}` : '无')
      if (handle) {
        const before = vClip.w
        await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2)
        await page.mouse.down()
        await page.mouse.move(handle.x + handle.width / 2 + 60, handle.y + handle.height / 2 + 40, { steps: 10 })
        await page.mouse.up()
        await page.waitForTimeout(400)
        proj = await readProject(page)
        const afterClip = (proj.imageClips || []).find((c) => c.id === vClip.id)
        check('拖动 resize 后宽变大', afterClip.w > before, `宽 ${before} → ${afterClip.w}`)
        check('拖动 resize 后高变大', afterClip.h > vClip.h, `高 ${vClip.h} → ${afterClip.h}`)
      }

      // 出镜布局预设：点「右下圆」，验证 x/y/w/h/radius 落到对应矩形
      const hasLayout = await page.$$('.os-layout-presets .os-layout-preset-btn')
      check('视频面板出现「出镜布局」预设按钮', hasLayout.length >= 8, `按钮数=${hasLayout.length}`)
      await page.click('.os-layout-preset-btn:has-text("右下圆")')
      await page.waitForTimeout(400)
      proj = await readProject(page)
      const laid = (proj.imageClips || []).find((c) => c.id === vClip.id)
      // 横屏 1920×1080：circle-br frame {x:0.81,y:0.663,w:0.156,h:0.278} → 1555/716/300/300，圆形半径 150
      check('右下圆 → x≈1555', near(laid.x, 1555, 3), `x=${laid.x}`)
      check('右下圆 → y≈716', near(laid.y, 716, 3), `y=${laid.y}`)
      check('右下圆 → w≈300', near(laid.w, 300, 3), `w=${laid.w}`)
      check('右下圆 → h≈300', near(laid.h, 300, 3), `h=${laid.h}`)
      check('右下圆 → 圆形（radius≈150）', near(laid.radius, 150, 3), `radius=${laid.radius}`)
    }
  }

  const shot = await page.$('.os-timeline')
  if (shot) await shot.screenshot({ path: SHOT })

  console.log('\n=== 控制台错误 ===')
  console.log(errors.length ? errors.join('\n') : '  无')
  console.log(`\n结果：${pass} 通过 / ${fail} 失败`)

  await browser.close()
  vite.kill()
  process.exit(fail ? 1 : 0)
})().catch((e) => {
  console.error('脚本异常：', e)
  process.exit(3)
})

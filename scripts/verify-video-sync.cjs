/**
 * 视频同步回归验证（需要 dev server 绑 IPv4）：
 *
 *   npx vite --port 5188 --strictPort --host 127.0.0.1
 *   npm run verify:video
 *
 * 背景：垫底视频与出镜视频曾经用「偏差 > 0.25s 才 seek」跟随播放头，
 * 而且 v.play() 只在 playing 变化时调用一次。于是视频一旦因缓冲/解码/播完
 * 而停下，就再也没人把它拉起来 —— 画面被 0.25s 一次的硬 seek 断续拖动，
 * 表现为「同一个画面重复播放几十帧」。修复前实测：
 *   播放头越过视频结尾  99.1% 的帧画面不动，最长静止 3023ms
 *   视频中途停下        80.5% 的帧画面不动，且永不恢复
 *
 * 本脚本用逐帧采样把这两个数字钉住，防止回归。
 */
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')

const BASE = process.env.VERIFY_BASE || 'http://127.0.0.1:5188'
const VIDEO = path.join(__dirname, '_fixtures', 'test-12s.mp4') // 12s / 30fps / 带帧计时器

const DEFAULT_HOST = {
  layout: 'off', x: 1384, y: 754, w: 480, h: 270, circular: false, radius: 24,
  focalX: 50, focalY: 50, zoom: 1, mirror: false, borderWidth: 4,
  borderColor: '#ffffff', shadow: true,
}

const project = {
  name: 'video-sync', skin: 'dark', style: 'glass', font: 'sans',
  palette: { accent: '#5ac8fa', data: '#5ac8fa', special: '#ffd166' },
  host: { ...DEFAULT_HOST }, hostClips: [],
  cardOpacity: 0.35, cardOpacityV2: true,
  fps: 30, duration: 20, layout: 'edit', presets: [],
  instances: [],
}

let passed = 0
let failed = 0
function ok(name, cond, detail) {
  if (cond) { passed++; console.log(`  ✓ ${name}`) }
  else { failed++; console.log(`  ✗ ${name}${detail !== undefined ? ` — ${detail}` : ''}`) }
}
function section(t) { console.log(`\n${t}`) }

const SAMPLER = () => {
  const w = window
  w.__s = []
  const loop = () => {
    const v = document.querySelector('video')
    w.__s.push({
      t: performance.now(),
      vt: v ? v.currentTime : null,
      paused: v ? v.paused : null,
      ended: v ? v.ended : null,
    })
    w.__raf = requestAnimationFrame(loop)
  }
  w.__raf = requestAnimationFrame(loop)
}

/** 采样结果：静止帧占比与最长连续静止（= 画面被冻住的时长） */
function stats(s) {
  const pts = s.filter((x) => x.vt != null)
  if (pts.length < 5) return null
  let same = 0
  let run = 1
  let maxRun = 1
  for (let i = 1; i < pts.length; i++) {
    if (Math.abs(pts[i].vt - pts[i - 1].vt) < 1e-6) {
      same++; run++; if (run > maxRun) maxRun = run
    } else run = 1
  }
  return {
    frames: pts.length,
    stillPct: (same / (pts.length - 1)) * 100,
    maxRun,
    maxRunMs: Math.round(maxRun * 16.7),
    advanced: pts[pts.length - 1].vt - pts[0].vt,
    wall: (pts[pts.length - 1].t - pts[0].t) / 1000,
    pausedFrames: pts.filter((p) => p.paused).length,
    endedFrames: pts.filter((p) => p.ended).length,
  }
}

async function main() {
  if (!fs.existsSync(VIDEO)) {
    console.log(`缺少测试素材 ${VIDEO}`)
    console.log('用 ffmpeg 生成：ffmpeg -f lavfi -i testsrc2=size=320x180:rate=30:duration=12 -c:v libx264 -pix_fmt yuv420p -y scripts/_fixtures/test-12s.mp4')
    process.exit(1)
  }

  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1680, height: 950 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))

  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.evaluate((p) => localStorage.setItem('animation-editor-project-v1', JSON.stringify(p)), project)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)
  await page.setInputFiles('input[type=file]', VIDEO)
  await page.waitForTimeout(1500)

  const hasVideo = await page.evaluate(() => !!document.querySelector('video'))
  if (!hasVideo) {
    console.log('视频未加载，无法验证')
    await new Promise((r) => process.stdout.write('', r))
    process.exit(1)
  }

  const seekTo = async (sec) => {
    await page.evaluate((s) => {
      const tracks = document.querySelector('.os-tracks')
      const r = tracks.getBoundingClientRect()
      tracks.dispatchEvent(new MouseEvent('click', {
        bubbles: true, clientX: r.left + (s / 20) * r.width, clientY: r.top + 2,
      }))
    }, sec)
    await page.waitForTimeout(600)
  }
  const press = async (label) => {
    await page.evaluate((l) => {
      const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === l)
      if (b) b.click()
    }, label)
  }

  // ── A. 正常播放：画面必须连续，且跟得上播放头
  section('A. 正常播放（视频时长内）')
  await page.evaluate(SAMPLER)
  await press('播放')
  await page.waitForTimeout(3000)
  await press('暂停')
  const a = stats(await page.evaluate(() => window.__s))
  ok('采样到足够帧数', a && a.frames > 100, a && a.frames)
  ok('画面连续（静止帧 < 5%）', a.stillPct < 5, `${a.stillPct.toFixed(1)}%`)
  ok('最长静止不超过 3 帧', a.maxRun <= 3, `${a.maxRun} 帧（${a.maxRunMs}ms）`)
  ok(
    '视频推进跟得上真实时间（误差 < 10%）',
    Math.abs(a.advanced - a.wall) / a.wall < 0.1,
    `推进 ${a.advanced.toFixed(3)}s / 真实 ${a.wall.toFixed(3)}s`,
  )

  // ── B. 播放头越过视频结尾：不该再反复触发 ended（那会引发事件风暴并冻死画面）
  section('B. 播放头越过视频结尾（13s > 视频 12s）')
  await seekTo(13)
  await page.evaluate(SAMPLER)
  await press('播放')
  await page.waitForTimeout(3000)
  await press('暂停')
  const b = stats(await page.evaluate(() => window.__s))
  ok('不再反复触发 ended', b.endedFrames === 0, `${b.endedFrames} 帧处于 ended`)
  ok('不再徒劳 seek（明确停在结尾）', b.pausedFrames === b.frames, `${b.pausedFrames}/${b.frames}`)

  // ── C. 视频中途停下：必须能被自动重新拉起来
  section('C. 视频中途停下（playing 仍为 true）')
  await seekTo(2)
  await press('播放')
  await page.waitForTimeout(500)
  await page.evaluate(() => { const v = document.querySelector('video'); if (v) v.pause() })
  await page.evaluate(SAMPLER)
  await page.waitForTimeout(2500)
  await press('暂停')
  const c = stats(await page.evaluate(() => window.__s))
  ok('能自动恢复播放（不是永久冻住）', c.advanced > 2.0, `恢复后推进 ${c.advanced.toFixed(3)}s`)
  ok('恢复后画面连续（静止帧 < 25%）', c.stillPct < 25, `${c.stillPct.toFixed(1)}%`)
  ok('最终不再处于暂停态', c.pausedFrames < c.frames * 0.25, `${c.pausedFrames}/${c.frames} 帧 paused`)

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

/**
 * 验证「通用剪刀工具」：选中任意轨道素材，在播放头处一刀切成两段。
 *
 * 分两层：
 *   1. 纯函数（split.ts / hostTrack.ts）：splitInstance / splitHostClip / splitHostTrack
 *      / findSplitTarget / applySplit，含"离边缘太近不切"与字幕重编号
 *   2. 端到端：真的点「✂️ 切开」把素材条 / 卡切成两段，核对前段结尾=后段开始
 */
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const { execFileSync } = require('child_process')

const KEY = 'animation-editor-project-v1'
const PORT = process.env.PORT || '5188'
const DURATION = 24
const HOST_VIDEO = path.join(__dirname, '_tmp', 'host-sample.mp4')
const SHOT = path.join(__dirname, '_tmp', 'split.png')

if (!fs.existsSync(HOST_VIDEO)) {
  fs.mkdirSync(path.dirname(HOST_VIDEO), { recursive: true })
  execFileSync('ffmpeg', [
    '-y', '-f', 'lavfi', '-i', 'testsrc=size=480x270:rate=15:duration=3',
    '-pix_fmt', 'yuv420p', '-loglevel', 'error', HOST_VIDEO,
  ])
}

const project = {
  name: 'split-test', skin: 'dark', style: 'glass', font: 'sans',
  palette: { accent: '#5ac8fa', data: '#5ac8fa', special: '#ffd166' },
  host: {
    layout: 'circle-br', x: 1384, y: 754, w: 480, h: 270,
    circular: false, radius: 24, focalX: 50, focalY: 50, zoom: 1,
    mirror: false, borderWidth: 4, borderColor: '#ffffff', shadow: true, opacity: 1,
  },
  hostClips: [],
  cardOpacity: 0.65,
  fps: 30, duration: DURATION, layout: 'edit', presets: [],
  instances: [
    { id: 'i1', effectId: 'section-header', name: '段头', start: 0, duration: DURATION, slot: 'center', fit: 'full', params: { num: '01', title: '测试', subtitle: 'x', accent: '' } },
  ],
}

const readProject = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || '{}'), KEY)
const readTracks = async (page) => (await readProject(page)).hostTracks ?? []

const seek = async (page, t) => {
  await page.evaluate((time) => {
    const ticks = [...document.querySelectorAll('.os-tick')]
    const k = Math.max(0, Math.min(ticks.length - 2, Math.floor(time)))
    const a = ticks[k].getBoundingClientRect()
    const b = ticks[k + 1]?.getBoundingClientRect()
    const cx = a.left + a.width / 2
    const pxPerSec = b ? b.left + b.width / 2 - cx : 36
    const ruler = document.querySelector('.os-ruler')
    ruler.dispatchEvent(
      new MouseEvent('click', { bubbles: true, clientX: cx + (time - k) * pxPerSec, clientY: a.top + 5 }),
    )
  }, t)
  await page.waitForTimeout(300)
  return await page.evaluate(() => {
    const txt = (document.querySelector('.os-time')?.textContent || '0:00').split('/')[0].trim()
    const [m, s] = txt.split(':').map(Number)
    return m * 60 + s
  })
}

let pass = 0
let fail = 0
const check = (name, ok, detail) => {
  console.log(`  ${ok ? '✅' : '❌'} ${name}${detail ? ' → ' + detail : ''}`)
  ok ? pass++ : fail++
}
const near = (a, b, tol = 0.03) => Math.abs(a - b) <= tol

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1680, height: 950 } })
  const errors = []
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })

  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800) // 等 React 挂载 + 持久化 effect 跑完，避免它用默认工程覆盖我们写入的数据
  await page.evaluate((arg) => localStorage.setItem(arg.k, JSON.stringify(arg.p)), { k: KEY, p: project })
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(900)

  // ===== 1. 纯函数 =====
  console.log('\n=== 1. 纯函数（split.ts / hostTrack.ts）===')
  const fn = await page.evaluate(async () => {
    const s = await import('/src/split.ts')
    const m = await import('/src/hostTrack.ts')
    const mk = (() => { let n = 0; return () => 'new_' + (++n) })()
    const card = { id: 'i1', effectId: 'core-number-roller', name: '数字', start: 0, duration: 10, slot: 'left', params: {} }
    const clip = { id: 'c1', start: 1, duration: 6, layout: 'circle-br' }
    const track = { id: 'ht1', start: 2, duration: 8, trimIn: 1, sourceDuration: 20 }

    const ci = s.splitInstance(card, 4, mk)
    const ciEdge = s.splitInstance(card, 0.02, mk)
    const cc = s.splitHostClip(clip, 4, mk)
    const ct = m.splitHostTrack(track, 6, mk)
    const ctEdge = m.splitHostTrack(track, 2.1, mk)

    // findSplitTarget 优先级：同时选中卡 + 机位段 + 素材条，取卡
    const proj = {
      instances: [card],
      hostClips: [clip],
      hostTracks: [track],
      duration: 24, fps: 30, layout: 'edit', name: 'x',
      host: { layout: 'circle-br' }, hostTransition: 0.6, hostEase: 'easeInOut',
    }
    const target = s.findSplitTarget(proj, { selectedId: 'i1', selectedHostClipId: 'c1', selectedHostTrackId: 'ht1' }, 4)

    // applySplit 字幕重编号：拆第一句后应变成 3 句且不重叠
    const subs = [
      { id: 's1', effectId: 'srt-subtitle', name: '口播字幕 01', start: 0, duration: 2, slot: 'bottom', params: { text: '甲' } },
      { id: 's2', effectId: 'srt-subtitle', name: '口播字幕 02', start: 2, duration: 2, slot: 'bottom', params: { text: '乙' } },
    ]
    const subProj = { ...proj, instances: subs, hostClips: [], hostTracks: [] }
    const res = s.applySplit(subProj, { selectedId: 's1', selectedHostClipId: null, selectedHostTrackId: null }, 1, mk)

    return {
      ciFrontDur: ci?.[0]?.duration, ciBackStart: ci?.[1]?.start, ciBackDur: ci?.[1]?.duration,
      ciFrontId: ci?.[0]?.id, ciBackId: ci?.[1]?.id, ciEdge: ciEdge === null,
      ccFrontDur: cc?.[0]?.duration, ccBackStart: cc?.[1]?.start,
      ctFrontDur: ct?.[0]?.duration, ctFrontTrimIn: ct?.[0]?.trimIn,
      ctBackStart: ct?.[1]?.start, ctBackDur: ct?.[1]?.duration, ctBackTrimIn: ct?.[1]?.trimIn,
      ctContig: ct ? Math.abs(ct[0].trimIn + ct[0].duration - ct[1].trimIn) <= 0.01 : false,
      ctEdge: ctEdge === null,
      targetKind: target?.kind,
      subCount: res?.project.instances.length,
      subNames: res?.project.instances.map((i) => i.name).join(','),
      subNoOverlap: res ? res.project.instances.every((i, k, a) => k === 0 || a[k - 1].start + a[k - 1].duration <= i.start + 0.001) : false,
    }
  })

  check('切开卡片：前段时长=切口-起点（4s）', near(fn.ciFrontDur, 4), `dur=${fn.ciFrontDur}`)
  check('切开卡片：后段从切口开始、剩 6s', near(fn.ciBackStart, 4) && near(fn.ciBackDur, 6), `start=${fn.ciBackStart} dur=${fn.ciBackDur}`)
  check('切开卡片：前段留原 id、后段换新 id', fn.ciFrontId === 'i1' && fn.ciBackId !== 'i1', `${fn.ciFrontId} / ${fn.ciBackId}`)
  check('切口离边缘太近 → 不切（返回 null）', fn.ciEdge === true)
  check('切开机位段：前段 3s、后段从 4s 开始', near(fn.ccFrontDur, 3) && near(fn.ccBackStart, 4), `dur=${fn.ccFrontDur} start=${fn.ccBackStart}`)
  check('切开素材条：前段 4s、入点不变（1s）', near(fn.ctFrontDur, 4) && near(fn.ctFrontTrimIn, 1), `dur=${fn.ctFrontDur} trimIn=${fn.ctFrontTrimIn}`)
  check('切开素材条：后段从 6s 开始、长 4s、入点顺延到 5s',
    near(fn.ctBackStart, 6) && near(fn.ctBackDur, 4) && near(fn.ctBackTrimIn, 5),
    `start=${fn.ctBackStart} dur=${fn.ctBackDur} trimIn=${fn.ctBackTrimIn}`)
  check('切开素材条：两段源视频无缝衔接（前出点=后入点）', fn.ctContig === true)
  check('素材条切口太靠近边缘 → 不切', fn.ctEdge === true)
  check('同时选中时优先切「卡」', fn.targetKind === 'instance', String(fn.targetKind))
  check('字幕切开后变 3 句且不重叠', fn.subCount === 3 && fn.subNoOverlap, `count=${fn.subCount} names=${fn.subNames}`)
  check('字幕切开后自动重编号', /口播字幕 01,口播字幕 02,口播字幕 03/.test(fn.subNames), fn.subNames)

  // ===== 2. 端到端：切开出镜素材条 =====
  console.log('\n=== 2. 端到端：切开素材条 ===')
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

  let tracks = await readTracks(page)
  check('导入视频后有一条素材条', tracks.length === 1, `条数=${tracks.length}`)
  const t0 = tracks[0]
  const mid = t0.start + t0.duration / 2

  // 选中素材条，播放头拖到中间
  await page.click('.os-host-src')
  await page.waitForTimeout(300)
  const landed = await seek(page, mid)
  const btnEnabled = await page.$eval('.os-btn-split', (el) => !el.disabled)
  check('播放头落在素材条中间时剪刀可用', btnEnabled, `落点 ${landed}s`)

  await page.click('.os-btn-split')
  await page.waitForTimeout(500)

  tracks = await readTracks(page)
  check('素材条被切成 2 段', tracks.length === 2, `条数=${tracks.length}`)
  if (tracks.length === 2) {
    const [a, b] = tracks
    check('前段结尾 = 切口', near(a.start + a.duration, mid, 0.1), `${a.start}~${a.start + a.duration}`)
    check('后段开始 = 切口', near(b.start, mid, 0.1), `${b.start}~${b.start + b.duration}`)
    check('两段源视频无缝衔接', near(a.trimIn + a.duration, b.trimIn, 0.1), `${a.trimIn + a.duration} vs ${b.trimIn}`)
  }

  // ===== 3. 端到端：切开一张卡 =====
  console.log('\n=== 3. 端到端：切开一张卡 ===')
  const instCount0 = (await readProject(page)).instances.length
  await page.click('[data-inst-id="i1"]')
  await page.waitForTimeout(300)
  await seek(page, 12)
  const btnEnabled2 = await page.$eval('.os-btn-split', (el) => !el.disabled)
  check('选中卡且播放头在卡内 → 剪刀可用', btnEnabled2)
  await page.click('.os-btn-split')
  await page.waitForTimeout(500)
  const instCount1 = (await readProject(page)).instances.length
  check('卡被切成 2 张', instCount1 === instCount0 + 1, `${instCount0} → ${instCount1}`)

  // 切开后后段被选中，但播放头正好在切口上 → 剪刀应立即变灰（不能再切）
  const btnAfter = await page.$eval('.os-btn-split', (el) => !el.disabled)
  check('切完后剪刀回到不可用（切口处不可再切）', !btnAfter)

  const shot = await page.$('.os-timeline')
  if (shot) await shot.screenshot({ path: SHOT })
  console.log(`  轨道截图已存到 ${path.relative(process.cwd(), SHOT)}`)

  console.log('\n=== 控制台错误 ===')
  console.log(errors.length ? errors.join('\n') : '  无')
  console.log(`\n结果：${pass} 通过 / ${fail} 失败`)

  await browser.close()
  process.exit(fail ? 1 : 0)
})()

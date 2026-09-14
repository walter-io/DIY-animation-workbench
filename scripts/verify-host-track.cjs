/**
 * 验证「出镜素材条」：出镜视频在时间轴上显示 + 可截断。
 *
 * 分两层：
 *   1. 纯函数（hostTrack.ts）：时间映射与三个裁剪动作的数学，含边界夹紧
 *   2. 端到端：真的用鼠标拖素材条的两端 / 整体，看画面是不是跟着变
 *
 * 关键不变量：拖左边缘改入点时，**出点必须纹丝不动**（剪映的手感）。
 */
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const { execFileSync } = require('child_process')

const KEY = 'animation-editor-project-v1'
const PORT = process.env.PORT || '5188'
const DURATION = 24
const HOST_VIDEO = path.join(__dirname, '_tmp', 'host-sample.mp4')
const SHOT = path.join(__dirname, '_tmp', 'host-track.png')

if (!fs.existsSync(HOST_VIDEO)) {
  fs.mkdirSync(path.dirname(HOST_VIDEO), { recursive: true })
  execFileSync('ffmpeg', [
    '-y', '-f', 'lavfi', '-i', 'testsrc=size=480x270:rate=15:duration=3',
    '-pix_fmt', 'yuv420p', '-loglevel', 'error', HOST_VIDEO,
  ])
}

const project = {
  name: 'host-track', skin: 'dark', style: 'glass', font: 'sans',
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
const readTrack = async (page) => (await readProject(page)).hostTracks?.[0]

/**
 * 拖播放头。点的是「标尺刻度的真实位置」—— 和真人操作一致。
 * 不能拿 .os-ruler 的宽度去算比例：轨道容器会被 CSS 拉伸撑满，
 * 宽度并不等于「duration × 每秒像素」，那样算出来点哪儿都不准。
 */
const seek = async (page, t) => {
  await page.evaluate((time) => {
    const ticks = [...document.querySelectorAll('.os-tick')]
    const k = Math.max(0, Math.min(ticks.length - 2, Math.floor(time)))
    const a = ticks[k].getBoundingClientRect()
    const b = ticks[k + 1]?.getBoundingClientRect()
    // 刻度是居中定位的：left 是 t*pxPerSec 再往左挪半个自身宽度，
    // 所以真正的“第 k 秒位置”是刻度的中心，不是左边缘。
    const cx = a.left + a.width / 2
    const pxPerSec = b ? b.left + b.width / 2 - cx : 36
    const ruler = document.querySelector('.os-ruler')
    ruler.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        clientX: cx + (time - k) * pxPerSec,
        clientY: a.top + 5,
      }),
    )
  }, t)
  await page.waitForTimeout(300)
  return await page.evaluate(() => {
    const txt = (document.querySelector('.os-time')?.textContent || '0:00').split('/')[0].trim()
    const [m, s] = txt.split(':').map(Number)
    return m * 60 + s
  })
}

/** 这一刻画面上有没有出镜画面 */
const hasHost = (page) => page.evaluate(() => !!document.querySelector('.os-host'))

/** 用真实鼠标事件拖某个元素（pointerdown → move → up） */
const dragBy = async (page, selector, dx) => {
  const el = await page.$(selector)
  if (!el) throw new Error('找不到元素：' + selector)
  const box = await el.boundingBox()
  const y = box.y + box.height / 2
  const x0 = box.x + box.width / 2
  await page.mouse.move(x0, y)
  await page.mouse.down()
  await page.mouse.move(x0 + dx, y, { steps: 10 })
  await page.mouse.up()
  await page.waitForTimeout(350)
}

/** 从素材条实测：1 秒等于多少像素（不用关心轨道缩放档位） */
const pxPerSec = async (page) => {
  const track = await readTrack(page)
  return await page.evaluate((dur) => {
    const el = document.querySelector('.os-host-src')
    if (!el || !dur) return 0
    return el.getBoundingClientRect().width / dur
  }, track?.duration)
}

let pass = 0
let fail = 0
const check = (name, ok, detail) => {
  console.log(`  ${ok ? '✅' : '❌'} ${name}${detail ? ' → ' + detail : ''}`)
  ok ? pass++ : fail++
}
const near = (a, b, tol = 0.02) => Math.abs(a - b) <= tol

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

  // ===== 1. 纯函数：时间映射与裁剪数学 =====
  console.log('\n=== 1. 纯函数（hostTrack.ts）===')
  const fn = await page.evaluate(async () => {
    const m = await import('/src/hostTrack.ts')
    const track = { id: 't1', start: 2, duration: 5, trimIn: 1, sourceDuration: 10 }
    return {
      // 没配素材条 = 老工程，1:1、全程出镜
      legacy: [m.hostSourceTime(undefined, 3), m.hostSourceTime([], 0)],
      // 配了素材条：起点 2s、长 5s、从源视频 1s 开始取
      before: m.hostSourceTime([track], 1.9),
      atStart: m.hostSourceTime([track], 2),
      mid: m.hostSourceTime([track], 4),
      atEnd: m.hostSourceTime([track], 7),
      after: m.hostSourceTime([track], 7.1),
      // 拖左边缘：出点（trimIn + duration = 6）必须保持不动
      trimRight1: m.trimHostStart(track, 1),
      trimRightClamp: m.trimHostStart(track, 99),
      trimLeftClamp: m.trimHostStart(track, -99),
      // 拖右边缘：不能超过源视频剩余长度（10 - 1 = 9）
      endGrow: m.trimHostEnd(track, 10),
      endShrink: m.trimHostEnd(track, -10),
      // 拖整体：不能超出项目结尾
      moveFar: m.moveHostTrack(track, 999, 24),
      moveNeg: m.moveHostTrack(track, -999, 24),
      normalizeNoSrc: m.normalizeHostTrack({ start: 0, duration: 3, trimIn: 0, sourceDuration: 0 }),
      normalizeClamp: m.normalizeHostTrack({ start: 0, duration: 99, trimIn: 8, sourceDuration: 10 }),
    }
  })

  check('老工程（无素材条）：播放头 3s → 视频 3s，全程出镜', fn.legacy[0] === 3 && fn.legacy[1] === 0, `${fn.legacy[0]}, ${fn.legacy[1]}`)
  check('素材区间前 → 不出镜', fn.before === null, String(fn.before))
  check('起点处 → 视频从入点 1s 开始', near(fn.atStart, 1), String(fn.atStart))
  check('区间中点 → 视频 3s', near(fn.mid, 3), String(fn.mid))
  check('区间末点 → 视频 6s', near(fn.atEnd, 6), String(fn.atEnd))
  check('素材区间后 → 不出镜', fn.after === null, String(fn.after))

  const r1 = fn.trimRight1
  check('拖左边缘 +1s：起点 2→3、入点 1→2、长度 5→4',
    near(r1.start, 3) && near(r1.trimIn, 2) && near(r1.duration, 4),
    `start=${r1.start} trimIn=${r1.trimIn} duration=${r1.duration}`)
  check('拖左边缘时出点不动（3+...=6）', near(r1.trimIn + r1.duration, 6), `出点=${r1.trimIn + r1.duration}`)
  check('拖左边缘过头 → 夹到最短 0.2s', near(fn.trimRightClamp.duration, 0.2), `duration=${fn.trimRightClamp.duration}`)
  // 往左拖到底：入点已经被还完了（还有 1s 可还），所以只能还原 1s
  check(
    '拖左边缘往左过头 → 入点夹回 0（起点只退 1s，因为可还原的就这么多）',
    near(fn.trimLeftClamp.trimIn, 0) && near(fn.trimLeftClamp.start, 1) && near(fn.trimLeftClamp.duration, 6),
    `trimIn=${fn.trimLeftClamp.trimIn} start=${fn.trimLeftClamp.start} duration=${fn.trimLeftClamp.duration}`,
  )
  check('拖左边缘往左过头 → 出点依然不动', near(fn.trimLeftClamp.trimIn + fn.trimLeftClamp.duration, 6),
    `出点=${fn.trimLeftClamp.trimIn + fn.trimLeftClamp.duration}`)
  check('拖右边缘往右过头 → 夹到源视频末尾（10s）', near(fn.endGrow.duration, 9), `duration=${fn.endGrow.duration}`)
  check('拖右边缘往左过头 → 夹到最短 0.2s', near(fn.endShrink.duration, 0.2), `duration=${fn.endShrink.duration}`)
  check('拖整体往右过头 → 夹到项目末尾（24-5=19s）', near(fn.moveFar.start, 19), `start=${fn.moveFar.start}`)
  check('拖整体往左过头 → 夹到 0', near(fn.moveNeg.start, 0), `start=${fn.moveNeg.start}`)
  check('源时长缺失 → 素材条作废（按老工程处理）', fn.normalizeNoSrc === undefined, String(fn.normalizeNoSrc))
  check('导入异常值 → 夹回合法范围',
    fn.normalizeClamp && near(fn.normalizeClamp.duration, 2) && near(fn.normalizeClamp.trimIn, 8),
    JSON.stringify(fn.normalizeClamp))

  // ===== 2. 导入视频后素材条出现在轨道上 =====
  console.log('\n=== 2. 轨道上出现出镜素材条 ===')
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => (x.textContent || '').includes('出镜 ·'))
    b && b.click()
  })
  await page.waitForTimeout(350)
  await page.setInputFiles('.os-dd-form input[type=file]', HOST_VIDEO)
  await page.waitForTimeout(1200)
  await page.keyboard.press('Escape')
  await page.mouse.click(840, 60)
  await page.waitForTimeout(300)

  const bars = await page.$$('.os-host-src')
  check('出现 1 条出镜素材条', bars.length === 1, `找到 ${bars.length} 条`)
  let track = await readTrack(page)
  // 样例视频的实际时长（脚本生成 10s 版本，但用实测值更稳）
  const SRC = track?.sourceDuration ?? 10
  check(`自动按视频时长建素材条（${SRC}s 整段全用）`,
    track && near(track.duration, SRC, 0.2) && near(track.trimIn, 0) && near(track.start, 0),
    JSON.stringify(track))

  const laneNames = await page.evaluate(() =>
    [...document.querySelectorAll('.os-track-label')].map((l) => l.textContent))
  check('泳道里多了「出镜」一行，且在「机位」之上',
    laneNames.includes('出镜') && laneNames.indexOf('出镜') < laneNames.indexOf('机位'),
    laneNames.join(' / '))

  // ===== 3. 拖右边缘截断：裁到 1.5s 左右，区间外应不出镜 =====
  console.log(`\n=== 3. 拖右边缘截断（${SRC}s → 约 1.5s）===`)
  const pps = await pxPerSec(page)
  check('算出轨道像素比', pps > 0, `${pps.toFixed(1)} px/s`)
  // 拖右边缘缩短 (SRC - 1.5) 秒 → 让最终 duration ≈ 1.5
  await dragBy(page, '.os-host-src .os-clip-handle-right', -(SRC - 1.5) * pps)
  track = await readTrack(page)
  check('素材长度被裁短到 ~1.5s', track && near(track.duration, 1.5, 0.3), `duration=${track?.duration}`)
  check('入点没被这次拖动影响', track && near(track.trimIn, 0), `trimIn=${track?.trimIn}`)

  const inRange = await seek(page, 0.8)
  const hostInRange = await hasHost(page)
  const outRange = await seek(page, 2.2)
  const hostOutRange = await hasHost(page)
  check('截断区间内（t≈0.8s）有出镜画面', hostInRange, `实际落点 ${inRange}s`)
  check('截断区间外（t≈2.2s）没有出镜画面', !hostOutRange, `实际落点 ${outRange}s`)

  // ===== 4. 拖整体挪位置 =====
  console.log('\n=== 4. 拖整体往后挪 2s ===')
  await dragBy(page, '.os-host-src', 2 * pps)
  track = await readTrack(page)
  check('起点挪到 ~2s', track && near(track.start, 2, 0.3), `start=${track?.start}`)
  check('长度没被整体拖动改变', track && near(track.duration, 1.5, 0.25), `duration=${track?.duration}`)

  const beforeStart = await seek(page, 1.0)
  const hostBeforeStart = await hasHost(page)
  const afterStart = await seek(page, 2.5)
  const hostAfterStart = await hasHost(page)
  check('挪走之后，原来出镜的时刻（t≈1s）变成没画面', !hostBeforeStart, `实际落点 ${beforeStart}s`)
  check('新的起点之后（t≈2.5s）有出镜画面', hostAfterStart, `实际落点 ${afterStart}s`)

  // ===== 5. 拖左边缘截断：入点前进，出点不动 =====
  console.log('\n=== 5. 拖左边缘截断（出点必须不动）===')
  const outBefore = track.trimIn + track.duration
  await dragBy(page, '.os-host-src .os-clip-handle-left', 0.5 * pps)
  const track2 = await readTrack(page)
  const outAfter = track2.trimIn + track2.duration
  check('入点前进了约 0.5s', track2 && near(track2.trimIn, track.trimIn + 0.5, 0.3),
    `${track?.trimIn} → ${track2?.trimIn}`)
  check('出点保持不动（这是剪映的手感）', near(outAfter, outBefore, 0.3), `${outBefore} → ${outAfter}`)
  check('长度相应变短', track2 && near(track2.duration, track.duration - 0.5, 0.3), `duration=${track2?.duration}`)

  // ===== 6. 视频内部时间跟着入点偏移（不是从头播）=====
  console.log('\n=== 6. 视频内部时间按入点偏移 ===')
  const srcTime = await page.evaluate(async () => {
    const m = await import('/src/hostTrack.ts')
    const raw = JSON.parse(localStorage.getItem('animation-editor-project-v1') || '{}')
    const tr = raw.hostTracks?.[0]
    return { atStart: m.hostSourceTime([tr], tr.start), mid: m.hostSourceTime([tr], tr.start + 0.5) }
  })
  check('素材条起点处 → 视频从入点开始播（不是从 0）', near(srcTime.atStart, track2.trimIn, 0.1),
    `视频第 ${srcTime.atStart}s（入点 ${track2.trimIn}s）`)

  const shot = await page.$('.os-timeline')
  if (shot) await shot.screenshot({ path: SHOT })
  console.log(`  轨道截图已存到 ${path.relative(process.cwd(), SHOT)}`)

  console.log('\n=== 控制台错误 ===')
  console.log(errors.length ? errors.join('\n') : '  无')
  console.log(`\n结果：${pass} 通过 / ${fail} 失败`)

  await browser.close()
  process.exit(fail ? 1 : 0)
})()

/**
 * 验证「出镜切换过渡」面板控件 + 实际画面是否平滑挪动。
 *
 * 用户原话：本来是半屏的，下一个机位换成左下角，画面就突然变了，
 * 而不是从半屏缓慢移动到左下角。
 *
 * 这里同时验证两件事：
 *   1. 参数面板上的「切换过渡」滑竿 / 「过渡缓动」按钮真的能改到数据
 *      （选中机位段时改本段，没选中时改新段默认值）
 *   2. 拖播放头过切换点时，出镜画面在屏幕上是一点点挪过去的，不是瞬移
 */
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const { execFileSync } = require('child_process')

const KEY = 'animation-editor-project-v1'
const PORT = process.env.PORT || '5188'
const DURATION = 24
// 出镜视频文件走顶栏下拉上传（hostUrl 存在 State 里，不进工程 JSON，刷新后要重新导）
const HOST_VIDEO = path.join(__dirname, '_tmp', 'host-sample.mp4')
const SHOT = path.join(__dirname, '_tmp', 'host-tween-panel.png')

/** 样例出镜视频不在就用 ffmpeg 现生成一个（3 秒、480x270，够测布局） */
if (!fs.existsSync(HOST_VIDEO)) {
  fs.mkdirSync(path.dirname(HOST_VIDEO), { recursive: true })
  execFileSync('ffmpeg', [
    // 10 秒够长：机位切换点在 5s，必须落在出镜素材区间内才有画面可测
    '-y', '-f', 'lavfi', '-i', 'testsrc=size=320x180:rate=10:duration=10',
    '-pix_fmt', 'yuv420p', '-loglevel', 'error', HOST_VIDEO,
  ])
}

const baseHost = {
  layout: 'split-right', x: 1384, y: 754, w: 480, h: 270,
  circular: false, radius: 24,
  focalX: 50, focalY: 50, zoom: 1, mirror: false,
  borderWidth: 4, borderColor: '#ffffff', shadow: true, opacity: 1,
}

const project = {
  name: 'host-tween-ui', skin: 'dark', style: 'glass', font: 'sans',
  palette: { accent: '#5ac8fa', data: '#5ac8fa', special: '#ffd166' },
  host: { ...baseHost },
  hostTransition: 0.6,
  hostEase: 'easeInOut',
  hostClips: [{ id: 'h1', start: 5, duration: 6, layout: 'circle-bl', zoom: 1 }],
  cardOpacity: 0.65,
  fps: 30, duration: DURATION, layout: 'edit', presets: [],
  instances: [
    {
      id: 'i1', effectId: 'section-header', name: '段头',
      start: 0, duration: DURATION, slot: 'center', fit: 'full',
      params: { num: '01', title: '测试', subtitle: '内容区随布局变', accent: '' },
    },
  ],
}

const readProject = (page) =>
  page.evaluate((k) => JSON.parse(localStorage.getItem(k) || '{}'), KEY)

/**
 * 拖播放头。点的是「标尺刻度的真实位置」—— 和真人操作一致。
 * 不能拿 .os-ruler 的宽度去算比例：轨道容器会被 CSS 拉伸撑满，
 * 宽度并不等于「duration × 每秒像素」，那样算出来点哪儿都不准。
 * 另外标尺 1px ≈ 15ms，落点会差一点点，所以返回真正落到的时间，判定以它为准。
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
  await page.waitForTimeout(320)
  return await page.evaluate(() => {
    const txt = (document.querySelector('.os-time')?.textContent || '0:00').split('/')[0].trim()
    const [m, s] = txt.split(':').map(Number)
    return m * 60 + s
  })
}

/** 设置某个滑竿的值：走原生 setter + input 事件，React 的 onChange 才收得到 */
const setRange = (page, labelText, value) =>
  page.evaluate(
    ({ labelText, value }) => {
      const label = [...document.querySelectorAll('.os-panel-right label')].find((l) =>
        (l.textContent || '').includes(labelText),
      )
      if (!label) return 'no-label'
      const input = label.querySelector('input[type=range]')
      if (!input) return 'no-range'
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
      setter.call(input, String(value))
      input.dispatchEvent(new Event('input', { bubbles: true }))
      return 'ok'
    },
    { labelText, value },
  )

/** 点「过渡缓动」里某个按钮 */
const clickEase = (page, name) =>
  page.evaluate(
    ({ name }) => {
      const label = [...document.querySelectorAll('.os-panel-right label')].find((l) =>
        (l.textContent || '').includes('过渡缓动'),
      )
      if (!label) return 'no-label'
      const btn = [...label.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === name)
      if (!btn) return 'no-btn'
      btn.click()
      return 'ok'
    },
    { name },
  )

/** 面板上「切换过渡」那一行的标题与当前显示值 */
const readTransitionRow = (page) =>
  page.evaluate(() => {
    const label = [...document.querySelectorAll('.os-panel-right label')].find((l) =>
      (l.textContent || '').includes('切换过渡'),
    )
    if (!label) return null
    const input = label.querySelector('input[type=range]')
    const value = label.querySelector('.os-range-value')
    return {
      text: (label.textContent || '').trim(),
      rangeValue: input ? Number(input.value) : null,
      shown: value ? value.textContent.trim() : null,
    }
  })

/** 量出镜画面在画布里的实际位置（换算回 1920 宽坐标系） */
const measureHost = (page) =>
  page.evaluate(() => {
    const host = document.querySelector('.os-host')
    const canvas = document.querySelector('.os-canvas')
    if (!host || !canvas) return null
    const r = host.getBoundingClientRect()
    const cr = canvas.getBoundingClientRect()
    const k = 1920 / cr.width
    return {
      x: Math.round((r.left - cr.left) * k),
      y: Math.round((r.top - cr.top) * k),
      w: Math.round(r.width * k),
      h: Math.round(r.height * k),
      radius: getComputedStyle(host).borderRadius,
    }
  })

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1680, height: 950 } })
  const errors = []
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })

  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle' })
  await page.evaluate((p) => localStorage.setItem('animation-editor-project-v1', JSON.stringify(p)), project)
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)

  // 导入出镜视频（顶栏「出镜 ·」下拉里）
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => (x.textContent || '').includes('出镜 ·'))
    b && b.click()
  })
  await page.waitForTimeout(350)
  await page.setInputFiles('.os-dd-form input[type=file]', HOST_VIDEO)
  await page.waitForTimeout(900)
  // 关掉下拉，免得挡住时间轴
  await page.keyboard.press('Escape')
  await page.mouse.click(840, 60)
  await page.waitForTimeout(300)

  const hostReady = await page.evaluate(() => !!document.querySelector('.os-host'))
  if (!hostReady) {
    console.log('❌ 出镜画面没渲染出来，后续检查无意义')
    await browser.close()
    process.exit(1)
  }

  // 选中卡片，参数面板才有内容
  await page.click('.os-clip')
  await page.waitForTimeout(300)

  let pass = 0
  let fail = 0
  const check = (name, ok, detail) => {
    console.log(`  ${ok ? '✅' : '❌'} ${name}${detail ? ' → ' + detail : ''}`)
    ok ? pass++ : fail++
  }

  // ===== 1. 播放头在机位段之外：改的是「新段默认」 =====
  console.log('\n=== 1. 播放头在段外（t=2）：改新段默认值 ===')
  await seek(page, 2)
  let row = await readTransitionRow(page)
  check('面板出现「切换过渡」控件', !!row, row ? row.text : '未找到')
  check('标题标注为「新段默认」', !!row && row.text.includes('新段默认'), row ? row.shown : '')

  let r1 = await setRange(page, '切换过渡', 1.2)
  await page.waitForTimeout(400)
  let p = await readProject(page)
  check('拖滑竿 → project.hostTransition = 1.2', r1 === 'ok' && p.hostTransition === 1.2, `实际 ${p.hostTransition}`)

  let e1 = await clickEase(page, '急停')
  await page.waitForTimeout(400)
  p = await readProject(page)
  check('点「急停」→ project.hostEase = easeOutQuart', e1 === 'ok' && p.hostEase === 'easeOutQuart', `实际 ${p.hostEase}`)

  // ===== 2. 播放头落在机位段内：改的是本段 =====
  console.log('\n=== 2. 播放头落在段内（t=6）：改本段 ===')
  await seek(page, 6)
  row = await readTransitionRow(page)
  check('标题切换为「本段」', !!row && row.text.includes('本段'), row ? row.text : '未找到')

  const r2 = await setRange(page, '切换过渡', 0.4)
  await page.waitForTimeout(400)
  p = await readProject(page)
  const clipAfter = (p.hostClips || [])[0] || {}
  check('拖滑竿 → 本段 transition = 0.4', r2 === 'ok' && clipAfter.transition === 0.4, `实际 ${clipAfter.transition}`)
  check('全局 hostTransition 没被本段改动波及', p.hostTransition === 1.2, `实际 ${p.hostTransition}`)

  const e2 = await clickEase(page, '匀速')
  await page.waitForTimeout(400)
  p = await readProject(page)
  const clipEase = (p.hostClips || [])[0] || {}
  check('点「匀速」→ 本段 ease = linear', e2 === 'ok' && clipEase.ease === 'linear', `实际 ${clipEase.ease}`)

  // 留一张面板截图，方便人眼确认控件长相
  await seek(page, 6)
  const panel = await page.$('.os-panel-right')
  if (panel) await panel.screenshot({ path: SHOT })
  console.log(`  面板截图已存到 ${path.relative(process.cwd(), SHOT)}`)

  // ===== 3. 画面是不是真的「一点一点挪过去」 =====
  console.log('\n=== 3. 实际画面：半屏 → 左下圆（切点 5.0s，过渡 0.6s）===')
  await seek(page, 6)
  await setRange(page, '切换过渡', 0.6) // 播放头在段内 → 改的是本段
  await page.waitForTimeout(300)
  const frames = []
  for (const want of [4.0, 5.05, 5.2, 5.35, 5.5, 5.65, 7.0]) {
    const at = await seek(page, want)
    frames.push({ want, t: at, ...(await measureHost(page)) })
  }
  for (const f of frames) {
    console.log(`  想看 ${f.want.toFixed(2)}s（实际 ${f.t.toFixed(2)}s）  x=${f.x} y=${f.y} w=${f.w} h=${f.h} 圆角=${f.radius}`)
  }

  const START_X = 960 // 右侧半屏
  const END_X = 63 // 左下圆
  const near = (a, b, tol = 40) => Math.abs(a - b) <= tol
  const between = frames.filter((f) => f.x < START_X - 60 && f.x > END_X + 60)
  const last = frames[frames.length - 1]
  const first = frames[0]

  check('切换前仍在右侧半屏', near(first.x, START_X), `t=${first.t}s x=${first.x}`)
  check(
    `过渡途中出现 ${between.length} 个中间位置（不是瞬移）`,
    between.length >= 3,
    between.map((f) => `${f.t}s:x=${f.x}`).join(' '),
  )
  check('过渡结束后停在左下角目标位', near(last.x, END_X) && near(last.y, 716), `t=${last.t}s x=${last.x} y=${last.y}`)
  const xs = frames.map((f) => f.x)
  const monotonic = xs.every((v, i) => i === 0 || v <= xs[i - 1] + 2)
  check('x 全程单调左移（逐帧连续、不回跳）', monotonic, xs.join(' → '))

  // ===== 4. 硬切对照：transition = 0 时应一步到位，没有中间态 =====
  console.log('\n=== 4. 对照：把过渡拖到 0（硬切，应无中间态）===')
  await seek(page, 6)
  await setRange(page, '切换过渡', 0)
  await page.waitForTimeout(300)
  const hard = []
  for (const want of [4.0, 5.05, 5.2, 5.5, 7.0]) {
    const at = await seek(page, want)
    hard.push({ want, t: at, ...(await measureHost(page)) })
  }
  for (const f of hard) {
    console.log(`  想看 ${f.want.toFixed(2)}s（实际 ${f.t.toFixed(2)}s）  x=${f.x} y=${f.y} w=${f.w} h=${f.h}`)
  }
  const hardBetween = hard.filter((f) => f.x < START_X - 60 && f.x > END_X + 60)
  check(
    'transition=0 时没有任何中间位置（直接跳）',
    hardBetween.length === 0,
    hardBetween.length ? hardBetween.map((f) => `${f.t}s:x=${f.x}`).join(' ') : '全部落点非起点即终点',
  )
  check(
    '硬切下同样能到达左下角目标位',
    near(hard[hard.length - 1].x, END_X),
    `x=${hard[hard.length - 1].x}`,
  )

  console.log('\n=== 控制台错误 ===')
  console.log(errors.length ? errors.join('\n') : '  无')
  console.log(`\n结果：${pass} 通过 / ${fail} 失败`)

  await browser.close()
  process.exit(fail ? 1 : 0)
})()

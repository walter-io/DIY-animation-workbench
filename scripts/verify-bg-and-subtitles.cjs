/**
 * 端到端验证（需要 dev server 先跑起来）：
 *
 *   npm run dev -- --port 5188      # 另开一个终端
 *   npm run verify:ui
 *
 * A. 背景透明度：像素级核对
 *    - 透明度 100%（cardOpacity 0）→ 卡片区域和无卡片的空白画布逐像素一致
 *      = 无背景、无模糊、无投影
 *    - 透明度 0%（cardOpacity 1）→ 卡片把画布的氛围光完全盖住（卡内两点同色）
 *      = 背景完全不透明
 *    - 两种极端下文字的亮像素数量 / 峰值亮度一致 = 透明度不影响文字清晰度和颜色
 *
 * B. 字幕轨拆分：编辑器端到端
 *    - 旧工程里的「一整轨 SRT 长卡」刷新后自动拆成一句一张卡
 *    - 每张卡可单独选中 / 改文案 / 插入 / 删除
 *    - 往右拖到底也不会和邻居重叠
 */
const { chromium } = require('playwright')

const BASE = process.env.VERIFY_BASE || 'http://127.0.0.1:5188'
const STORAGE_KEY = 'animation-editor-project-v1'

let passed = 0
let failed = 0
function ok(name, cond, detail) {
  if (cond) {
    passed++
    console.log(`  ✓ ${name}`)
  } else {
    failed++
    console.log(`  ✗ ${name}${detail !== undefined ? ` — ${detail}` : ''}`)
  }
}
function section(t) {
  console.log(`\n${t}`)
}

/** 注入到页面里的像素工具：借浏览器的 PNG 解码，省掉额外的图像依赖 */
const HELPERS = `
globalThis.__analyze = async ({ shots, rect, match }) => {
  const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b
  const out = []
  for (const b64 of shots) {
    const img = new Image()
    img.src = 'data:image/png;base64,' + b64
    await img.decode()
    const c = document.createElement('canvas')
    c.width = img.width; c.height = img.height
    const ctx = c.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(img, 0, 0)
    const data = ctx.getImageData(rect.x, rect.y, rect.w, rect.h).data
    const n = data.length / 4
    const sum = [0, 0, 0]
    const min = [255, 255, 255]
    const max = [0, 0, 0]
    let bright = 0, maxL = 0, hits = 0
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2]
      sum[0] += r; sum[1] += g; sum[2] += b
      for (let k = 0; k < 3; k++) {
        const v = data[i + k]
        if (v < min[k]) min[k] = v
        if (v > max[k]) max[k] = v
      }
      const l = lum(r, g, b)
      if (l > maxL) maxL = l
      if (l > 110) bright++
      if (match &&
          Math.abs(r - match[0]) <= match[3] &&
          Math.abs(g - match[1]) <= match[3] &&
          Math.abs(b - match[2]) <= match[3]) hits++
    }
    out.push({
      mean: sum.map((s) => +(s / n).toFixed(1)),
      spread: Math.max(...max.map((v, k) => v - min[k])),
      maxLum: Math.round(maxL),
      brightCount: bright,
      textHits: hits,
      total: n,
    })
  }
  return out
}
globalThis.__diff = async ({ a, b, rect }) => {
  const load = async (b64) => {
    const img = new Image()
    img.src = 'data:image/png;base64,' + b64
    await img.decode()
    const c = document.createElement('canvas')
    c.width = img.width; c.height = img.height
    const ctx = c.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(img, 0, 0)
    return ctx.getImageData(rect.x, rect.y, rect.w, rect.h).data
  }
  const da = await load(a)
  const db = await load(b)
  let sum = 0, max = 0
  for (let i = 0; i < da.length; i += 4) {
    for (let k = 0; k < 3; k++) {
      const d = Math.abs(da[i + k] - db[i + k])
      sum += d
      if (d > max) max = d
    }
  }
  const n = da.length / 4
  return { meanAbsDiff: +(sum / n / 3).toFixed(2), maxDiff: max }
}
`

const DEFAULT_HOST = {
  layout: 'off', x: 1384, y: 754, w: 480, h: 270,
  circular: false, radius: 24, focalX: 50, focalY: 50, zoom: 1, mirror: false,
  borderWidth: 4, borderColor: '#ffffff', shadow: true, opacity: 1,
}

function projectWith(cardOpacity, instances) {
  return {
    name: 'verify', skin: 'dark', style: 'glass', font: 'sans',
    palette: { accent: '#5ac8fa', data: '#5ac8fa', special: '#ffd166' },
    host: { ...DEFAULT_HOST },
    hostClips: [],
    cardOpacity,
    cardOpacityV2: true, // 跳过旧数值换算 —— 这里要的就是「真实覆盖率」
    fps: 30, duration: 8, layout: 'edit', presets: [],
    instances,
  }
}

/**
 * 背景板：左右两块纯色卡拼在一起，在 x=960 处留一条硬边界。
 * 有边界才能验证「模糊有没有一起消失」——真有 blur 的话这條边会被抹开。
 * 用着色笔把 .os-card 的底刷成纯色，不依赖具体卡片的视觉。
 */
const backdrop = (id, x, w, color) => ({
  id, effectId: 'section-header', name: '背景板',
  start: 0, duration: 8, slot: 'center', fit: 'box',
  free: true, x, y: 0, w, h: 1080,
  // 背景板自身固定成不透明，这样几张截图之间只有被测卡片在变
  cardOpacity: 1,
  paint: [{ id: `${id}_p`, path: [1], prop: 'background', color, text: '' }],
  params: { num: '', title: '', subtitle: '', accent: '' },
})
const BACKDROP = [backdrop('bl', 0, 960, '#ff3300'), backdrop('br', 960, 960, '#0055ff')]

/** 被测卡片：位置写死，方便取点 */
const CARD = {
  id: 'c1', effectId: 'section-header', name: '段头卡',
  start: 0, duration: 8, slot: 'center', fit: 'box',
  free: true, x: 540, y: 380, w: 840, h: 320,
  params: { num: '01', title: '第一部分', subtitle: '这一行用来核对文字有没有被透明度影响', accent: '' },
}

const CARD_RECT = { x: 540, y: 380, w: 840, h: 320 }
/**
 * 卡片内没有文字的横条（落在 padding 区，y 在内容上方）。
 * 分左右两段，避开背景板在 x=960 的硬边界，这样单段内是纯色。
 */
const BAND_L = { x: 560, y: 384, w: 380, h: 14 }
const BAND_R = { x: 980, y: 384, w: 380, h: 14 }
/** 横跨背景板硬边界（x=960）的一小条：模糊如果还在，这条边会被抹开 */
const EDGE = { x: 944, y: 384, w: 32, h: 14 }
/** 文字主色 #5ac8fa */
const ACCENT = [90, 200, 250, 6]

async function shotCanvas(browser, project) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.addInitScript(HELPERS)
  await page.addInitScript((p) => {
    globalThis.__EXPORT_PROJECT = p
    globalThis.__EXPORT_ALPHA = false
  }, project)
  await page.goto(`${BASE}/?render=1`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1000)
  // 推到 3s，让卡的入场动画跑完（不然文字还没显现）
  await page.evaluate(() => globalThis.__render && globalThis.__render.seek(3))
  await page.waitForTimeout(450)
  const buf = await page.locator('.os-canvas').screenshot()
  const b64 = buf.toString('base64')
  await page.close()
  return { b64, errors }
}

async function partA(browser) {
  section('A. 背景透明度（render 模式逐像素核对，画布 1920×1080，背后是红/蓝拼色板）')
  const bgOnly = await shotCanvas(browser, projectWith(0.35, BACKDROP))
  const full = await shotCanvas(browser, projectWith(1, [...BACKDROP, CARD])) // 透明度 0% → 完全不透明
  const none = await shotCanvas(browser, projectWith(0, [...BACKDROP, CARD])) // 透明度 100% → 完全隐藏
  const half = await shotCanvas(browser, projectWith(0.5, [...BACKDROP, CARD])) // 中间值

  ok(
    'render 模式无页面报错',
    [bgOnly, full, none, half].every((s) => s.errors.length === 0),
    [...bgOnly.errors, ...full.errors, ...none.errors, ...half.errors].join(' | '),
  )

  const page = await browser.newPage({ viewport: { width: 800, height: 600 } })
  await page.addInitScript(HELPERS)
  await page.goto('about:blank')
  const analyze = (shots, rect, match) =>
    page.evaluate((a) => globalThis.__analyze(a), { shots, rect, match: match || null })
  const diff = (a, b, rect) => page.evaluate((a) => globalThis.__diff(a), { a, b, rect })

  const [bgL, fL, nL, hL] = await analyze([bgOnly.b64, full.b64, none.b64, half.b64], BAND_L)
  const [bgR, fR, nR, hR] = await analyze([bgOnly.b64, full.b64, none.b64, half.b64], BAND_R)
  const [fT, nT] = await analyze([full.b64, none.b64], CARD_RECT, ACCENT)

  const dHiddenL = await diff(none.b64, bgOnly.b64, BAND_L)
  const dHiddenR = await diff(none.b64, bgOnly.b64, BAND_R)
  const dHiddenEdge = await diff(none.b64, bgOnly.b64, EDGE)

  console.log(`    无文字横条均色（左/红）：背景板 ${bgL.mean} · 不透明 ${fL.mean} · 全隐藏 ${nL.mean} · 50% ${hL.mean}`)
  console.log(`    无文字横条均色（右/蓝）：背景板 ${bgR.mean} · 不透明 ${fR.mean} · 全隐藏 ${nR.mean} · 50% ${hR.mean}`)
  console.log(`    全隐藏 vs 只有背景板：左侧 ${dHiddenL.meanAbsDiff}/${dHiddenL.maxDiff} · 右侧 ${dHiddenR.meanAbsDiff}/${dHiddenR.maxDiff} · 边界处 ${dHiddenEdge.meanAbsDiff}/${dHiddenEdge.maxDiff}`)
  console.log(`    文字主色像素数：不透明 ${fT.textHits} · 全隐藏 ${nT.textHits}`)

  ok(
    '透明度 100%：卡片区域和「没有这张卡」逐像素一致 = 无背景',
    dHiddenL.meanAbsDiff < 0.5 && dHiddenL.maxDiff <= 2 && dHiddenR.meanAbsDiff < 0.5 && dHiddenR.maxDiff <= 2,
    `左侧 ${dHiddenL.meanAbsDiff}/${dHiddenL.maxDiff}，右侧 ${dHiddenR.meanAbsDiff}/${dHiddenR.maxDiff}`,
  )
  ok(
    '透明度 100%：背景板红/蓝硬边界没被抹开 = 无模糊',
    dHiddenEdge.meanAbsDiff < 1 && dHiddenEdge.maxDiff <= 3,
    `边界处平均差 ${dHiddenEdge.meanAbsDiff}，最大差 ${dHiddenEdge.maxDiff}`,
  )
  ok(
    '透明度 0%：卡片内是纯净实色，背后的红蓝一点都没透出来 = 完全不透明',
    fL.spread <= 2 && fR.spread <= 2 && fL.mean[0] <= 20 && fR.mean[2] <= 20,
    `左段 ${fL.mean}(极差 ${fL.spread})，右段 ${fR.mean}(极差 ${fR.spread})`,
  )
  ok(
    '透明度 50%：落在两端之间（滑杆连续可调）',
    hL.mean[0] > 90 && hL.mean[0] < 180 && hR.mean[2] > 90 && hR.mean[2] < 180,
    `50% 左段 ${hL.mean}，右段 ${hR.mean}`,
  )
  ok(
    '两种极端下文字都渲染出来了',
    fT.textHits > 1000 && nT.textHits > 1000,
    `不透明 ${fT.textHits} · 全隐藏 ${nT.textHits}`,
  )
  const hitRatio = nT.textHits / Math.max(1, fT.textHits)
  ok(
    '文字颜色/清晰度不受背景透明度影响（主色像素数偏差 < 3%）',
    hitRatio > 0.97 && hitRatio < 1.03,
    `全隐藏 / 不透明 = ${hitRatio.toFixed(3)}`,
  )
  ok(
    '文字峰值亮度一致（没有被一起调暗）',
    Math.abs(nT.maxLum - fT.maxLum) <= 2,
    `${nT.maxLum} vs ${fT.maxLum}`,
  )

  await page.close()
}

const SRT = [
  '1', '00:00:00,500 --> 00:00:02,000', '欢迎来到本期节目', '',
  '2', '00:00:02,200 --> 00:00:04,500', '今天我们用数据讲增长', '',
  '3', '00:00:04,800 --> 00:00:07,000', '先看第一个数字',
].join('\n')

const clickByText = (page, text) =>
  page.evaluate((t) => {
    const btn = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').includes(t))
    if (!btn) return false
    btn.click()
    return true
  }, text)

async function partB(browser) {
  section('B. 字幕轨拆分（编辑器端到端）')
  const page = await browser.newPage({ viewport: { width: 1680, height: 950 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('console.error: ' + m.text())
  })

  const legacy = {
    name: 'srt-split', skin: 'dark', style: 'glass', font: 'sans',
    palette: { accent: '#5ac8fa', data: '#5ac8fa', special: '#ffd166' },
    host: { ...DEFAULT_HOST }, hostClips: [],
    cardOpacity: 0.35, cardOpacityV2: true,
    fps: 30, duration: 8, layout: 'edit', presets: [],
    instances: [
      {
        id: 'legacy_srt', effectId: 'srt-subtitle', name: '口播字幕',
        start: 0, duration: 7, slot: 'bottom', fit: 'auto',
        params: { srt: SRT, fontSize: 44, align: 'center', color: '#ffffff', box: true, bg: 'rgba(0,0,0,0.55)' },
      },
    ],
  }

  const readProject = () =>
    page.evaluate((k) => JSON.parse(localStorage.getItem(k) || 'null'), STORAGE_KEY)
  const subtitleClips = () =>
    page.evaluate(() =>
      [...document.querySelectorAll('.os-tracks .os-clip')]
        .map((el) => ({ top: el.style.top, text: (el.textContent || '').trim() }))
        // 第 1 条泳道 = 字幕轨（top = (1-1)*rowH + 3 = 3px）
        .filter((c) => c.top === '3px'),
    )
  const seekTo = async (sec) => {
    await page.evaluate((s) => {
      const dur = JSON.parse(localStorage.getItem('animation-editor-project-v1')).duration
      const tracks = document.querySelector('.os-tracks')
      const r = tracks.getBoundingClientRect()
      tracks.dispatchEvent(
        new MouseEvent('click', { bubbles: true, clientX: r.left + (s / dur) * r.width, clientY: r.top + 2 }),
      )
    }, sec)
    await page.waitForTimeout(350)
    return page.evaluate(() => document.querySelector('.os-srt-line')?.textContent ?? '')
  }

  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.evaluate((p) => localStorage.setItem('animation-editor-project-v1', JSON.stringify(p)), legacy)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1200)

  let proj = await readProject()
  let subs = proj.instances.filter((i) => i.effectId === 'srt-subtitle')
  ok('旧工程的一整轨长卡被拆成 3 张', subs.length === 3, `实际 ${subs.length}`)
  ok('每张卡自带一句文案', subs.every((i) => String(i.params.text || '').length > 0))
  ok('拆完不再保留整轨 SRT', subs.every((i) => !i.params.srt))

  const rail = (list) => [...list].sort((a, b) => a.start - b.start)
  const noOverlap = (list) =>
    list.every((s, i) => i === 0 || s.start >= list[i - 1].start + list[i - 1].duration - 1e-6)
  let sorted = rail(subs)
  ok('轨道内互不重叠', noOverlap(sorted), JSON.stringify(sorted.map((s) => [s.start, s.duration])))
  ok(
    '每句沿用原 SRT 的时间码',
    Math.abs(sorted[0].start - 0.5) < 0.01 && Math.abs(sorted[1].start - 2.2) < 0.01,
    JSON.stringify(sorted.map((s) => [s.start, s.duration])),
  )

  let clips = await subtitleClips()
  ok('时间轴字幕轨上有 3 个片段', clips.length === 3, `实际 ${clips.length}`)
  ok(
    '片段按「序号. 文案」标注',
    /^1\./.test(clips[0].text) && /^2\./.test(clips[1].text) && /^3\./.test(clips[2].text),
    JSON.stringify(clips.map((c) => c.text)),
  )

  // 单独选中第 2 句
  await page.evaluate(() => {
    const el = [...document.querySelectorAll('.os-tracks .os-clip')].filter((e) => e.style.top === '3px')[1]
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  await page.waitForTimeout(350)
  const textValue = await page.evaluate(() => {
    const row = [...document.querySelectorAll('.os-param-row')].find((r) =>
      (r.textContent || '').includes('本句文案'),
    )
    return row ? row.querySelector('textarea')?.value : null
  })
  ok('选中第 2 句 → 面板只显示它的文案', textValue === '今天我们用数据讲增长', String(textValue))
  const railRow = await page.evaluate(() => {
    const d = [...document.querySelectorAll('.os-param-divider')].find((x) =>
      (x.textContent || '').includes('字幕轨'),
    )
    return d ? d.textContent : null
  })
  ok('面板显示「第 2 / 3 句」', /第 2 \/ 3 句/.test(railRow || ''), String(railRow))

  // 改文案只影响这一句
  await page.evaluate(() => {
    const row = [...document.querySelectorAll('.os-param-row')].find((r) =>
      (r.textContent || '').includes('本句文案'),
    )
    const ta = row.querySelector('textarea')
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set
    setter.call(ta, '改过的第二句')
    ta.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await page.waitForTimeout(350)
  proj = await readProject()
  let texts = rail(proj.instances.filter((i) => i.effectId === 'srt-subtitle')).map((i) => i.params.text)
  ok(
    '改文案只动选中的这一句',
    texts[1] === '改过的第二句' && texts[0] === '欢迎来到本期节目',
    JSON.stringify(texts),
  )

  // 插入：新卡自动落在选中句之后，且自动被选中
  ok('点击「在本句后插入」', await clickByText(page, '在本句后插入'))
  await page.waitForTimeout(350)
  clips = await subtitleClips()
  ok('插入后变成 4 个片段', clips.length === 4, `实际 ${clips.length}`)
  proj = await readProject()
  const after4 = rail(proj.instances.filter((i) => i.effectId === 'srt-subtitle'))
  ok('插入后仍然互不重叠', noOverlap(after4), JSON.stringify(after4.map((s) => [s.start, s.duration])))

  // 删除刚插入的那张（此时它正处于选中态）
  ok('点击「删除本句」', await clickByText(page, '删除本句'))
  await page.waitForTimeout(350)
  clips = await subtitleClips()
  ok('删除后回到 3 个片段', clips.length === 3, `实际 ${clips.length}`)
  proj = await readProject()
  texts = rail(proj.instances.filter((i) => i.effectId === 'srt-subtitle')).map((i) => i.params.text)
  ok(
    '删掉的是新插入的那张，原三句文案都在',
    texts.join('|') === '欢迎来到本期节目|改过的第二句|先看第一个数字',
    JSON.stringify(texts),
  )

  // 拖动第 1 句到最右：必须被第 2 句夹住
  const box = await page.evaluate(() => {
    const el = [...document.querySelectorAll('.os-tracks .os-clip')].filter((e) => e.style.top === '3px')[0]
    const r = el.getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  })
  await page.mouse.move(box.x, box.y)
  await page.mouse.down()
  await page.mouse.move(box.x + 600, box.y, { steps: 14 })
  await page.mouse.up()
  await page.waitForTimeout(400)
  proj = await readProject()
  const dragged = rail(proj.instances.filter((i) => i.effectId === 'srt-subtitle'))
  ok(
    '把第 1 句往右拖 600px：被邻居夹住，轨道依然不重叠',
    noOverlap(dragged),
    JSON.stringify(dragged.map((s) => [s.start, s.duration])),
  )

  // 播放头落在哪一句，画布就显示哪一句
  await page.evaluate(() => {
    const el = [...document.querySelectorAll('.os-tracks .os-clip')].filter((e) => e.style.top === '3px')[0]
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  console.log(
    `    当前轨道：${JSON.stringify(dragged.map((s) => [s.start, s.duration, s.params.text]))}（工程时长 ${(await readProject()).duration}s）`,
  )
  // 每张卡取自己的中点时间：插入时后面的句子会被推后，删除不会自动拉回（同剪映）
  const mid = (s) => s.start + s.duration / 2
  const expect = ['欢迎来到本期节目', '改过的第二句', '先看第一个数字']
  for (let i = 0; i < dragged.length; i++) {
    const t = mid(dragged[i])
    const shown = await seekTo(t)
    ok(
      `播放头 ${t.toFixed(2)}s（第 ${i + 1} 句区间内）→ 画布显示「${expect[i]}」`,
      shown === expect[i],
      `实际 "${shown}"`,
    )
  }
  // 句子之间的空隙里不该残留字幕
  const gap = (dragged[1].start + dragged[1].duration + dragged[2].start) / 2
  ok(`播放头落在两句之间的空隙 ${gap.toFixed(2)}s → 不显示任何字幕`, (await seekTo(gap)) === '', '仍有字幕残留')

  ok(
    '编辑器无页面报错',
    errors.length === 0,
    errors.slice(0, 3).join(' | '),
  )
  await page.close()
}

;(async () => {
  const browser = await chromium.launch()
  try {
    await partA(browser)
    await partB(browser)
  } catch (err) {
    failed++
    console.error('\n执行出错：', err)
  } finally {
    // 部分环境里 browser.close() 会挂住不返回，这里不 await，直接让进程收尾
    browser.close().catch(() => undefined)
  }
  console.log(`\n${'─'.repeat(52)}`)
  console.log(failed === 0 ? `全部通过：${passed} 项` : `通过 ${passed} 项，失败 ${failed} 项`)
  // 先把 stdout 排空再退出，否则管道/重定向下最后几行会被截掉
  await new Promise((r) => process.stdout.write('', r))
  process.exit(failed === 0 ? 0 : 1)
})()

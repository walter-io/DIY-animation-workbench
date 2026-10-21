/**
 * 浅色主题可读性审计：逐元素算 WCAG 对比度，列出"看不清"的文字。
 *
 *   node scripts/audit-contrast.cjs            # 审浅色皮肤 + 画布跟随主题
 *   node scripts/audit-contrast.cjs light white # 浅色皮肤 + 白色画布
 *   node scripts/audit-contrast.cjs dark        # 深色皮肤（做对照）
 *
 * 现状（2026-10）：浅色 / 浅色+白画布 / 深色 三档均为 **0 处不达标**。
 * （早先版本在 `.os-clip-name` 上报 3 处 1.08，那是本脚本 `foldDeeper` 的
 *  合成方向写反导致的假阳性，已修，见下。）
 *
 * 做法：
 *   1. 起一个自带 vite，用 localStorage 预置一个「皮肤=浅色 + 几张卡」的工程；
 *   1.5 **逐个打开编辑台外壳与全部弹窗**（模板 / 导出 / 导入SRT / 历史版本 / 重置），
 *       每个面单独跑一遍审计。⚠️ 这一条是 2026-10 补上的：上一版只审外壳，
 *       结果「弹窗里靠继承取色的文字在浅色主题下变白」这一整类问题（模板弹窗
 *       标题、模板名白底白字）完全没被发现。以后加弹窗务必加进 SURFACES。
 *   2. 页面里遍历所有"直接渲染文字"的元素，取 color；
 *   3. 从**元素自己**往根一层层 source-over 合成祖先的背景（含 alpha），遇到第一个
 *      "够不透明"（a >= 0.999）的层就停；祖先若用了渐变，把渐变里所有颜色当候选底色，
 *      取**最差**的那个（保守估计）。注意方向：早期版本从根往下走，会把祖先的渐变
 *      误当成元素自己的底色（导出按钮因此误报 1.07）。
 *   4. 能解析 `color(srgb r g b / a)` —— 这是 Chrome 对 `color-mix()` 的序列化形式，
 *      不认它会让刚改过的按钮报假阳性；
 *   5. 算 WCAG 对比度，按从差到好排序输出，并写 `scripts/_tmp/contrast-out/report-<tag>.txt`。
 *
 * 判定线：正文 < 4.5、大字号(>=18.66px bold / >=24px) < 3 视为不合格。
 */
const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')
const { chromium } = require('playwright')

const PORT = 5235
const ROOT = path.resolve(__dirname, '..')
const OUT = path.join(__dirname, '_tmp/contrast-out')
// 位置参数：<light|dark> [画布背景]；带 --assert 时有不合格项就以退出码 1 结束
const ARGS = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const ASSERT = process.argv.includes('--assert')
const SKIN = ARGS[0] === 'dark' ? 'dark' : 'light'
const CANVAS_BG = ARGS[1] || 'auto'
const TAG = CANVAS_BG === 'auto' ? SKIN : `${SKIN}-bg${CANVAS_BG}`
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function waitFor(url, ms = 90000) {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) {
    try {
      const res = await fetch(url)
      if (res.ok) return
    } catch {}
    await sleep(500)
  }
  throw new Error('dev server not reachable')
}

const PROJECT = {
  version: 1,
  meta: { duration: 20, fps: 30, width: 1920, height: 1080 },
  name: '浅色主题审计',
  style: 'glass',
  font: 'sans',
  skin: SKIN,
  layout: 'edit',
  palette: { accent: '', data: '', special: '' },
  cardOpacity: 0.9,
  cardSize: 'md',
  canvasBg: CANVAS_BG,
  instances: [
    {
      id: 'c1',
      effectId: 'core-number-roller',
      name: '核心数字滚动',
      start: 0,
      duration: 4,
      slot: 'center',
      fit: 'full',
      params: { label: '累计交付', target: 12847, suffix: '+' },
    },
    {
      id: 'c2',
      effectId: 'bullet-list',
      name: '要点清单',
      start: 5,
      duration: 4,
      slot: 'left',
      fit: 'auto',
      params: { title: '三个要点', items: ['其一', '其二', '其三'] },
    },
    {
      id: 'c3',
      effectId: 'ex-title-slide',
      name: '解说标题页',
      start: 10,
      duration: 5,
      slot: 'center',
      fit: 'full',
      params: { title: '知识解说', sub: '一页一件事' },
    },
  ],
  imageClips: [],
  subtitles: [],
  mediaAssets: [],
}

/**
 * 逐个打开审计的「面」。btn = 顶栏按钮的可访问名；null = 编辑台外壳。
 * ⚠️ 新增弹窗后必须在这里补一行 —— 漏掉的面 = 漏掉的整类可读性问题。
 */
const SURFACES = [
  { tag: 'shell', label: '编辑台外壳', btn: null },
  { tag: 'templates', label: '模板弹窗', btn: '模板' },
  { tag: 'export', label: '导出弹窗', btn: '导出' },
  { tag: 'srt', label: '导入口播稿弹窗', btn: '导入口播稿' },
  { tag: 'home', label: '历史版本弹窗', btn: '历史版本' },
  { tag: 'reset', label: '重置确认弹窗', btn: '重置编辑台' },
]

/** 关掉当前弹窗（优先点 × 号，退路 Esc）；没弹窗时直接返回 */
async function closeModal(page) {
  for (let i = 0; i < 3; i += 1) {
    const vis = await page
      .locator('.os-modal-mask')
      .first()
      .isVisible()
      .catch(() => false)
    if (!vis) return true
    const closed = await page
      .locator('.os-modal-close')
      .first()
      .click({ timeout: 3000 })
      .then(() => true)
      .catch(() => false)
    if (!closed) await page.keyboard.press('Escape').catch(() => {})
    await sleep(400)
  }
  return false
}

/**
 * 页面内跑的审计：返回所有渲染文字元素的对比度。
 * rootSel 给了就把范围收窄到该子树（审弹窗时用 `.os-modal-mask`，
 * 否则弹窗打开时还会把下面那层编辑台再数一遍，既重复计数也看不清归属）。
 */
const AUDIT = (rootSel) => {
  const parseColor = (s) => {
    if (!s) return null
    // color(srgb r g b / a)：Chrome 会把 color-mix() 的结果序列化成这个写法，
    // 不认它就会把"压深后的渐变"当成解析失败 → 假阳性（曾把 1.06 报在正常按钮上）
    const cm = s.match(/color\(srgb\s+([^)]+)\)/i)
    if (cm) {
      const q = cm[1].split(/[,\s/]+/).filter(Boolean).map(Number)
      if (q.length >= 3 && q.slice(0, 3).every((n) => Number.isFinite(n))) {
        return {
          r: Math.max(0, Math.min(255, q[0] * 255)),
          g: Math.max(0, Math.min(255, q[1] * 255)),
          b: Math.max(0, Math.min(255, q[2] * 255)),
          a: q.length > 3 && Number.isFinite(q[3]) ? q[3] : 1,
        }
      }
    }
    const m = s.match(/rgba?\(([^)]+)\)/)
    if (!m) return null
    const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number)
    if (p.length < 3) return null
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }
  }
  /** 标准 source-over：top 压在 bottom 上（含 alpha 合成，绝不能直接返回 a:1） */
  const over = (top, bottom) => {
    const outA = top.a + bottom.a * (1 - top.a)
    if (outA <= 0) return { r: 0, g: 0, b: 0, a: 0 }
    return {
      r: (top.r * top.a + bottom.r * bottom.a * (1 - top.a)) / outA,
      g: (top.g * top.a + bottom.g * bottom.a * (1 - top.a)) / outA,
      b: (top.b * top.a + bottom.b * bottom.a * (1 - top.a)) / outA,
      a: outA,
    }
  }
  const lum = (c) => {
    const f = (v) => {
      const x = v / 255
      return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)
    }
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b)
  }
  const ratio = (a, b) => {
    const l1 = lum(a)
    const l2 = lum(b)
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
  }
  /** 渐变里所有颜色；没有渐变就返回空 */
  const gradColors = (img) => {
    if (!img || img === 'none') return []
    return (img.match(/rgba?\([^)]+\)|color\(srgb[^)]+\)/g) || []).map(parseColor).filter(Boolean)
  }

  const sel = (el) => {
    const cls = (el.className || '')
      .toString()
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .join('.')
    return `${el.tagName.toLowerCase()}${cls ? '.' + cls : ''}`
  }

  const results = []
  const scope = rootSel ? document.querySelector(rootSel) : null
  const all = scope ? scope.querySelectorAll('*') : document.querySelectorAll('body *')
  for (const el of all) {
    // 只看"自己直接渲染文字"的元素，避免父容器重复计数
    let text = ''
    for (const n of el.childNodes) {
      if (n.nodeType === 3) text += n.nodeValue
    }
    text = text.replace(/\s+/g, ' ').trim()
    if (!text) continue
    const cs = getComputedStyle(el)
    if (cs.visibility === 'hidden' || cs.display === 'none') continue
    if (Number(cs.opacity) < 0.05) continue
    const r = el.getBoundingClientRect()
    if (r.width < 2 || r.height < 2) continue
    if (cs.webkitBackgroundClip === 'text' || cs.backgroundClip === 'text') continue // 渐变文字，另算
    const fg = parseColor(cs.color)
    if (!fg) continue

    // 从 el 往外逐层 source-over 合成，遇到第一层不透明背景就停 ——
    // 更深层的颜色被它完全挡住，不能再参与"最差底色"的计算，否则会把
    // 「深色按钮上的白字」误判成「浅底上的白字」（曾经的假阳性来源）。
    const levels = []
    for (let n = el; n; n = n.parentElement) {
      const ncs = getComputedStyle(n)
      levels.push({ c: parseColor(ncs.backgroundColor), g: gradColors(ncs.backgroundImage) })
    }
    /**
     * 比 idx 更深（更靠外层）的那一坨叠完是什么颜色。
     * ⚠️ 这里的合成方向与下面主循环**相反**：主循环从元素往外走，acc 是上层的
     * 那个，所以写 `over(acc, c)`；这里从最深的 html 往里走，acc 才是**下层**，
     * 必须写 `over(c, acc)`。
     * 早期版本两处都写成 `over(acc, c)`，于是每次往下叠都把 html 的深色
     * （#151519）当成"压在上面"的赢家 —— 任何渐变元素都会凭空多出一个
     * 「近黑底色」候选，`span.os-clip-name` 的深字因此被误报成 1.08。
     * 别再改回去。
     */
    const foldDeeper = (idx) => {
      let acc = { r: 0, g: 0, b: 0, a: 0 }
      for (let k = levels.length - 1; k > idx; k -= 1) {
        const c = levels[k].c
        if (c && c.a > 0) acc = over(c, acc)
      }
      return acc
    }
    let acc = { r: 0, g: 0, b: 0, a: 0 }
    const candidates = []
    for (let i = 0; i < levels.length; i += 1) {
      const { c, g } = levels[i]
      if (c && c.a > 0) acc = over(acc, c)
      if (g.length) {
        // 该层的渐变压在自己背景色之上、又被 acc 压住；它下面还有更深的一坨
        const below = foldDeeper(i)
        for (const gc of g) candidates.push(over(acc, over(gc, below)))
        // ⚠️ 只要这一层的渐变**每一档都不透明**，它就把更深的层整块挡住了，
        // 深层的底色不能再当候选 —— 否则 `.os-clip` 的不透明渐变之上还会
        // 冒出一个"时间轴底色"候选（深色主题下它近黑，于是深色字被误报 1.16）。
        if (g.every((x) => x.a >= 0.999)) acc = over(acc, g[0])
      }
      if (acc.a >= 0.999) break
    }
    if (candidates.length === 0) candidates.push(acc)
    const base = candidates[0]
    const fgSolid = fg.a >= 1 ? fg : over(fg, base)

    let worst = Infinity
    for (const bgc of candidates) worst = Math.min(worst, ratio(fgSolid, bgc))
    const px = parseFloat(cs.fontSize)
    const bold = Number(cs.fontWeight) >= 700
    const large = px >= 24 || (bold && px >= 18.66)
    const need = large ? 3 : 4.5
    results.push({
      sel: sel(el),
      text: text.slice(0, 34),
      color: cs.color,
      ownBg: cs.backgroundColor,
      bgImage: cs.backgroundImage === 'none' ? '' : cs.backgroundImage.slice(0, 60),
      opacity: Number(cs.opacity),
      disabled: el.disabled === true ? 'disabled' : '',
      bg: `rgb(${candidates[0].r.toFixed(0)}, ${candidates[0].g.toFixed(0)}, ${candidates[0].b.toFixed(0)})`,
      ratio: Number(worst.toFixed(2)),
      px: Math.round(px),
      bold,
      need,
      fail: worst < need,
    })
  }
  return results
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true })
  const vite = spawn(
    `"${process.env.NODE_EXE || 'node'}" ./node_modules/vite/bin/vite.js --port ${PORT} --host ::1 --strictPort`,
    { cwd: ROOT, shell: true, stdio: 'ignore' },
  )
  let browser
  let failed = 0
  const lines = []
  const log = (s = '') => lines.push(s)
  try {
    await waitFor(`http://localhost:${PORT}/`)
    browser = await chromium.launch()
    const ctx = await browser.newContext({ viewport: { width: 1680, height: 950 } })
    await ctx.addInitScript((p) => {
      localStorage.setItem('animation-editor-project-v1', JSON.stringify(p))
    }, PROJECT)
    const page = await ctx.newPage()
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.os-panel-left, .os-app', { timeout: 30000 })
    await sleep(1500)
    for (let i = 0; i < 4; i += 1) {
      const vis = await page
        .locator('.os-modal-mask')
        .first()
        .isVisible()
        .catch(() => false)
      if (!vis) break
      await page.keyboard.press('Escape')
      await sleep(350)
    }
    await sleep(600)

    const uiClass = await page.evaluate(() => document.querySelector('.os-app')?.className)
    log(`皮肤 = ${SKIN}；画布背景 = ${CANVAS_BG}；.os-app class = ${uiClass}`)

    // ── 逐面审计：外壳 + 每个弹窗 ────────────────────────────────────
    const all = []
    const perSurface = []
    for (const s of SURFACES) {
      if (s.btn) {
        const clicked = await page
          .locator('.os-topbar')
          .getByRole('button', { name: s.btn })
          .first()
          .click({ timeout: 8000 })
          .then(() => true)
          .catch(() => false)
        if (!clicked) {
          perSurface.push({ s, n: 0, bad: -1 })
          log(`!! 面「${s.label}」打不开（按钮「${s.btn}」点不到），已跳过`)
          await closeModal(page)
          continue
        }
        await page.waitForSelector('.os-modal-mask', { timeout: 8000 }).catch(() => {})
        await sleep(700)
      }
      const res = await page.evaluate(AUDIT, s.btn ? '.os-modal-mask' : null)
      for (const r of res) r.surface = s.label
      all.push(...res)
      perSurface.push({ s, n: res.length, bad: res.filter((r) => r.fail).length })
      await page.screenshot({ path: path.join(OUT, `surface-${s.tag}-${TAG}.png`) })
      if (s.btn) await closeModal(page)
    }

    log('\n=== 各面文字量 / 不合格数 ===')
    for (const p of perSurface) {
      log(`${p.s.label.padEnd(16)} 文字 ${String(p.n).padStart(4)}  不合格 ${p.bad < 0 ? '  ?' : String(p.bad).padStart(3)}`)
    }

    const res = all
    const bad = res.filter((r) => r.fail).sort((a, b) => a.ratio - b.ratio)
    failed = bad.length
    log(`\n共审计 ${res.length} 处文字，其中 ${bad.length} 处低于 WCAG 门槛\n`)
    log('=== 不合格清单（按对比度从差到好）===')
    for (const r of bad) {
      log(
        `${String(r.ratio).padStart(5)} (需 ${r.need})  [${r.surface}] ${r.sel}  ${r.px}px${r.bold ? ' bold' : ''}` +
          `\n          fg ${r.color}  ownBg ${r.ownBg}${r.bgImage ? `  bgImg ${r.bgImage}` : ''}` +
          `${r.opacity < 1 ? `  opacity ${r.opacity}` : ''}${r.disabled ? `  ${r.disabled}` : ''}` +
          `\n          合成后底色 ${r.bg}  「${r.text}」`,
      )
    }
    // 按「面 + 选择器」归并，方便一次改一处 CSS
    const bySel = new Map()
    for (const r of bad) {
      const k = `[${r.surface}] ${r.sel}`
      if (!bySel.has(k)) bySel.set(k, { n: 0, worst: r.ratio, sample: r.text })
      const v = bySel.get(k)
      v.n += 1
      v.worst = Math.min(v.worst, r.ratio)
    }
    log('\n=== 按「面 + 选择器」归并（n = 命中数量，worst = 最差对比度）===')
    for (const [k, v] of [...bySel.entries()].sort((a, b) => a[1].worst - b[1].worst)) {
      log(`${String(v.worst).padStart(5)}  n=${String(v.n).padStart(3)}  ${k}   「${v.sample}」`)
    }

    // 全景截图，便于肉眼核对
    await page.screenshot({ path: path.join(OUT, `full-${TAG}.png`) })
    // 几个关键面板的局部截图
    const shots = [
      ['.os-panel-left', `left-${SKIN}.png`],
      ['.os-topbar', `topbar-${SKIN}.png`],
      ['.os-panel:last-child', `right-${SKIN}.png`],
    ]
    for (const [s, name] of shots) {
      const b = await page.locator(s).first().boundingBox().catch(() => null)
      if (b) {
        await page.screenshot({
          path: path.join(OUT, name),
          clip: { x: Math.max(0, b.x), y: Math.max(0, b.y), width: b.width, height: Math.min(b.height, 900) },
        })
      }
    }
    const timeline = await page.locator('.os-timeline, .os-track-area, .os-tracks').first().boundingBox().catch(() => null)
    if (timeline) {
      await page.screenshot({
        path: path.join(OUT, `timeline-${TAG}.png`),
        clip: { x: Math.max(0, timeline.x), y: Math.max(0, timeline.y), width: timeline.width, height: Math.min(timeline.height, 400) },
      })
    }
  } finally {
    if (browser) await browser.close().catch(() => {})
    try {
      vite.kill()
    } catch {}
    try {
      spawn('taskkill', ['/pid', String(vite.pid), '/T', '/F'], { stdio: 'ignore' })
    } catch {}
  }
  const txt = lines.join('\n')
  fs.writeFileSync(path.join(OUT, `report-${TAG}.txt`), txt, 'utf8')
  process.stdout.write(txt + '\n')
  if (ASSERT && failed) {
    process.stdout.write(`\n✖ [${TAG}] 有 ${failed} 处文字低于 WCAG 门槛\n`)
    process.exitCode = 1
  } else if (ASSERT) {
    process.stdout.write(`\n✔ [${TAG}] 全部达标\n`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

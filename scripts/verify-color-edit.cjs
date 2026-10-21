/**
 * 回归测试：改取色器（文字色 / 强调色…）不能让编辑台崩掉。
 *
 *   npm run verify:color-edit
 *
 * 背景（用户报障）：
 *   「点击'因果链路'这个动效卡编辑文字颜色会闪退，检查下其他动效卡会不会也有这个问题。」
 *
 * 根因：hf（iframe）卡的 params 一变就重建 srcDoc，iframe 文档换页的那一瞬间
 *   `contentDocument.documentElement` 还是 null，而 HyperframesCard 里那个写
 *   `--cardOpacity` 的 useEffect 直接取了 `.style` → TypeError。
 *   React 19 下 effect 里未捕获的异常会**卸载整棵树** → 整个编辑台白屏。
 *   ⚠️ 它和具体是哪个卡无关：**所有 hf 卡**都走这个共用组件，所以全会中招；
 *   纯 React 卡没有 iframe，不受影响。
 *
 * 本脚本做的事：把改色事件用 setTimeout 摊到多个宏任务里，故意与 React 渲染 +
 * iframe 重建交叉，最大化竞态命中率（原来的偶发崩溃就是这么打出来的）。
 *
 * 判定：
 *   每张卡都要求
 *     ① 改色风暴之后 .os-app 还在、#root 仍有内容（= 没被卸载）
 *     ② 页面 0 个未捕获错误（pageerror / unhandledrejection）
 *     ③ 参数面板仍在（说明右侧没有跟着塌掉）
 */
const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')
const { chromium } = require('playwright')

const PORT = 5252
const ROOT = path.resolve(__dirname, '..')
const OUT = path.join(__dirname, '_tmp/color-edit')
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

/** 被覆盖的卡：hf 卡（iframe，会走 srcDoc 重建）+ 纯 React 卡（对照） */
const CARDS = [
  { id: 'hf-cause-chain', name: '因果链路（用户报障的那张）', hf: true },
  { id: 'hf-big-number-card', name: '大数字结论卡', hf: true },
  { id: 'hf-checklist-pop', name: '清单核对', hf: true },
  { id: 'core-number-roller', name: '核心数字滚动（纯 React 对照）', hf: false },
  { id: 'bullet-list', name: '要点清单（纯 React 对照）', hf: false },
]

const PROJECT = {
  version: 1,
  meta: { duration: 40, fps: 30, width: 1920, height: 1080 },
  name: '取色稳定性回归',
  style: 'glass',
  font: 'sans',
  skin: 'dark',
  layout: 'edit',
  palette: { accent: '', data: '', special: '' },
  cardOpacity: 0.9,
  cardSize: 'md',
  canvasBg: 'auto',
  instances: CARDS.map((c, i) => ({
    id: `t${i}`,
    effectId: c.id,
    name: c.name,
    start: i * 6,
    duration: 5,
    slot: ['center', 'left', 'right', 'center', 'left'][i],
    fit: c.hf ? 'full' : 'auto',
    params: {},
  })),
  imageClips: [],
  subtitles: [],
  mediaAssets: [],
}

/** 把 N 次改色摊到 N 个宏任务（gap 毫秒一次），与 React 渲染交叉。立即返回。 */
const STORM = ({ sel, n, gap }) => {
  const d = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')
  window.__storm = { done: 0, gone: 0 }
  for (let i = 0; i < n; i += 1) {
    setTimeout(() => {
      const cur = document.querySelector(sel)
      if (!cur) {
        window.__storm.gone += 1
        window.__storm.done += 1
        return
      }
      const c = '#' + ((i * 37 + 11) % 256).toString(16).padStart(2, '0').repeat(3)
      try {
        d.set.call(cur, c)
        cur.dispatchEvent(new Event('input', { bubbles: true }))
        cur.dispatchEvent(new Event('change', { bubbles: true }))
      } catch {
        /* 由外层断言覆盖 */
      }
      window.__storm.done += 1
    }, i * gap)
  }
  return true
}

/**
 * instId 传了就只数那张卡自己的兜底提示 —— 兜底一旦触发是有状态的（要手动重试才清），
 * 不按卡圈定的话，第一张卡坏了会让后面每张卡的断言都跟着红，看不出到底谁出问题。
 */
const HEALTH = (instId) => {
  const scope = instId ? `.os-inst[data-paint-id="${instId}"]` : 'body'
  return {
    app: !!document.querySelector('.os-app'),
    rootChildren: document.getElementById('root')?.childElementCount ?? -1,
    paramRows: document.querySelectorAll('.os-param-row').length,
    // 单卡错误兜底有没有被触发 —— 这是最灵敏的信号：
    // 有了 CardErrorBoundary 之后，"整页白屏"会被降级成"这一张卡出错"，
    // 所以只断言 .os-app 还在 是测不出回归的，必须盯这个。
    cardErrors: document.querySelectorAll(`${scope} .os-card-error`).length,
    allCardErrors: document.querySelectorAll('.os-card-error').length,
    errs: (window.__errs || []).length,
  }
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true })
  const vite = spawn(
    `"${process.env.NODE_EXE || 'node'}" ./node_modules/vite/bin/vite.js --port ${PORT} --host ::1 --strictPort`,
    { cwd: ROOT, shell: true, stdio: 'ignore' },
  )
  let browser
  const checks = []
  const fails = []
  const assert = (name, ok, detail = '') => {
    checks.push({ name, ok, detail })
    if (!ok) fails.push(`${name}${detail ? ` — ${detail}` : ''}`)
  }

  try {
    await waitFor(`http://localhost:${PORT}/`)
    browser = await chromium.launch()
    const ctx = await browser.newContext({ viewport: { width: 1680, height: 950 } })
    await ctx.addInitScript(() => {
      window.__errs = []
      window.addEventListener('error', (e) => {
        window.__errs.push({ m: String(e.message), s: (e.error && e.error.stack) || '' })
      })
      window.addEventListener('unhandledrejection', (e) => {
        window.__errs.push({ m: 'rejection: ' + String(e.reason), s: (e.reason && e.reason.stack) || '' })
      })
    })
    await ctx.addInitScript((p) => localStorage.setItem('animation-editor-project-v1', JSON.stringify(p)), PROJECT)

    const page = await ctx.newPage()
    const pageErrors = []
    // 单卡兜底触发时组件会 console.error('[动效卡渲染出错]', …)，单独收集
    const cardBoundaryHits = []
    page.on('pageerror', (e) => pageErrors.push(`${e.message}\n${String(e.stack).split('\n').slice(0, 6).join('\n')}`))
    page.on('crash', () => pageErrors.push('PAGE CRASHED'))
    page.on('console', (m) => {
      const t = m.text()
      if (m.type() === 'error' && (t.includes('动效卡渲染出错') || t.includes("reading 'style'"))) {
        cardBoundaryHits.push(t.slice(0, 300))
      }
    })

    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.os-app', { timeout: 30000 })
    await sleep(1500)
    // 关掉可能自动弹出的弹窗
    for (let i = 0; i < 3; i += 1) {
      if (await page.locator('.os-modal-mask').first().isVisible().catch(() => false)) {
        await page.locator('.os-modal-close').first().click().catch(() => {})
        await sleep(350)
      } else break
    }

    // ── 逐卡：选中 → 取色器风暴 ──────────────────────────────────
    for (let i = 0; i < CARDS.length; i += 1) {
      const card = CARDS[i]
      const clipSel = `.os-clip[data-inst-id="t${i}"]`
      const clipCount = await page.locator(clipSel).count()
      assert(`[${card.id}] 时间轴上有该卡的片段`, clipCount > 0, `找到 ${clipCount} 个`)
      if (!clipCount) continue

      await page.locator(clipSel).first().click()
      await sleep(700)

      const rowSel = '.os-param-row input[type=color]'
      const colorCount = await page.locator(rowSel).count()
      assert(`[${card.id}] 参数面板里有取色器`, colorCount > 0, `找到 ${colorCount} 个`)
      if (!colorCount) continue

      // 每张卡都把**所有**取色器各刷 30 次。
      // 选择器不依赖 data-content-key —— 有的卡（纯 React 卡）那行没有这个属性，
      // 早期版本因此静默跳过了这些卡的风暴断言（等于没测）。
      // 改成每次风暴前给第 k 个取色器打一个临时标记，用它定位。
      for (let k = 0; k < colorCount; k += 1) {
        const target = await page.evaluate((idx) => {
          const all = [...document.querySelectorAll('.os-param-row input[type=color]')]
          all.forEach((el) => el.removeAttribute('data-probe-idx'))
          const el = all[idx]
          if (!el) return null
          el.setAttribute('data-probe-idx', String(idx))
          return `input[type=color][data-probe-idx="${idx}"]`
        }, k)
        assert(`[${card.id}] 定位得到第 ${k + 1} 个取色器`, !!target, `colorCount=${colorCount}`)
        if (!target) continue
        await page.evaluate(STORM, { sel: target, n: 30, gap: 6 })
        await sleep(520)
        const h = await page.evaluate(HEALTH, `t${i}`)
        assert(`[${card.id}] 第 ${k + 1} 个取色器风暴 30 次后应用仍在`, h.app && h.rootChildren > 0, JSON.stringify(h))
        assert(`[${card.id}] 第 ${k + 1} 个取色器风暴后参数面板仍在`, h.paramRows > 0, `paramRows=${h.paramRows}`)
        assert(`[${card.id}] 第 ${k + 1} 个取色器风暴没触发单卡兜底`, h.cardErrors === 0, JSON.stringify(h))
        if (!h.app) break
      }

      const errsInPage = pageErrors.length
      assert(`[${card.id}] 全程没有未捕获错误`, errsInPage === 0, pageErrors.slice(0, 2).join(' | '))

      const h = await page.evaluate(HEALTH, `t${i}`)
      assert(`[${card.id}] 收尾时 .os-app 仍在`, h.app, JSON.stringify(h))
      await page.screenshot({ path: path.join(OUT, `${card.id}.png`) })
      if (!h.app) break
    }

    // ── 全局：再对「因果链路」来一轮更密的（再现原始场景） ────────
    const hf0 = '.os-clip[data-inst-id="t0"]'
    if (await page.locator(hf0).count()) {
      await page.locator(hf0).first().click()
      await sleep(600)
      const fg = await page.evaluate(() => {
        const row = document.querySelector('.os-param-row[data-content-key="foreground"]')
        return row ? '.os-param-row[data-content-key="foreground"] input[type=color]' : null
      })
      if (fg) {
        for (let r = 0; r < 6; r += 1) {
          await page.evaluate(STORM, { sel: fg, n: 40, gap: 4 })
          await sleep(600)
        }
        const h = await page.evaluate(HEALTH, 't0')
        assert('[因果链路] 6 轮 × 40 次密集改文字色后应用仍在', h.app && h.rootChildren > 0, JSON.stringify(h))
        assert('[因果链路] 密集改文字色全程 0 未捕获错误', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '))
        assert('[因果链路] 密集改文字色后参数面板仍在', h.paramRows > 0, `paramRows=${h.paramRows}`)
        assert('[因果链路] 密集改文字色没触发单卡兜底', h.cardErrors === 0, JSON.stringify(h))
      } else {
        assert('[因果链路] 找得到「文字色」取色器', false, '没有 data-content-key="foreground" 的行')
      }
    }

    const inPageErrs = await page.evaluate(() => window.__errs || []).catch(() => [])
    assert('页面内 error 钩子记录为 0', Array.isArray(inPageErrs) && inPageErrs.length === 0,
      Array.isArray(inPageErrs) ? JSON.stringify(inPageErrs.slice(0, 2)) : '读取失败')
    assert('页面没有崩溃（pageerror 为空）', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '))
    assert('全程没有触发单卡错误兜底', cardBoundaryHits.length === 0, cardBoundaryHits.slice(0, 2).join(' | '))
  } finally {
    if (browser) await browser.close().catch(() => {})
    try {
      vite.kill()
    } catch {}
    try {
      spawn('taskkill', ['/pid', String(vite.pid), '/T', '/F'], { stdio: 'ignore' })
    } catch {}
  }

  const lines = []
  for (const c of checks) lines.push(`${c.ok ? '✔' : '✖'} ${c.name}${c.detail && !c.ok ? `  (${c.detail})` : ''}`)
  lines.push('')
  lines.push(fails.length === 0 ? `全部通过：${checks.length}/${checks.length}` : `${fails.length} 项失败（共 ${checks.length} 项）`)
  const txt = lines.join('\n')
  fs.writeFileSync(path.join(OUT, 'report.txt'), txt, 'utf8')
  process.stdout.write(txt + '\n')
  process.exit(fails.length === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

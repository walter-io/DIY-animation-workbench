/**
 * 左栏「动效库」头部布局回归 —— 保证「动效库 (n)」右边的三个按钮
 * （详情 / 简洁 / 全收）在任何面板宽度下都不会被挤出面板。
 *
 *   npm run verify:panel-header
 *
 * 背景：面板默认只有 220px 宽（可拖到 180px）。曾经把「叠加在有人物的口播画面上」
 * 这句长说明挂在标题右边，句子一长就把三个按钮整个推到面板外面（实测越界 100px）。
 * 现在说明移到页签下方独占一行（.os-lib-hint），头部本身加了三道保险：
 *   flex-wrap 换行 + 标题/按钮组 flex: 0 0 auto 不压缩。
 *
 * 断言（三种宽度各跑一遍）：
 *   1. 左面板没有横向溢出（scrollWidth <= clientWidth + 1）
 *   2. 三个按钮的右边界都在面板内（actions.right <= panel.right）
 *   3. 「动效库 (n)」标题没被压扁（宽度 >= 其自身 scrollWidth - 1）
 *   4. 220px 档必须是一行（header 高度 36px）；180px 档允许换行但必须仍不越界
 *   5. 说明文字就一行、在页签下方，且自己不会横向溢出
 *
 * 自包含：自己起 vite，跑完自己关。
 */
const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')
const { chromium } = require('playwright')

const PORT = 5233
const ROOT = path.resolve(__dirname, '..')
const OUT = path.join(ROOT, '_screenshots')
const W_KEY = 'animation-editor-panel-width-v1'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

let passed = 0
let failed = 0
function ok(name, cond, detail) {
  if (cond) {
    passed += 1
    console.log(`  ✓ ${name}`)
  } else {
    failed += 1
    console.log(`  ✗ ${name}${detail !== undefined ? ` — ${detail}` : ''}`)
  }
}

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

const MEASURE = () => {
  const r = (el) => {
    if (!el) return null
    const b = el.getBoundingClientRect()
    return {
      x: Math.round(b.x),
      y: Math.round(b.y),
      right: Math.round(b.right),
      bottom: Math.round(b.bottom),
      w: Math.round(b.width),
      h: Math.round(b.height),
      scrollW: el.scrollWidth,
      clientW: el.clientWidth,
      scrollH: el.scrollHeight,
      clientH: el.clientHeight,
    }
  }
  const panel = document.querySelector('.os-panel-left')
  return {
    panel: r(panel),
    header: r(document.querySelector('.os-panel-header-lib')),
    title: r(document.querySelector('.os-lib-header-title')),
    actions: r(document.querySelector('.os-lib-header-actions')),
    hint: r(document.querySelector('.os-lib-hint')),
    hintText: (document.querySelector('.os-lib-hint')?.textContent ?? '').trim(),
    tabs: r(document.querySelector('.os-lib-tabs')),
    buttons: Array.from(document.querySelectorAll('.os-lib-header-actions button')).map((b) => {
      const bb = b.getBoundingClientRect()
      return { text: b.textContent.trim(), right: Math.round(bb.right), w: Math.round(bb.width) }
    }),
  }
}

async function checkWidth(browser, width, expectOneRow) {
  console.log(`\n== 面板宽度 ${width}px ==`)
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  await page.addInitScript(
    ([k, w]) => {
      localStorage.setItem(k, JSON.stringify({ left: w, right: 252 }))
    },
    [W_KEY, width],
  )
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.os-panel-header-lib', { timeout: 30000 })
  await sleep(900)
  for (let i = 0; i < 4; i += 1) {
    const vis = await page
      .locator('.os-modal-mask')
      .first()
      .isVisible()
      .catch(() => false)
    if (!vis) break
    await page.keyboard.press('Escape')
    await sleep(300)
  }
  await sleep(400)
  const m = await page.evaluate(MEASURE)

  const p = m.panel
  const a = m.actions
  const t = m.title
  const h = m.hint

  ok(
    `左面板无横向溢出（scrollW ${p.scrollW} <= clientW ${p.clientW}）`,
    p.scrollW <= p.clientW + 1,
    `溢出 ${p.scrollW - p.clientW}px`,
  )
  ok(
    `按钮组在面板内（actions.right ${a.right} <= panel.right ${p.right}）`,
    a.right <= p.right,
    `越界 ${a.right - p.right}px`,
  )
  for (const b of m.buttons) {
    ok(`「${b.text}」按钮在面板内（right ${b.right} <= ${p.right}）`, b.right <= p.right, `越界 ${b.right - p.right}px`)
  }
  ok(
    `标题没被压扁（w ${t.w} >= scrollW ${t.scrollW} - 1）`,
    t.w >= t.scrollW - 1,
    `被裁 ${t.scrollW - t.w}px`,
  )
  ok(
    `说明在页签下方（hint.y ${h.y} >= tabs.bottom ${m.tabs.bottom}）`,
    h.y >= m.tabs.bottom - 6,
    `hint.y=${h.y} tabs.bottom=${m.tabs.bottom}`,
  )
  ok(
    `说明文字就是当前库那句（${JSON.stringify(m.hintText)}）`,
    /口播画面|PPT/i.test(m.hintText),
    m.hintText,
  )
  ok(
    `说明自身不横向溢出（scrollW ${h.scrollW} <= clientW ${h.clientW} + 1）`,
    h.scrollW <= h.clientW + 1,
    `溢出 ${h.scrollW - h.clientW}px`,
  )
  if (expectOneRow) {
    ok(`头部保持一行（height ${m.header.h} = 36）`, m.header.h <= 40, `实际 ${m.header.h}px`)
  } else {
    ok(
      `头部换行后高度自然增高（height ${m.header.h}）`,
      m.header.h >= 36,
      `实际 ${m.header.h}px`,
    )
  }

  fs.mkdirSync(OUT, { recursive: true })
  const box = await page.locator('.os-panel-left').boundingBox()
  if (box) {
    await page.screenshot({
      path: path.join(OUT, `panel-header-${width}.png`),
      clip: { x: box.x, y: box.y, width: box.width, height: Math.min(300, box.height) },
    })
  }

  // 「拓展包」面板复用同一套 .os-panel-header-lib 样式（标题 + 右侧按钮），一并守一下
  const packTab = page.locator('.os-left-tab').filter({ hasText: '拓展包' }).first()
  if (await packTab.count()) {
    await packTab.click()
    await sleep(500)
    const m2 = await page.evaluate(MEASURE)
    ok(
      `拓展包头部无横向溢出（scrollW ${m2.panel.scrollW} <= clientW ${m2.panel.clientW}）`,
      m2.panel.scrollW <= m2.panel.clientW + 1,
      `溢出 ${m2.panel.scrollW - m2.panel.clientW}px`,
    )
    ok(
      `拓展包头部按钮在面板内（contentRight ${m2.actions.right} <= ${m2.panel.right}）`,
      m2.actions.right <= m2.panel.right,
      `越界 ${m2.actions.right - m2.panel.right}px`,
    )
  }
  await ctx.close()
}

async function main() {
  const vite = spawn(
    `"${process.env.NODE_EXE || 'node'}" ./node_modules/vite/bin/vite.js --port ${PORT} --host ::1 --strictPort`,
    { cwd: ROOT, shell: true, stdio: 'ignore' },
  )
  let browser
  try {
    await waitFor(`http://localhost:${PORT}/`)
    browser = await chromium.launch()
    await checkWidth(browser, 220, true) // 默认
    await checkWidth(browser, 180, false) // 最窄（可拖到的下限）
    await checkWidth(browser, 300, true) // 拉宽
  } finally {
    if (browser) await browser.close().catch(() => {})
    try {
      vite.kill()
    } catch {}
    try {
      spawn('taskkill', ['/pid', String(vite.pid), '/T', '/F'], { stdio: 'ignore' })
    } catch {}
  }
  console.log(`\n结果：${failed === 0 ? '全部通过 ✅' : `失败 ${failed} 项 ❌`}（通过 ${passed}）`)
  process.exit(failed === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

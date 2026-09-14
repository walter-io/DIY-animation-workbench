/**
 * 渲染前内容铺开审计（借鉴 hyperframes-motion-library 的 audit-layout）：
 * 用无头 Chrome 打开 render 页，在动画"最完整时刻"测量真实内容边界
 * （非透明像素的包围盒：面积 / 横向跨度 / 纵向跨度），防止大空面板误判为已铺满。
 *
 * 用法：node scripts/audit-layout.cjs [--host http://127.0.0.1:5173]
 * 需要先启动 dev server（npm run dev）。
 */
const { chromium } = require('playwright')

const HOST = process.argv.find((a) => a.startsWith('--host='))?.slice(7) ?? 'http://127.0.0.1:5173'
// 测量时刻：取卡时长的 85%（动画基本落定，接近完整画面）
const MEASURE_AT = 0.85

function buildProject(effectId, params) {
  const duration = Number(params.duration ?? 5)
  return {
    name: 'audit-layout',
    skin: 'dark',
    style: 'glass',
    font: 'sans',
    fps: 30,
    duration,
    layout: 'edit',
    instances: [
      {
        id: 'audit',
        effectId,
        name: 'audit',
        start: 0,
        duration,
        slot: 'center',
        params,
      },
    ],
  }
}

/**
 * 测量实例内容铺开：
 *  - 遍历所有元素，用 getBoundingClientRect 找"有实际内容"的元素
 *    （非 .os-* 装饰类、有文本或子元素、宽高 > 2px）
 *  - 计算包围盒相对 1920×1080 的横向/纵向跨度与面积占用
 */
async function measure(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('.os-canvas')
    if (!canvas) return null
    const cw = canvas.clientWidth
    const ch = canvas.clientHeight
    if (cw < 2 || ch < 2) return null
    const kx = 1920 / cw
    const ky = 1080 / ch

    // 收集"真实内容"元素：有非空文本、或非装饰 class、或 SVG path
    const DECOR = /os-canvas|os-slot|os-free|os-grid|os-ambient|os-spec|os-safe|os-chapter/
    const points = []
    const all = canvas.querySelectorAll('*')
    for (const el of all) {
      const cls = String(el.className ?? '')
      if (DECOR.test(cls)) continue
      const rect = el.getBoundingClientRect()
      const w = rect.width
      const h = rect.height
      if (w < 2 || h < 2) continue
      const text = (el.textContent ?? '').trim()
      const hasKids = el.children.length > 0
      const hasSvg = el.querySelector?.('svg, path, circle, rect, line') != null
      if (!text && !hasKids && !hasSvg) continue
      points.push({
        x: rect.left * kx,
        y: rect.top * ky,
        w: w * kx,
        h: h * ky,
      })
    }
    if (points.length === 0) return null

    const minX = Math.min(...points.map((p) => p.x))
    const minY = Math.min(...points.map((p) => p.y))
    const maxX = Math.max(...points.map((p) => p.x + p.w))
    const maxY = Math.max(...points.map((p) => p.y + p.h))
    const spanW = (maxX - minX) / 1920
    const spanH = (maxY - minY) / 1080
    const area = Math.max(0, Math.min(1, spanW * spanH))
    return {
      spanW: Number(spanW.toFixed(3)),
      spanH: Number(spanH.toFixed(3)),
      area: Number(area.toFixed(3)),
      boxes: points.length,
    }
  })
}

async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))

  await page.goto(HOST, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1000)
  // 从 registry 拉全部卡
  const registry = await page.evaluate(async () => (await (await fetch('/api/registry')).json()))
  console.log(`审计 ${registry.length} 张卡（测量时刻 = 卡时长的 ${MEASURE_AT * 100}%）\n`)

  const results = []
  for (const def of registry) {
    const project = buildProject(def.id, def.defaultParams)
    await page.addInitScript(
      (p) => {
        globalThis.__EXPORT_PROJECT = p
        globalThis.__EXPORT_ALPHA = false
      },
      project,
    )
    await page.goto(`${HOST}/?render=1`, { waitUntil: 'domcontentloaded' })
    try {
      await page.waitForFunction(() => globalThis.__render?.ready, { timeout: 15000 })
      await page.evaluate(() => document.fonts.ready)
      await page.waitForTimeout(800)
      const t = Number(project.duration) * MEASURE_AT
      await page.evaluate(
        (tt) => {
          const r = globalThis.__render
          r.seek(tt)
        },
        t,
      )
      await page.waitForTimeout(500)
      const m = await measure(page)
      if (!m) {
        console.log(`  ${def.id.padEnd(28)} ⚠ 测不到内容`)
        continue
      }
      const flag =
        m.spanW < 0.3 || m.spanH < 0.2 ? ' ⚠ 内容偏小（可能没铺满）' : m.spanW > 0.99 || m.spanH > 0.99 ? ' ⚠ 溢出画布' : ''
      console.log(
        `  ${def.id.padEnd(28)} 横向 ${(m.spanW * 100).toFixed(0).padStart(3)}%  纵向 ${(m.spanH * 100).toFixed(0).padStart(3)}%  面积 ${(m.area * 100).toFixed(0).padStart(3)}%${flag}`,
      )
      results.push({ id: def.id, ...m })
    } catch (e) {
      console.log(`  ${def.id.padEnd(28)} ❌ ${e instanceof Error ? e.message.slice(0, 60) : String(e)}`)
    }
  }

  console.log('\n=== 汇总 ===')
  const ok = results.filter((r) => r.spanW >= 0.3 && r.spanH >= 0.2 && r.spanW <= 0.99 && r.spanH <= 0.99)
  const small = results.filter((r) => r.spanW < 0.3 || r.spanH < 0.2)
  const overflow = results.filter((r) => r.spanW > 0.99 || r.spanH > 0.99)
  console.log(`通过 ${ok.length} | 偏小 ${small.length} | 溢出 ${overflow.length} | 失败 ${results.length - ok.length - small.length - overflow.length}`)
  if (small.length) console.log('偏小：' + small.map((r) => r.id).join(', '))
  if (overflow.length) console.log('溢出：' + overflow.map((r) => r.id).join(', '))
  if (errors.length) {
    console.log('\n页面错误：')
    errors.slice(0, 8).forEach((e) => console.log('  ' + e))
  }
  await browser.close()
}

main().catch((e) => {
  console.error('FAIL:', e)
  process.exit(1)
})

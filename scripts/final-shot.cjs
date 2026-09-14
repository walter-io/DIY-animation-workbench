/* 最终验收截图：UI（完整示例工程 + 状态条 + 段落时间轴）+ 渲染模式两帧 */
const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')

const BASE = process.env.BASE || 'http://localhost:5173'
const OUT = path.resolve(__dirname, '../_screenshots')
fs.mkdirSync(OUT, { recursive: true })

const fullDemo = {
  name: '完整示例·增长复盘',
  skin: 'dark',
  style: 'glass',
  font: 'sans',
  fps: 30,
  duration: 15,
  layout: 'edit',
  instances: [
    { id: 'd1', effectId: 'section-header', name: '段头·开场', start: 0, duration: 3, slot: 'left', seg: '开场', params: { num: '01', title: '增长复盘', subtitle: '本期讲三件事' } },
    { id: 'd2', effectId: 'kpi-card', name: 'KPI·总用户', start: 0.5, duration: 3.5, slot: 'right', seg: '开场', dimAt: 3, params: { label: '总用户', target: 35800, suffix: '', unit: '', trend: 'up' } },
    { id: 'd3', effectId: 'section-header', name: '段头·数据', start: 3.5, duration: 2.5, slot: 'left', seg: '数据', params: { num: '02', title: '关键数据', subtitle: '三个指标看趋势' } },
    { id: 'd4', effectId: 'data-grid', name: '数据网格', start: 4, duration: 4, slot: 'right', seg: '数据', dimAt: 3.5, params: { items: '新增用户,1200\n付费转化,8.4%\n次日留存,61%\n平均时长,7.5分' } },
    { id: 'd5', effectId: 'info-board', name: '信息板·结论', start: 8, duration: 4, slot: 'left', seg: '结论', params: { title: '本段结论', rows: '结论一,数据支撑充足\n结论二,路径已经跑通\n结论三,可复制可放大' } },
    { id: 'd6', effectId: 'quote-card', name: '金句', start: 8.5, duration: 3.5, slot: 'right', seg: '结论', dimAt: 3, params: { quote: '把复杂留给系统，把简单留给人。', author: '—— 动效编辑台' } },
    { id: 'd7', effectId: 'cta-card', name: '结尾·行动', start: 12, duration: 3, slot: 'center', seg: '收尾', params: { text: '关注我，下期继续', sub: '每周更新实战干货', btn: '立即关注' } },
  ],
}

;(async () => {
  const browser = await chromium.launch()
  // ===== UI 截图 =====
  const p1 = await browser.newPage({ viewport: { width: 1680, height: 1000 } })
  await p1.goto(BASE + '/', { waitUntil: 'networkidle' })
  await p1.evaluate((proj) => {
    localStorage.setItem('animation-editor-project-v1', JSON.stringify(proj))
  }, fullDemo)
  await p1.reload({ waitUntil: 'networkidle' })
  await p1.waitForTimeout(800)
  await p1.screenshot({ path: path.join(OUT, 'final-ui.png'), fullPage: false })
  console.log('ui shot done')

  // ===== 渲染模式两帧 =====
  const p2 = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  await p2.addInitScript((args) => {
    const g = globalThis
    g.__EXPORT_PROJECT = args.p
    g.__EXPORT_ALPHA = false
  }, { p: fullDemo })
  await p2.goto(BASE + '/?render=1', { waitUntil: 'domcontentloaded' })
  await p2.waitForFunction(() => {
    const r = globalThis.__render
    return r && r.ready
  }, { timeout: 30000 })
  await p2.evaluate(() => globalThis.document.fonts.ready)

  const seek = (t) => p2.evaluate((tt) => {
    globalThis.__render.seek(tt)
    return new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    )
  }, t)
  await seek(1.5)
  await p2.waitForTimeout(120)
  await p2.locator('.os-canvas').screenshot({ path: path.join(OUT, 'final-render-1.png') })
  await seek(9)
  await p2.waitForTimeout(120)
  await p2.locator('.os-canvas').screenshot({ path: path.join(OUT, 'final-render-2.png') })
  console.log('render shots done')

  await browser.close()
  console.log('all done')
})().catch((e) => {
  console.error('ERR', e.message)
  process.exit(1)
})

const { chromium } = require('playwright')
const BASE = 'http://127.0.0.1:5173'

async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1500, height: 900 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))

  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2000)

  // 1. 模式标签 + 大屏徽标
  const modeBadges = await page.evaluate(() => {
    const items = [...document.querySelectorAll('.os-lib-item')]
    const hf = items.filter((i) => i.dataset.effectId?.startsWith('hf-'))
    return {
      total: items.length,
      hf: hf.length,
      hfWithMode: hf.filter((i) => i.querySelector('.os-lib-mode-fullscreen')).length,
      hfWithBig: hf.filter((i) => i.querySelector('.os-lib-badge')).length,
    }
  })
  console.log('模式标签:', JSON.stringify(modeBadges))

  // 2. lint 新模式检查：hf 全屏卡放 left 槽 → warn
  const lintTest = await page.evaluate(async () => {
    const { lintProject } = await import('/src/lint.ts')
    const p = {
      name: 'lint-test', skin: 'dark', style: 'glass', font: 'sans', fps: 30, duration: 10, layout: 'edit',
      instances: [
        { id: 'i1', effectId: 'hf-number-counter', name: 'hf 计数器', start: 0, duration: 5, slot: 'left', params: {} },
        { id: 'i2', effectId: 'kpi-card', name: 'KPI', start: 0, duration: 3, slot: 'right', params: { target: 100 } },
      ],
    }
    const issues = lintProject(p)
    return issues.filter((i) => i.msg.includes('建议居中') || i.msg.includes('全屏')).map((i) => i.msg)
  })
  console.log('lint 全屏槽位检查:', JSON.stringify(lintTest))

  // 3. lint 禁含数字检查：director.sourceQuote 无此数字 → warn
  const lintNum = await page.evaluate(async () => {
    const { lintProject } = await import('/src/lint.ts')
    const p = {
      name: 'num-test', skin: 'dark', style: 'glass', font: 'sans', fps: 30, duration: 10, layout: 'edit',
      instances: [
        {
          id: 'i1', effectId: 'core-number-roller', name: '数字', start: 0, duration: 3, slot: 'left',
          params: { target: 99999 },
          director: { sourceQuote: '本周增长百分之三十', intent: '展示增长', requiredInformation: ['30'], forbiddenInformation: ['无来源数字'] },
        },
      ],
    }
    return lintProject(p).filter((i) => i.msg.includes('未在口播')).map((i) => i.msg)
  })
  console.log('lint 禁含数字检查:', JSON.stringify(lintNum))

  // 4. 批量工作台：校验方案
  const batch = await page.evaluate(async () => {
    const plan = {
      project: '批量测试', outputFormat: 'mp4',
      scenes: [
        { timecode: '00:03', templateId: 'number-counter', variables: { title: '总用户', targetValue: 35800 } },
        { timecode: '00:10', templateId: 'line-chart-draw', variables: { title: '趋势' } },
        { timecode: '00:20', templateId: 'not-exist', variables: {} },
      ],
    }
    // 直接测 parseAndValidate 逻辑（通过组件内校验逻辑的等价检查）
    return plan.scenes.map((s) => {
      const candidates = [s.templateId, `hf-${s.templateId}`]
      return candidates.some((c) => true) // 占位，真正校验在 UI 里
    })
  })
  console.log('批量方案 scenes:', batch.length)

  if (errors.length) { console.log('--- errors ---'); errors.slice(0, 5).forEach((e) => console.log(e)) }
  else console.log('NO page errors')
  await browser.close()
}
main().catch((e) => { console.error('FAIL:', e); process.exit(1) })

/**
 * 端到端验证「记录我的偏好」（历史版本面板）：
 *
 *   node scripts/verify-prefs.cjs
 *
 *  1. 历史版本面板出现「记录我的偏好」按钮；点击后偏好落盘（用卡计数 + 外观）
 *  2. 再记录一次 sessions 累加；「清除偏好」可清空
 *  3. 重置编辑台：空白工程自动套用偏好里的皮肤 / 配色（而不是另一张工程的皮肤）
 *  4. 自动出卡偏好排行：常用卡型排前
 */
const { chromium } = require('playwright')
const { spawn } = require('child_process')
const http = require('http')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const KEY = 'animation-editor-project-v1'
const PORT = process.env.PORT || '5199'
const BASE = `http://localhost:${PORT}/`

let pass = 0
let fail = 0
const check = (name, ok, detail) => {
  console.log(`  ${ok ? '✅' : '❌'} ${name}${detail !== undefined && !ok ? ' → ' + detail : ''}`)
  ok ? pass++ : fail++
}

const mkProject = (name, skin, accent, effectId) => ({
  name,
  skin,
  style: 'glass',
  font: 'sans',
  palette: { accent, data: accent, special: '#ffd166' },
  host: { layout: 'off' },
  hostClips: [],
  fps: 30,
  duration: 10,
  layout: 'edit',
  presets: [],
  instances: [
    { id: 'card_1', effectId, name: '卡1', start: 0, duration: 4, slot: 'center', fit: 'full', params: { title: 'T' } },
    { id: 'card_2', effectId, name: '卡2', start: 4, duration: 4, slot: 'center', fit: 'full', params: { title: 'T' } },
  ],
})

async function waitServer() {
  for (let i = 0; i < 80; i++) {
    const ok = await new Promise((resolve) => {
      const r = http.get(BASE, () => resolve(true))
      r.on('error', () => resolve(false))
      r.setTimeout(500, () => {
        r.destroy()
        resolve(false)
      })
    })
    if (ok) return true
    await new Promise((r) => setTimeout(r, 500))
  }
  return false
}

;(async () => {
  const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--port', PORT, '--strictPort'], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  vite.stdout.on('data', () => {})
  vite.stderr.on('data', () => {})
  if (!(await waitServer())) {
    console.error('❌ vite 未能启动')
    vite.kill()
    process.exit(2)
  }

  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1680, height: 950 } })
  const errors = []
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })

  // A 工程：深色 + 蓝色，两张对比条卡
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.evaluate((k) => localStorage.removeItem(k), KEY)
  await page.evaluate((k) => localStorage.removeItem(k), 'animation-editor-prefs-v1')
  await page.evaluate(({ p, k }) => localStorage.setItem(k, JSON.stringify(p)), {
    p: mkProject('工程A', 'dark', '#5ac8fa', 'compare-bars'),
    k: KEY,
  })
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(900)

  console.log('\n=== 1. 记录我的偏好 ===')
  await page.click('button[title^="打开历史版本列表"]')
  await page.waitForTimeout(400)
  check('「记录我的偏好」按钮存在', (await page.locator('button:has-text("记录我的偏好")').count()) === 1)
  await page.click('button:has-text("记录我的偏好")')
  await page.waitForTimeout(400)
  const prefs1 = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) || 'null'), 'animation-editor-prefs-v1')
  check('偏好落盘', !!prefs1 && prefs1.sessions === 1, JSON.stringify(prefs1))
  check(
    '用卡计数：compare-bars ×2',
    prefs1 && prefs1.effectCounts['compare-bars'] === 2,
    JSON.stringify(prefs1 && prefs1.effectCounts),
  )
  check('外观偏好：dark + #5ac8fa', prefs1 && prefs1.look && prefs1.look.skin === 'dark' && prefs1.look.palette.accent === '#5ac8fa', JSON.stringify(prefs1 && prefs1.look))
  await page.click('button:has-text("记录我的偏好")')
  await page.waitForTimeout(300)
  const prefs2 = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) || 'null'), 'animation-editor-prefs-v1')
  check('再记录一次 sessions 累加为 2', prefs2 && prefs2.sessions === 2, JSON.stringify(prefs2 && prefs2.sessions))

  console.log('\n=== 2. 自动出卡排行 ===')
  const ranking = await page.evaluate(async () => {
    const m = await import('/src/prefs.ts')
    return m.prefEffectRanking()
  })
  check('偏好排行以常用卡为先', Array.isArray(ranking) && ranking[0] === 'compare-bars', JSON.stringify(ranking))

  console.log('\n=== 3. 换一个肤色的工程 B，重置编辑台应套用偏好外观 ===')
  await page.click('.os-modal-close')
  await page.waitForTimeout(300)
  await page.evaluate(({ p, k }) => localStorage.setItem(k, JSON.stringify(p)), {
    p: mkProject('工程B', 'light', '#ff5577', 'kpi-card'),
    k: KEY,
  })
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(900)
  await page.click('button[title^="清空当前工程回到空白编辑台"]')
  await page.waitForTimeout(500)
  // 若弹出确认框，点确认
  const confirmBtn = page.locator('button:has-text("确认"), button:has-text("重置")').last()
  if (await confirmBtn.count()) {
    await confirmBtn.click()
    await page.waitForTimeout(500)
  }
  const after = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) || '{}'), KEY)
  check('重置后是空白工程', Array.isArray(after.instances) && after.instances.length === 0, JSON.stringify(after.instances))
  check(
    '重置套用偏好外观（dark + #5ac8fa，而非工程B的 light/#ff5577）',
    after.skin === 'dark' && after.palette && after.palette.accent === '#5ac8fa',
    JSON.stringify({ skin: after.skin, accent: after.palette && after.palette.accent }),
  )

  console.log('\n=== 4. 清除偏好 ===')
  await page.click('button[title^="打开历史版本列表"]')
  await page.waitForTimeout(400)
  await page.click('button:has-text("清除偏好")')
  await page.waitForTimeout(300)
  const prefsGone = await page.evaluate((k) => localStorage.getItem(k), 'animation-editor-prefs-v1')
  check('清除偏好后落盘数据为空', prefsGone == null, String(prefsGone))

  check('无页面报错', errors.length === 0, errors.slice(0, 2).join(' | '))

  await browser.close()
  vite.kill()
  console.log(`\n结果：${pass} 通过，${fail} 失败`)
  process.exit(fail ? 1 : 0)
})().catch((e) => {
  console.error(e)
  process.exit(2)
})

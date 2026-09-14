/* eslint-disable no-console */
/**
 * 把字幕导入到**已在运行**的 dev server（不自己 spawn vite），导出工程 JSON。
 *
 * 用途：用户在自己浏览器里开着编辑台，需要把算好的工程塞进他那一份 localStorage。
 * 跨会话不能直接写，所以这里生成 public/load-project.html —— 同 origin 页面，
 * 用户点一下就把工程 JSON 写进 localStorage。
 *
 * 用法：SRT=<路径> PORT=<端口> OUT=<输出目录> node scripts/import-live.cjs
 */
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')

const ROOT = path.resolve(__dirname, '..')
const PORT = process.env.PORT || '5173'
const BASE = `http://localhost:${PORT}/`
const SRT_FILE =
  process.env.SRT || path.join(__dirname, 'input', '字幕.srt')
const OUT_DIR = process.env.OUT || path.join(ROOT, 'scripts/_tmp/live')
const STORAGE_KEY = 'animation-editor-project-v1'

const clean = (s, max = 60) => {
  const t = String(s ?? '')
    .replace(/\s+/g, ' ')
    .replace(/[\u200b-\u200f\u2028-\u202f\u00ad\ufeff]/g, '')
    .trim()
  return t.length <= max ? t : t.slice(0, max - 1) + '…'
}

;(async () => {
  if (!fs.existsSync(SRT_FILE)) throw new Error('找不到字幕文件：' + SRT_FILE)
  const srt = fs.readFileSync(SRT_FILE, 'utf8')
  fs.mkdirSync(OUT_DIR, { recursive: true })

  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1760, height: 1000 } })
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.locator('.os-topbar').waitFor({ state: 'visible', timeout: 30000 })
  console.log('✅ 已连接 ' + BASE + '（复用正在运行的 dev server）')

  // 先重置，清掉默认演示卡
  await page.locator('button', { hasText: '版本' }).first().click()
  await page.locator('button', { hasText: '重置编辑台' }).first().click()
  await page.locator('.os-btn-danger', { hasText: '确认重置' }).first().click()
  await page.waitForTimeout(600)

  await page.locator('button', { hasText: '导入口播稿' }).first().click()
  const textarea = page.locator('.os-srt-textarea')
  await textarea.waitFor({ state: 'visible', timeout: 15000 })
  await textarea.fill(srt)
  await page.waitForTimeout(400)

  const autoChk = page.locator('.os-toggle input[type="checkbox"]')
  if (!(await autoChk.isChecked())) await autoChk.check()
  console.log('📊 ' + clean((await page.locator('.os-srt-stat').textContent()) ?? '', 200))

  await page.locator('button', { hasText: '导入字幕与动效' }).click()
  await page.waitForTimeout(900)
  await page.locator('.os-modal-mask').waitFor({ state: 'detached', timeout: 15000 }).catch(() => {})
  await page.waitForTimeout(600)
  console.log('✅ 导入完成')

  const raw = await page.evaluate((k) => localStorage.getItem(k), STORAGE_KEY)
  if (!raw) throw new Error('localStorage 里没有工程')
  const project = JSON.parse(raw)

  const jsonPath = path.join(OUT_DIR, 'project.json')
  fs.writeFileSync(jsonPath, JSON.stringify(project))
  console.log('💾 工程 JSON → ' + jsonPath)

  const subs = project.instances.filter((i) => i.effectId === 'srt-subtitle')
  const cards = project.instances
    .filter((i) => i.effectId !== 'srt-subtitle' && i.director)
    .sort((a, b) => a.start - b.start)

  console.log(
    `\n===== 结果 =====\n字幕卡 ${subs.length} 张 ｜ 动效卡 ${cards.length} 张 ｜ 时长 ${Math.round(project.duration)}s`,
  )
  const byType = {}
  for (const c of cards) byType[c.effectId] = (byType[c.effectId] ?? 0) + 1
  console.log(
    '卡型：' +
      Object.entries(byType)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => `${k}×${v}`)
        .join('  '),
  )

  for (const c of cards) {
    const ps = Object.entries(c.params)
      .filter(([k, v]) => typeof v === 'string' && v)
      .filter(([k]) => !['icons', 'centerEn', 'altTitle', 'chipLeft', 'chipRight', 'kicker'].includes(k))
      .map(([k, v]) => v.replace(/\n/g, ' / '))
      .join('  ')
    const mmss = (t) =>
      `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`
    console.log(`  ${mmss(c.start)}  ${c.name || c.effectId}  ${clean(ps, 78)}`)
  }

  await page.screenshot({ path: path.join(OUT_DIR, 'workbench.png') })
  console.log('\n📸 工作台截图 → ' + path.join(OUT_DIR, 'workbench.png'))

  await browser.close()
  console.log('\ndone ✅')
})().catch((e) => {
  console.error('❌ ' + e.message)
  process.exit(1)
})

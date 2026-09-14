/* eslint-disable no-console */
/**
 * 方案A（优化后的自动匹配）端到端：
 *   1. 自包含拉起 vite dev server（沙箱会杀 `&` 后台进程，必须同进程 spawn）
 *   2. Playwright chromium 打开编辑台 → 先「重置编辑台」清空默认演示卡
 *   3. 点「📝 导入口播稿」→ 粘贴 .srt（保持自动要点卡开启）→「导入字幕与动效」
 *   4. 走真实 addSrtInstance + 优化后的 autoCards 打分选卡
 *   5. 读回 localStorage 工程 JSON，输出清单 + 截图（?render=1 渲染关键卡）
 *
 * 用法：node scripts/load-srt-match-cards.cjs
 */
const { spawn } = require('child_process')
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')

const ROOT = path.resolve(__dirname, '..')
const PORT = process.env.PORT || '5188'
const BASE = `http://localhost:${PORT}/`

const SRT_FILE = process.env.SRT || 'E:/AI/自媒体创作/2026-09-04/字幕.srt'
const OUT_DIR = process.env.OUT || 'E:/AI/自媒体创作/2026-09-04'
const PREFIX = process.env.PREFIX || 'A-自动匹配'
const STORAGE_KEY = 'animation-editor-project-v1'

function clean(s, max = 60) {
  const t = String(s ?? '')
    .replace(/\s+/g, ' ')
    .replace(/[\u200b-\u200f\u2028-\u202f\u00ad\ufeff]/g, '')
    .trim()
  return t.length <= max ? t : t.slice(0, max - 1) + '…'
}

async function waitHttp(url, timeoutMs = 30000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(url)
      if (r.status === 200) return
    } catch {
      /* not ready */
    }
    await new Promise((r) => setTimeout(r, 300))
  }
  throw new Error('vite 未在 ' + timeoutMs + 'ms 内就绪: ' + url)
}

const mmss = (t) =>
  `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`

;(async () => {
  if (!fs.existsSync(SRT_FILE)) throw new Error('找不到字幕文件：' + SRT_FILE)
  const srt = fs.readFileSync(SRT_FILE, 'utf8')
  fs.mkdirSync(OUT_DIR, { recursive: true })

  const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--port', PORT, '--strictPort'], {
    cwd: ROOT,
    shell: false,
  })
  let viteLog = ''
  vite.stdout.on('data', (d) => (viteLog += d.toString()))
  vite.stderr.on('data', (d) => (viteLog += d.toString()))
  try {
    await waitHttp(BASE)
  } catch (e) {
    vite.kill()
    console.error('❌ vite 启动失败：\n' + viteLog)
    throw e
  }
  console.log('✅ vite ready on ' + PORT)

  const browser = await chromium.launch()
  try {
    const page = await browser.newPage({ viewport: { width: 1760, height: 1080 } })
    await page.goto(BASE, { waitUntil: 'domcontentloaded' })
    await page.locator('.os-topbar').waitFor({ state: 'visible', timeout: 30000 })

    // 先重置，清掉默认工程自带的演示卡，保证对比干净
    await page.locator('button', { hasText: '版本' }).first().click()
    await page.locator('button', { hasText: '重置编辑台' }).first().click()
    await page.locator('.os-btn-danger', { hasText: '确认重置' }).first().click()
    await page.waitForTimeout(600)
    const afterReset = await page.evaluate((k) => {
      const raw = localStorage.getItem(k)
      return raw ? JSON.parse(raw).instances.length : -1
    }, STORAGE_KEY)
    console.log('🧹 重置后工程内卡片数 =', afterReset)

    // 打开导入弹窗
    await page.locator('button', { hasText: '导入口播稿' }).first().click()
    const textarea = page.locator('.os-srt-textarea')
    await textarea.waitFor({ state: 'visible', timeout: 15000 })
    await textarea.fill(srt)
    await page.waitForTimeout(400)

    const autoChk = page.locator('.os-toggle input[type="checkbox"]')
    if (!(await autoChk.isChecked())) await autoChk.check()
    const statText = (await page.locator('.os-srt-stat').textContent()) ?? ''
    console.log('📊 ' + clean(statText, 200))

    const previewNames = await page
      .locator('.os-srt-preview-item .os-srt-preview-name')
      .allTextContents()
      .catch(() => [])
    console.log('👀 弹窗预览前 4 张：' + previewNames.map((n) => clean(n, 24)).join(' | '))

    await page.locator('button', { hasText: '导入字幕与动效' }).click()
    await page.waitForTimeout(900)
    await page.locator('.os-modal-mask').waitFor({ state: 'detached', timeout: 15000 }).catch(() => {})
    await page.waitForTimeout(600)
    console.log('✅ 导入完成')

    const raw = await page.evaluate((k) => localStorage.getItem(k), STORAGE_KEY)
    if (!raw) throw new Error('localStorage 里没有工程（key=' + STORAGE_KEY + '）')
    const project = JSON.parse(raw)
    const jsonPath = path.join(OUT_DIR, `${PREFIX}-工程.json`)
    fs.writeFileSync(jsonPath, JSON.stringify(project, null, 2))
    console.log('💾 工程 JSON → ' + jsonPath)

    const subs = project.instances.filter((i) => i.effectId === 'srt-subtitle')
    const cards = project.instances
      .filter((i) => i.effectId !== 'srt-subtitle' && i.director)
      .slice()
      .sort((a, b) => a.start - b.start)
    const others = project.instances.filter((i) => i.effectId !== 'srt-subtitle' && !i.director)
    console.log(`\n===== 结果 =====`)
    console.log(`字幕卡 ${subs.length} 张 ｜ 自动匹配动效卡 ${cards.length} 张 ｜ 非匹配卡 ${others.length} 张 ｜ 时长 ${project.duration}s`)

    const byType = {}
    for (const c of cards) byType[c.effectId] = (byType[c.effectId] ?? 0) + 1
    console.log('卡型：' + Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}×${v}`).join('  '))

    // 工作台截图
    const shotPath = path.join(OUT_DIR, `${PREFIX}-工作台.png`)
    await page.screenshot({ path: shotPath })
    console.log('📸 工作台截图 → ' + shotPath)

    // 选几张代表性卡渲染（开场 / 中段 / 收尾）
    const pick = [0, Math.floor(cards.length / 3), Math.floor((cards.length * 2) / 3), cards.length - 1]
      .filter((v, i, a) => a.indexOf(v) === i && v >= 0 && v < cards.length)
    const rp = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
    await rp.addInitScript((p) => {
      globalThis.__EXPORT_PROJECT = p
      globalThis.__EXPORT_ALPHA = false
    }, project)
    await rp.goto(BASE + '?render=1', { waitUntil: 'domcontentloaded' })
    await rp.waitForFunction(() => {
      const r = globalThis.__render
      return r && r.ready
    }, { timeout: 30000 })
    await rp.evaluate(() => globalThis.document.fonts.ready)
    for (const i of pick) {
      const c = cards[i]
      // 取卡片时长的 60%：列表类卡的子项是依次入场，太早截会拍到半成品
      const t = c.start + c.duration * 0.6
      await rp.evaluate(
        (tt) =>
          new Promise((res) => {
            globalThis.__render.seek(tt)
            requestAnimationFrame(() => requestAnimationFrame(() => res()))
          }),
        t,
      )
      await rp.waitForTimeout(120)
      const file = path.join(OUT_DIR, `${PREFIX}-卡${String(i + 1).padStart(2, '0')}-${c.name.replace(/[\\/:*?"<>|]/g, '')}.png`)
      await rp.locator('.os-canvas').screenshot({ path: file }).catch(() => {})
      console.log('📸 ' + c.name + ' @' + t.toFixed(1) + 's')
    }

    // 清单 markdown
    const md = [
      '# ' + PREFIX + '：字幕 → 动效卡 匹配清单',
      '',
      `- 字幕：\`${SRT_FILE}\``,
      `- 字幕卡 ${subs.length} 张（字幕轨）｜ 自动匹配动效卡 ${cards.length} 张 ｜ 工程时长 ${project.duration}s`,
      `- 打分规则：语义信号门控（未命中不计分）+ 指标数字过滤（型号/日期不算数据）+ 按停顿语义分段`,
      '',
      '| # | 时间段 | 角色 | 匹配动效卡 | 关键参数 | 该段字幕 |',
      '|---|--------|------|-----------|----------|----------|',
    ]
    cards.forEach((c, i) => {
      const role = /开场点题/.test(c.director?.intent ?? '') ? '开场' : /结尾收束/.test(c.director?.intent ?? '') ? '收尾' : '论述'
      const quote = clean(c.director?.sourceQuote ?? '', 80)
      const keys = Object.entries(c.params)
        .filter(([k, v]) => v !== '' && v !== 0 && !/^(activeIndex|duration|size|radius)$/.test(k))
        .slice(0, 3)
        .map(([k, v]) => `${k}=${clean(String(v), 26)}`)
        .join(' | ')
      md.push(`| ${i + 1} | ${mmss(c.start)}–${mmss(c.start + c.duration)} | ${role} | ${c.name} | ${keys} | ${quote} |`)
    })
    const mdPath = path.join(OUT_DIR, `${PREFIX}-匹配清单.md`)
    fs.writeFileSync(mdPath, md.join('\n'))
    console.log('📄 清单 → ' + mdPath)
  } finally {
    try {
      await browser.close()
    } catch {
      /* ignore */
    }
    vite.kill()
  }
  console.log('\ndone ✅')
})().catch((e) => {
  console.error('ERR', e)
  process.exit(1)
})

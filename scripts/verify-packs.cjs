/**
 * 端到端验证「动效卡库 / 音效库两个目录可以徒手增删」这条链路。
 *
 * 用法（dev server 先跑起来）：
 *   npm run dev -- --port 5199              # 另开一个终端，由你自己起
 *   $env:VERIFY_BASE='http://localhost:5199/'   # PowerShell；cmd 用 set
 *   node scripts/verify-packs.cjs
 *
 * 断言：
 *  A. 两个根目录里的包被自动发现：1 个卡包 + 1 个音效包，各 2 张卡 / 2 个音效（无需任何清单文件）
 *  B. 卡进了动效库：data-effect-id 以 pack- 开头的有 2 个
 *  C. 音效进了下拉：某 select 的 options 里出现 crystalTap / softRiser
 *  D. 停用是分包的：停卡包 → 卡归零但音效还在；停音效包 → 音效消失
 *  E. 两个都重新启用 → 全部恢复
 *  F. 跑完还原用户的工程与偏好（localStorage）
 */
const { chromium } = require('playwright')

const BASE = process.env.VERIFY_BASE || 'http://localhost:5199/'
const PROJECT_KEY = 'animation-editor-project-v1'
const DISABLED_KEY = 'animation-editor-packs-disabled-v1'

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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1600, height: 950 } })
  page.on('pageerror', (e) => console.log(`  [pageerror] ${e.message}`))

  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await sleep(1200)
  // 关掉可能挡操作的开场弹窗
  while (await page.locator('.os-modal-mask').first().isVisible().catch(() => false)) {
    await page.keyboard.press('Escape')
    await sleep(300)
    if (await page.locator('.os-modal-mask').first().isVisible().catch(() => false)) {
      await page
        .locator('.os-modal-mask .os-modal-close, .os-modal-mask .os-btn-ghost')
        .first()
        .click()
        .catch(() => {})
      await sleep(300)
      break
    }
  }

  const backup = await page.evaluate(
    ([k, d]) => {
      const v = localStorage.getItem(k)
      localStorage.removeItem(d)
      return v
    },
    [PROJECT_KEY, DISABLED_KEY],
  )
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.os-left-tab', { timeout: 15000 })
  await sleep(1500)

  const switchTab = async (name) => {
    await page.locator('.os-left-tab', { hasText: name }).first().click()
    await sleep(500)
  }
  const packCards = () => page.locator('.os-pack-card')
  const countPackCards = () => page.locator('[data-effect-id^="pack-"]').count()
  const optionValues = () =>
    page.evaluate(() =>
      Array.from(document.querySelectorAll('select')).flatMap((s) =>
        Array.from(s.options).map((o) => o.value),
      ),
    )

  /* ── A. 自动发现 ── */
  section('A. 两个内容目录被自动发现（不需要任何清单文件）')
  await switchTab('拓展包')
  const n = await packCards().count()
  ok('发现 2 个包（1 卡包 + 1 音效包）', n === 2, `实际 ${n}`)
  const titles = await page.locator('.os-pack-group-title').allInnerTexts()
  ok(
    '面板分成卡包 / 音效包两组',
    titles.length === 2 && /动效卡包/.test(titles[0]) && /音效包/.test(titles[1]),
    titles.join(' | '),
  )
  ok(
    '组标题带出了目录名',
    titles.join(' ').includes('动效卡库') && titles.join(' ').includes('音效库'),
    titles.join(' | '),
  )
  const badges = await page.locator('.os-pack-badge').allInnerTexts()
  ok('两个包都是「已启用」', badges.filter((b) => b.trim() === '已启用').length === 2, badges.join(','))
  const counts = (await page.locator('.os-pack-counts').allInnerTexts()).map((s) => s.trim())
  ok('卡包 = 2 张卡', counts.some((c) => c.includes('2 张卡')), counts.join(' | '))
  ok('音效包 = 2 个音效', counts.some((c) => c.includes('2 个音效')), counts.join(' | '))

  /* ── B. 卡进动效库 ── */
  section('B. 卡包里的卡出现在动效库')
  await switchTab('动效库')
  const c1 = await countPackCards()
  ok('有 2 张来自内容目录的卡', c1 === 2, `实际 ${c1}`)

  /* ── C. 音效进下拉 ── */
  section('C. 音效包里的音效出现在音效下拉框')
  await page.locator('.os-lib-search').fill('洞察数值')
  await sleep(300)
  await page.locator('[data-effect-id="pack-insight-value"]').click()
  await sleep(700)
  let opts = await optionValues()
  ok('下拉里出现 crystalTap', opts.includes('crystalTap'))
  ok('下拉里出现 softRiser', opts.includes('softRiser'))

  /* ── D. 分别停用 ── */
  section('D. 停用是分包的：停卡包不影响音效，反之亦然')
  await switchTab('拓展包')
  const cardPk = packCards().filter({ hasText: '张卡' }).first()
  const soundPk = packCards().filter({ hasText: '个音效' }).first()
  await cardPk.locator('.os-pack-toggle input').uncheck()
  await sleep(900)
  await switchTab('动效库')
  const c2 = await countPackCards()
  ok('停卡包 → 动效库里包卡归零', c2 === 0, `实际 ${c2}`)
  opts = await optionValues()
  ok('停卡包 → 音效仍在（互不牵连）', opts.includes('crystalTap'), '音效被误删')

  await switchTab('拓展包')
  await soundPk.locator('.os-pack-toggle input').uncheck()
  await sleep(900)
  opts = await optionValues()
  ok('停音效包 → 音效消失', !opts.includes('crystalTap'))

  /* ── E. 重新启用全部恢复 ── */
  section('E. 重新启用 → 全部恢复')
  await switchTab('拓展包')
  await cardPk.locator('.os-pack-toggle input').check()
  await soundPk.locator('.os-pack-toggle input').check()
  await sleep(1100)
  const badges2 = await page.locator('.os-pack-badge').allInnerTexts()
  ok('两个包都回到「已启用」', badges2.filter((b) => b.trim() === '已启用').length === 2, badges2.join(','))
  await switchTab('动效库')
  const c3 = await countPackCards()
  ok('包卡回到 2 张', c3 === 2, `实际 ${c3}`)
  opts = await optionValues()
  ok('音效回到下拉', opts.includes('crystalTap') && opts.includes('softRiser'))

  /* F. 还原 */
  await page.evaluate(
    ([k, v]) => {
      if (v == null) localStorage.removeItem(k)
      else localStorage.setItem(k, v)
    },
    [PROJECT_KEY, backup],
  )

  await browser.close()
  console.log(`\n${failed === 0 ? '全部通过' : '有失败项'}：通过 ${passed} / 失败 ${failed}`)
  process.exit(failed === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

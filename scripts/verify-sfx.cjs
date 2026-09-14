/**
 * 校验「音效库」与动效卡配合可用（自包含：自己起 vite，跑完自己关）。
 *
 *   npm run verify:sfx
 *
 * 覆盖四块：
 *   A. 参数面板单卡音效区（开关 / 音效下拉跟随分类默认 / 试听 / 自动起音偏移 / 本卡音量）
 *   B. 功能性写入：改音效 / 静音 / 调音量 → 落进 localStorage
 *   C. 顶栏「设置 → 音效」（总开关 / 默认音效 / 总音量）
 *   D. 导出弹窗读数：本次会烤入 N 个动效卡音效
 *
 * 注意（踩过的坑）：
 *   - 画布上的卡只有播放头落在 [start, start+duration] 窗口内才渲染（PreviewCanvas 的 inWindow），
 *     所以注入的测试卡必须 start: 0，否则 .os-inst 会一直等不到而超时。
 *   - 改受控 <input type=range> 必须走原生 value setter + 派发 input 事件，
 *     直接 el.value = x 绕不过 React 的 value 追踪，onChange 不触发。
 */
const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')
const { chromium } = require('playwright')

const PORT = 5217
const ROOT = path.resolve(__dirname, '..')
const OUT = path.join(ROOT, '_screenshots')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function waitFor(url, ms = 60000) {
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

// 一张「数据」类卡：应自动配「数字滚动」(digitRoll)，起音自动对齐 0.08 × 4s = +0.32s
const PROJECT = {
  version: 1,
  meta: { duration: 10, fps: 30, width: 1920, height: 1080 },
  name: '音效校验',
  style: 'glass',
  font: 'sans',
  skin: 'dark',
  layout: 'edit',
  palette: { accent: '', data: '', special: '' },
  cardOpacity: 0.9,
  cardSize: 'md',
  instances: [
    {
      id: 'n1',
      effectId: 'core-number-roller',
      name: '核心数字滚动',
      start: 0,
      duration: 4,
      slot: 'center',
      params: { label: '累计交付', target: 12847, suffix: '+' },
    },
  ],
  imageClips: [],
  subtitles: [],
  mediaAssets: [],
}

;(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  const vite = spawn(
    `"${process.env.NODE_EXE || 'node'}" ./node_modules/vite/bin/vite.js --port ${PORT} --host ::1 --strictPort`,
    { cwd: ROOT, shell: true, stdio: 'ignore' },
  )
  const rep = {}
  const errors = []
  let browser
  try {
    await waitFor(`http://localhost:${PORT}/`)
    browser = await chromium.launch()
    const page = await browser.newPage({ viewport: { width: 1680, height: 950 } })
    page.on('pageerror', (e) => errors.push('PAGEERROR ' + String(e)))
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push('CONSOLE ' + m.text())
    })

    await page.goto(`http://localhost:${PORT}/`)
    await page.waitForSelector('.os-lib-item', { timeout: 30000 })
    await page.evaluate((p) => localStorage.setItem('animation-editor-project-v1', JSON.stringify(p)), PROJECT)
    await page.reload()
    await page.waitForSelector('.os-inst', { timeout: 30000 })
    await sleep(400)

    await page.locator('.os-inst').first().click()
    await sleep(500)

    // ───── A. 参数面板音效区 ─────
    const divider = page.locator('.os-param-divider', { hasText: '音效' }).first()
    rep.divider = (await divider.count()) > 0
    if (rep.divider) rep.dividerText = (await divider.innerText()).replace(/\s+/g, ' ').trim()

    // 唯一含 value="none" 选项的下拉就是音效下拉（SFX_OPTIONS 独有）
    const sfxSelectIdx = await page.$$eval('select', (sels) =>
      sels.findIndex((s) => [...s.options].some((o) => o.value === 'none')),
    )
    rep.selectFound = sfxSelectIdx >= 0
    if (rep.selectFound) {
      rep.selectInfo = await page.$$eval(
        'select',
        (sels, i) => {
          const s = sels[i]
          return {
            value: s.value,
            currentText: s.options[s.selectedIndex] ? s.options[s.selectedIndex].text : '',
            count: s.options.length,
          }
        },
        sfxSelectIdx,
      )
    }
    rep.audition = (await page.locator('button[title^="立刻听一下这个音效"]').count()) > 0
    rep.cardVolume = (await page.locator('[data-sfx="volume"]').count()) > 0

    const offInput = page.locator('input[placeholder^="自动"]').first()
    rep.offsetAuto = (await offInput.count()) > 0
    if (rep.offsetAuto) rep.offsetPlaceholder = await offInput.getAttribute('placeholder')

    rep.note = (
      (await page
        .locator('[data-sfx="volume"] + .os-param-note-block')
        .first()
        .innerText()
        .catch(() => '')) || ''
    )
      .replace(/\s+/g, ' ')
      .trim()

    await page.screenshot({ path: path.join(OUT, 'sfx-param-panel.png') })

    // ───── B. 功能性：改音效 / 静音 / 调音量 → 落盘 ─────
    const readInst = (field) =>
      page.evaluate(
        (f) => JSON.parse(localStorage.getItem('animation-editor-project-v1') || '{}').instances?.[0]?.[f],
        field,
      )

    if (rep.selectFound) {
      await page.$$eval(
        'select',
        (sels, i) => {
          const s = sels[i]
          s.value = 'signalPing'
          s.dispatchEvent(new Event('change', { bubbles: true }))
        },
        sfxSelectIdx,
      )
      await sleep(300)
      rep.persistSfxId = await readInst('sfxId')
    }

    const btnOff = page.locator('button[title="单独把这张卡静音（不影响其他卡）"]').first()
    if (await btnOff.count()) {
      await btnOff.click()
      await sleep(300)
      rep.persistSfxOn = await readInst('sfxOn')
    }
    const btnOn = page.locator('button[title="这张卡跟随工程默认发音效"]').first()
    if (await btnOn.count()) {
      await btnOn.click()
      await sleep(200)
    }

    const vol = page.locator('[data-sfx="volume"] input[type="range"]').first()
    if (await vol.count()) {
      await vol.evaluate((el) => {
        // 绕过 React 的值追踪：走原生 setter 再派发 input
        const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value').set
        setter.call(el, '0.5')
        el.dispatchEvent(new Event('input', { bubbles: true }))
      })
      await sleep(300)
      rep.persistSfxVolume = await readInst('sfxVolume')
    }

    // ───── C. 顶栏 设置 → 音效 ─────
    await page.locator('button.os-dd-btn', { hasText: '设置' }).first().click()
    await sleep(400)
    rep.topTitle = (await page.locator('.os-dd-title', { hasText: '音效' }).count()) > 0
    rep.topDefault = (await page.locator('.os-dd-label', { hasText: '默认音效' }).count()) > 0
    rep.topVolume = (await page.locator('.os-dd-row', { hasText: '总音量' }).count()) > 0
    rep.topAudition = (await page.locator('button[title="试听默认音效"]').count()) > 0
    await page.screenshot({ path: path.join(OUT, 'sfx-topbar.png') })
    await page.keyboard.press('Escape')
    await sleep(200)

    // ───── D. 导出弹窗：音效烤入读数 ─────
    await page.locator('button.os-btn', { hasText: '导出' }).first().click()
    await sleep(700)
    rep.exportNote = (
      (await page
        .locator('.os-param-note-line', { hasText: '音效' })
        .first()
        .innerText()
        .catch(() => '')) || ''
    )
      .replace(/\s+/g, ' ')
      .trim()
    await page.screenshot({ path: path.join(OUT, 'sfx-export.png') })
  } finally {
    if (browser) await browser.close().catch(() => {})
    vite.kill()
  }

  const ok = (b) => (b ? '✅' : '❌')
  let fail = 0
  const chk = (cond, label, extra = '') => {
    if (!cond) fail += 1
    console.log(` ${ok(cond)} ${label}${extra ? ' → ' + extra : ''}`)
  }

  console.log('=== A. 参数面板（单卡音效区）===')
  chk(rep.divider, '音效分区', rep.dividerText)
  chk(rep.selectFound, '音效下拉', `当前值=${JSON.stringify(rep.selectInfo?.value)} 选中项=${rep.selectInfo?.currentText} 选项数=${rep.selectInfo?.count}`)
  chk(rep.audition, '试听按钮')
  chk(rep.offsetAuto, '触发偏移自动占位', rep.offsetPlaceholder)
  chk(rep.cardVolume, '本卡音量滑杆')
  console.log('   提示文案:', rep.note)
  console.log('=== B. 功能性落盘 ===')
  chk(rep.persistSfxId === 'signalPing', '改音效', `inst.sfxId=${rep.persistSfxId}`)
  chk(rep.persistSfxOn === false, '本卡静音', `inst.sfxOn=${rep.persistSfxOn}`)
  chk(rep.persistSfxVolume === 0.5, '本卡音量', `inst.sfxVolume=${rep.persistSfxVolume}`)
  console.log('=== C. 顶栏 设置 → 音效 ===')
  chk(rep.topTitle, '音效分组')
  chk(rep.topDefault, '默认音效下拉')
  chk(rep.topVolume, '总音量')
  chk(rep.topAudition, '默认音效试听')
  console.log('=== D. 导出弹窗 ===')
  chk(/烤入/.test(rep.exportNote), '音效读数', rep.exportNote)
  console.log('页面错误:', errors.length ? errors : '无')
  console.log(fail === 0 && errors.length === 0 ? '\n结果：全部通过 ✅' : `\n结果：${fail} 项未通过 ❌`)
  process.exit(fail === 0 && errors.length === 0 ? 0 : 1)
})().catch((e) => {
  console.error(e)
  process.exit(1)
})

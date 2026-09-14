/**
 * 诊断「音效切换 / 时长滑竿 / 自动按钮」在真实 UI 上的表现：
 *   node scripts/debug-sfx-panel.cjs
 */
const { chromium } = require('playwright')
const { spawn } = require('child_process')
const http = require('http')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const KEY = 'animation-editor-project-v1'
const PORT = process.env.PORT || '5196'
const BASE = `http://localhost:${PORT}/`

const project = {
  name: 'sfx-panel-debug',
  skin: 'dark',
  style: 'glass',
  font: 'sans',
  palette: { accent: '#5ac8fa', data: '#5ac8fa', special: '#ffd166' },
  host: { layout: 'off' },
  hostClips: [],
  fps: 30,
  duration: 10,
  layout: 'edit',
  presets: [],
  instances: [
    {
      id: 'card_1',
      effectId: 'core-number-roller',
      name: '数字滚动卡',
      start: 0,
      duration: 6,
      slot: 'center',
      fit: 'full',
      params: { title: '88.6', unit: '%' },
    },
  ],
}

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
    console.error('vite failed')
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
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.evaluate((k) => localStorage.removeItem(k), KEY)
  await page.evaluate(({ p, k }) => localStorage.setItem(k, JSON.stringify(p)), { p: project, k: KEY })
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)

  const readProject = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || '{}'), KEY)
  const snap = async (label) => {
    const proj = await readProject()
    const inst = proj.instances[0]
    const slider = await page.locator('label:has-text("音效时长") input[type="range"]').evaluate((el) => el.value)
    const valueText = await page.locator('label:has-text("音效时长") .os-range-value').textContent()
    const selected = await page.locator('label:has-text("音效") select').first().evaluate((el) => el.selectedOptions[0]?.textContent)
    console.log(`[${label}] 下拉选中="${selected}" 滑竿值=${slider} 显示="${valueText}" sfxDuration=${JSON.stringify(inst.sfxDuration)} sfxId=${JSON.stringify(inst.sfxId)}`)
  }

  await page.click('.os-tracks .os-clip')
  await page.waitForTimeout(500)
  await snap('初始（数据卡，分类默认=数字滚动）')

  console.log('\n--- 换音效：下拉选「确认回执」')
  await page.selectOption('label:has-text("音效") select >> nth=0', { label: '确认回执' })
  await page.waitForTimeout(400)
  await snap('换音效后（滑竿应移到 0.8s）')

  console.log('\n--- 拖滑竿到 4s')
  await page.locator('label:has-text("音效时长") input[type="range"]').evaluate((el) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
    setter.call(el, '4')
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await page.waitForTimeout(400)
  await snap('拖到 4s 后')

  console.log('\n--- 点「自动」')
  await page.click('label:has-text("音效时长") button:has-text("自动")')
  await page.waitForTimeout(400)
  await snap('点自动后（应回 0.8s，字段清空）')

  console.log('\n--- 试听：换不同音效各点一次 🔊，看预览总线上的发声节点数')
  const auditionProbe = await page.evaluate(async () => {
    const m = await import('/src/sfx.ts')
    const btn = document.querySelector('button[title^="立刻听一下这个音效"]')
    const out = {}
    for (const name of ['数字滚动', '确认回执', '科技点击']) {
      const sel = document.querySelector('label.os-field select') // 音效下拉
      const opt = [...sel.querySelectorAll('option')].find((o) => o.textContent === name)
      const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set
      setter.call(sel, opt.value)
      sel.dispatchEvent(new Event('change', { bubbles: true }))
      await new Promise((r) => setTimeout(r, 200))
      m.pauseSfx()
      btn.click()
      await new Promise((r) => setTimeout(r, 250))
      out[name] = { voices: m.liveSfxVoiceCount() }
      m.pauseSfx()
    }
    return out
  })
  console.log(JSON.stringify(auditionProbe, null, 2))

  console.log('\n--- 从卡中间（t=2.5s）按播放：持续音效应按剩余时长补响')
  await page.evaluate((time) => {
    const ticks = [...document.querySelectorAll('.os-tick')]
    const k = Math.max(0, Math.min(ticks.length - 2, Math.floor(time)))
    const a = ticks[k].getBoundingClientRect()
    const b = ticks[k + 1]?.getBoundingClientRect()
    const cx = a.left + a.width / 2
    const pps = b ? b.left + b.width / 2 - cx : 36
    document
      .querySelector('.os-ruler')
      .dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: cx + (time - k) * pps, clientY: a.top + 5 }))
  }, 2.5)
  await page.waitForTimeout(300)
  await page.click('button:has-text("播放")')
  await page.waitForTimeout(500)
  const midPlayVoices = await page.evaluate(async () => {
    const m = await import('/src/sfx.ts')
    return m.liveSfxVoiceCount()
  })
  console.log(`[起播 500ms 后] 预览总线发声节点数 = ${midPlayVoices}（>10 = 数字滚动按剩余时长补响了）`)
  await page.click('button:has-text("暂停")')
  await page.waitForTimeout(300)
  const afterPause = await page.evaluate(async () => {
    const m = await import('/src/sfx.ts')
    return m.liveSfxVoiceCount()
  })
  console.log(`[暂停后] 发声节点数 = ${afterPause}（0 = 暂停即停）`)

  console.log('报错:', errors.length ? errors.slice(0, 3).join(' | ') : '无')
  await browser.close()
  vite.kill()
  process.exit(0)
})().catch((e) => {
  console.error(e)
  process.exit(2)
})

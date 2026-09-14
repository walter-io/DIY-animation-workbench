const { chromium } = require('playwright')
const { spawn } = require('child_process')
const http = require('http')
const path = require('path')
const fs = require('fs')
const ROOT = path.join(__dirname, '..')
const KEY = 'animation-editor-project-v1'
const PORT = 5204
const BASE = `http://localhost:${PORT}/`
async function waitServer() {
  for (let i = 0; i < 80; i++) {
    const ok = await new Promise((resolve) => {
      const r = http.get(BASE, () => resolve(true)); r.on('error', () => resolve(false)); r.setTimeout(500, () => { r.destroy(); resolve(false) })
    }); if (ok) return true; await new Promise((r) => setTimeout(r, 500))
  } return false
}
;(async () => {
  const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--port', PORT, '--strictPort'], { cwd: ROOT, stdio: ['ignore','pipe','pipe'] })
  vite.stdout.on('data', () => {}); vite.stderr.on('data', () => {})
  if (!(await waitServer())) { vite.kill(); process.exit(2) }
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1680, height: 950 } })
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.evaluate((k) => localStorage.removeItem(k), KEY)
  await page.evaluate(({ p, k }) => localStorage.setItem(k, JSON.stringify(p)), {
    p: {
      name: 'fit-shot', skin: 'dark', style: 'glass', font: 'sans',
      palette: { accent: '#5ac8fa', data: '#5ac8fa', special: '#ffd166' },
      host: { layout: 'off' }, hostClips: [], fps: 30, duration: 10, layout: 'edit', presets: [],
      instances: [
        { id: 'card_1', effectId: 'replica-numbered-list', name: '编号清单', start: 0, duration: 8, slot: 'center', fit: 'auto', params: { title: '只看三件事', items: '第一件事\n第二件事\n第三件事' } },
      ],
    }, k: KEY,
  })
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
  await page.click('.os-tracks .os-clip')
  await page.waitForTimeout(400)
  fs.mkdirSync('/tmp/fit-shots', { recursive: true })
  const shots = [['内容自适应', 'auto'], ['铺满画布', 'full'], ['左侧半屏', 'leftHalf'], ['右侧半屏', 'rightHalf']]
  for (const [name, file] of shots) {
    await page.click(`.os-seg-fit button:has-text("${name}")`)
    await page.waitForTimeout(600)
    const canvas = await page.locator('.os-canvas-wrapper').boundingBox()
    await page.screenshot({ path: `/tmp/fit-shots/${file}.png`, clip: canvas })
    console.log('shot:', file)
  }
  await browser.close(); vite.kill(); process.exit(0)
})().catch((e) => { console.error(e); process.exit(1) })

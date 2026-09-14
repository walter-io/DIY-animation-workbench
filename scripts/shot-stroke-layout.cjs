const { chromium } = require('playwright')
const { spawn } = require('child_process')
const { execFileSync } = require('child_process')
const http = require('http')
const path = require('path')
const fs = require('fs')

const ROOT = path.join(__dirname, '..')
const KEY = 'animation-editor-project-v1'
const VERSIONS_KEY = 'animation-editor-versions-v1'
const DB_NAME = 'animation-editor-media'
const PORT = process.env.PORT || '5193'
const BASE = `http://localhost:${PORT}/`
const IMG = path.join(__dirname, '_tmp', 'kf-test.png')
const FALLBACK = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
if (!fs.existsSync(IMG)) {
  fs.mkdirSync(path.dirname(IMG), { recursive: true })
  try { execFileSync('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'color=c=0xff6f7c:s=320x180', '-frames:v', '1', '-loglevel', 'error', IMG]) } catch { fs.writeFileSync(IMG, FALLBACK) }
}
function waitServer() {
  return new Promise(async (resolve) => {
    for (let i = 0; i < 80; i++) {
      const ok = await new Promise((r) => { const q = http.get(BASE, () => r(true)); q.on('error', () => r(false)); q.setTimeout(500, () => { q.destroy(); r(false) }) })
      if (ok) return resolve(true)
      await new Promise((r) => setTimeout(r, 500))
    }
    resolve(false)
  })
}
;(async () => {
  const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--port', PORT, '--strictPort'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] })
  if (!await waitServer()) { console.error('vite fail'); vite.kill(); process.exit(2) }
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1680, height: 950 } })
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.waitForTimeout(700)
  await page.evaluate((k) => localStorage.removeItem(k), KEY)
  await page.evaluate((k) => localStorage.removeItem(k), VERSIONS_KEY)
  await page.evaluate((db) => new Promise((res) => { const r = indexedDB.deleteDatabase(db); r.onsuccess = r.onerror = r.onblocked = () => res() }), DB_NAME)
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await page.click('.os-left-tab:has-text("素材库")')
  await page.waitForTimeout(300)
  await page.setInputFiles('.os-panel-left input[type="file"]', IMG)
  await page.waitForTimeout(1200)
  await page.click('.os-media-act.add')
  await page.waitForTimeout(500)
  await page.click('.os-img-clip')
  await page.waitForTimeout(400)
  const panel = await page.$('.os-panel-right')
  const shot = path.join(__dirname, '_tmp', 'stroke-layout.png')
  await panel.screenshot({ path: shot })
  console.log('saved', shot)
  await browser.close()
  vite.kill()
  process.exit(0)
})().catch((e) => { console.error(e); process.exit(3) })

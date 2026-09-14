const path = require('path')
const { chromium } = require('playwright')
;(async () => {
  const root = path.resolve(__dirname, '..')
  const port = 5188
  const { spawn } = require('child_process')
  const srv = spawn('npx', ['vite', '--port', String(port), '--strictPort'], { cwd: root, stdio: 'ignore', shell: true })
  const wait = (ms) => new Promise((r) => setTimeout(r, ms))
  for (let i = 0; i < 40; i++) {
    try { const res = await fetch(`http://localhost:${port}/`); if (res.ok) break } catch {}
    await wait(500)
  }
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle' })
  await wait(800)
  const tb = await page.$('.os-topbar')
  await tb.screenshot({ path: path.join(root, 'scripts/_tmp/topbar-novideo.png') })
  const hasImport = await page.$$eval('.os-topbar-right button', (bs) => bs.map((b) => b.textContent).join(' | '))
  console.log('TOPBAR BTNS:', hasImport)
  await browser.close()
  srv.kill('SIGTERM')
})()

/** 验证：轨道里有素材时，导出面板默认不勾选「透明背景」（否则素材整段丢失） */
const path = require('path')
const { chromium } = require('playwright')
const { spawn } = require('child_process')

const SRC = path.join(__dirname, '_tmp', 'export-media-red.mp4')
const PORT = 5195
;(async () => {
  const root = path.resolve(__dirname, '..')
  const srv = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
    cwd: root, stdio: 'ignore', shell: true,
  })
  const wait = (ms) => new Promise((r) => setTimeout(r, ms))
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(`http://localhost:${PORT}/`); if (r.ok) break } catch {}
    await wait(500)
  }
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1500, height: 950 } })
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' })
  await wait(1200)

  // 切素材库 → 上传 → 加到轨道
  for (const t of await page.$$('button')) {
    if (((await t.textContent()) || '').trim() === '素材库') { await t.click(); break }
  }
  await wait(500)
  const input = await page.$('.os-panel-left input[type=file]')
  if (input) await input.setInputFiles(SRC)
  await wait(2500)
  const add = await page.$('.os-media-act.add')
  if (add) await add.click()
  await wait(800)

  // 打开导出面板
  for (const b of await page.$$('button')) {
    if (((await b.textContent()) || '').trim() === '导出') { await b.click(); break }
  }
  await wait(900)

  const chk = await page.$('.os-toggle input[type=checkbox]')
  const checked = chk ? await chk.isChecked() : null
  const text = await page.$eval('.os-export-form', (el) => el.innerText.replace(/\s+/g, ' '))
  const clips = await page.evaluate(() => {
    try {
      const p = JSON.parse(localStorage.getItem('animation-editor-project-v1') || '{}')
      return (p.imageClips || []).length
    } catch { return -1 }
  })

  console.log('轨道素材片段数:', clips)
  console.log('透明背景默认勾选:', checked)
  console.log('面板含提示「包含轨道上的」:', /包含轨道上的/.test(text))
  console.log('\n===== 断言 =====')
  console.log(clips > 0 ? '✅' : '❌', '轨道上有素材片段')
  console.log(checked === false ? '✅' : '❌', '有素材时默认不勾选透明（素材不会被丢掉）')
  console.log(/包含轨道上的/.test(text) ? '✅' : '❌', '面板提示本次会包含素材')

  await page.screenshot({ path: path.join(root, 'scripts/_tmp/export-default-nocheck.png') })
  await browser.close()
  srv.kill('SIGTERM')
})()

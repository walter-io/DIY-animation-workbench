/**
 * 验证前端链路：素材库导入视频 → 加到轨道 → 点导出时，请求体里真的带了素材像素(media)。
 * 用 fetch 拦截，只截请求不真跑渲染，秒级完成。
 */
const path = require('path')
const { chromium } = require('playwright')
const { spawn } = require('child_process')

const SRC = path.join(__dirname, '_tmp', 'export-media-red.mp4')
const PORT = 5193
;(async () => {
  const root = path.resolve(__dirname, '..')
  const srv = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
    cwd: root,
    stdio: 'ignore',
    shell: true,
  })
  const wait = (ms) => new Promise((r) => setTimeout(r, ms))
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://localhost:${PORT}/`)
      if (res.ok) break
    } catch {}
    await wait(500)
  }

  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1500, height: 950 } })
  page.on('pageerror', (e) => console.log('PAGEERROR:', e.message))
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' })
  await wait(1200)

  // 切到「素材库」标签
  const tabs = await page.$$('.os-panel-left button, .os-lib-tabs button, button')
  for (const t of tabs) {
    const txt = (await t.textContent()) || ''
    if (txt.trim() === '素材库') {
      await t.click()
      break
    }
  }
  await wait(600)

  // 上传素材
  const input = await page.$('.os-panel-left input[type=file]')
  if (!input) {
    console.log('❌ 找不到素材库上传入口')
    await browser.close()
    srv.kill('SIGTERM')
    return
  }
  await input.setInputFiles(SRC)
  await wait(2500)
  const itemCount = await page.$$eval('.os-media-item', (a) => a.length)
  console.log('素材库条目:', itemCount)
  if (itemCount === 0) {
    console.log('❌ 素材没进库')
    await browser.close()
    srv.kill('SIGTERM')
    return
  }

  // 加到轨道
  const addBtn = await page.$('.os-media-act.add')
  if (addBtn) await addBtn.click()
  await wait(900)
  const clipCount = await page.evaluate(() => {
    try {
      const p = JSON.parse(localStorage.getItem('animation-editor-project-v1') || '{}')
      return { clips: (p.imageClips || []).length, assets: (p.mediaAssets || []).length }
    } catch {
      return { clips: -1, assets: -1 }
    }
  })
  console.log('轨道片段/素材:', JSON.stringify(clipCount))

  // 打开导出面板
  const btns = await page.$$('button')
  for (const b of btns) {
    if (((await b.textContent()) || '').trim() === '导出') {
      await b.click()
      break
    }
  }
  await wait(800)

  // 取消「透明背景」（默认勾选，且透明导出按设计不含素材画面）
  const chk = await page.$('.os-toggle input[type=checkbox]')
  if (chk) {
    const checked = await chk.isChecked()
    if (checked) await chk.uncheck()
  }
  await wait(300)

  // 拦截导出请求，只看请求体不真渲染
  await page.evaluate(() => {
    window.__captured = null
    const orig = window.fetch
    window.fetch = async (...args) => {
      const url = String(args[0] ?? '')
      const opts = args[1]
      if (url.includes('/api/export')) {
        window.__captured = opts && opts.body ? String(opts.body) : null
        return new Response('fake', { status: 200, headers: { 'X-Animation-Verify': 'ok' } })
      }
      return orig(...args)
    }
  })

  // 点「开始导出」
  const startBtns = await page.$$('button')
  for (const b of startBtns) {
    if (((await b.textContent()) || '').trim() === '开始导出') {
      await b.click()
      break
    }
  }

  for (let i = 0; i < 60; i++) {
    const cap = await page.evaluate(() => window.__captured)
    if (cap) break
    await wait(500)
  }

  const cap = await page.evaluate(() => window.__captured)
  console.log('\n===== 断言 =====')
  if (!cap) {
    console.log('❌ 没截到导出请求')
  } else {
    const body = JSON.parse(cap)
    const media = body.media || []
    console.log('请求体 media 条数:', media.length)
    if (media.length) {
      console.log('  id =', media[0].id, ' ext =', media[0].ext, ' base64 长度 =', media[0].base64.length)
    }
    console.log('  工程 imageClips =', (body.project.imageClips || []).length)
    console.log('  transparent =', body.transparent)
    console.log(media.length === 1 ? '✅' : '❌', 'media 条数 = 1')
    console.log(media[0] && media[0].base64.length > 1000 ? '✅' : '❌', '素材像素已带上(base64 > 1000)')
    console.log(body.transparent === false ? '✅' : '❌', '非透明导出(素材才会进画面)')
  }

  await page.screenshot({ path: path.join(root, 'scripts/_tmp/export-modal-media.png') })
  await browser.close()
  srv.kill('SIGTERM')
})()

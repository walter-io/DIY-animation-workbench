// 同时拍"视频片段"和"动效卡"的参数面板，证明两边的内联布局风格一致。
// 视频那边：先 import 一张图 → 拖进轨道 → 选中 → 进参数面板
// 卡片那边：选一个动效卡，进参数面板
const path = require('path')
const { spawn } = require('child_process')
const fs = require('fs')
const http = require('http')
const { chromium } = require('playwright')

const PORT = 5195
const PROJECT_ROOT = path.resolve(__dirname, '..')
const TMP = path.join(__dirname, '_tmp')
fs.mkdirSync(TMP, { recursive: true })
const BASE = `http://localhost:${PORT}`

let png = null
async function makeFfmpegPng() {
  const out = path.join(TMP, 'kf-test.png')
  if (fs.existsSync(out)) {
    png = out
    return
  }
  await new Promise((resolve, reject) => {
    const args = [
      '-y', '-loglevel', 'error',
      '-f', 'lavfi', '-i', 'color=c=red:s=320x180',
      '-frames:v', '1', out,
    ]
    const ch = spawn('ffmpeg', args, { stdio: 'inherit' })
    ch.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exit ${code}`))))
  })
  png = out
}

;(async () => {
  await makeFfmpegPng()

// 启动 vite（sandbox 杀 &，要 spawn 自己跑；用 node 跑 vite.js 避免 npx ENOENT）
const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--port', String(PORT), '--host', '::1', '--strictPort'], {
  cwd: PROJECT_ROOT,
  stdio: ['ignore', 'pipe', 'pipe'],
})
let viteLog = ''
vite.stdout.on('data', (d) => (viteLog += d.toString()))
vite.stderr.on('data', (d) => (viteLog += d.toString()))
const waitServer = async () => {
  for (let i = 0; i < 80; i++) {
    const ok = await new Promise((resolve) => {
      const r = http.get(BASE, () => resolve(true))
      r.on('error', () => resolve(false))
      r.setTimeout(500, () => { r.destroy(); resolve(false) })
    })
    if (ok) return true
    await new Promise((r) => setTimeout(r, 500))
  }
  return false
}
const ready = await waitServer()
if (!ready) {
  console.error('vite 启动失败\n' + viteLog)
  vite.kill()
  process.exit(2)
}
console.log(`vite ready on ${PORT}`)

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  page.on('pageerror', (e) => console.error('[pageerror]', e.message))
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.error('[console.error]', msg.text())
  })

  // 清空 localStorage，强制一个新工程
  await page.addInitScript(() => {
    try {
      localStorage.removeItem('animation-editor-project-v1')
      localStorage.removeItem('animation-editor-versions-v1')
    } catch {}
  })

  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await page.waitForSelector('.os-app', { timeout: 15000 })

  // ===== 视频片段侧：导入图片并拖到轨道 =====
  // 先确保切到素材库 tab（页面默认是动效库）
  await page.waitForSelector('.os-left', { timeout: 5000 })
  await page.evaluate(() => {
    const tabs = [...document.querySelectorAll('.os-left-tab')]
    const mediaTab = tabs.find((t) => /素材库/.test(t.textContent))
    if (mediaTab && !/active/.test(mediaTab.className)) {
      mediaTab.click()
    }
  })
  await page.waitForTimeout(300)

  const fileInput = await page.$('input[type="file"][accept*="image"]')
  if (!fileInput) throw new Error('找不到图片上传 input')
  await fileInput.setInputFiles(png)
  await page.waitForTimeout(800)
  // 素材库有一个"+ 直接添加到轨道"按钮（比拖拽稳）
  const addBtn = await page.$('.os-media-act.add')
  if (!addBtn) throw new Error('找不到 ".os-media-act.add"')
  await addBtn.click()
  await page.waitForTimeout(400)
  console.log('已把图片片段添加到轨道')

  // 选中图片片段
  const imgClipEl = await page.$('.os-img-clip')
  if (imgClipEl) {
    await imgClipEl.click()
    await page.waitForTimeout(300)
  }

  // ===== 卡片侧：先切回动效库，再点第一个动效 =====
  await page.evaluate(() => {
    const tabs = [...document.querySelectorAll('.os-left-tab')]
    const fxTab = tabs.find((t) => /动效库/.test(t.textContent))
    if (fxTab && !/active/.test(fxTab.className)) fxTab.click()
  })
  await page.waitForTimeout(300)
  await page.waitForSelector('.os-lib-item', { timeout: 8000 })

  const libItem = await page.$('.os-lib-item')
  if (libItem) {
    await libItem.click()
    await page.waitForTimeout(300)
    console.log('已添加动效卡')

    // 选中画布中的卡（默认就被选中过，这里保险再选一次）
    await page.waitForTimeout(200)
  }

  // ===== 拍视频侧参数面板（先） =====
  // 切到素材库并选中图片片段
  await page.evaluate(() => {
    const tabs = [...document.querySelectorAll('.os-left-tab')]
    const mediaTab = tabs.find((t) => /素材库/.test(t.textContent))
    if (mediaTab) mediaTab.click()
  })
  await page.waitForTimeout(300)
  const imgClip = await page.$('.os-img-clip')
  if (imgClip) {
    await imgClip.click()
    await page.waitForTimeout(300)
  }

  // 隐藏 .os-canvas 让截图更紧凑
  await page.evaluate(() => {
    const c = document.querySelector('.os-canvas')
    if (c) c.style.display = 'none'
  })
  await page.waitForTimeout(150)

  const panelVideo = await page.$('.os-panel-right')
  if (!panelVideo) throw new Error('视频侧参数面板未渲染')
  await panelVideo.screenshot({ path: path.join(TMP, 'card-vs-video-1.png') })
  console.log('saved card-vs-video-1.png (视频侧)')

  // ===== 再切换到卡片编辑器 =====
  await page.evaluate(() => {
    const c = document.querySelector('.os-canvas')
    if (c) c.style.display = ''
  })
  await page.waitForTimeout(150)

  // 直接点画布上的卡（如果存在）
  const cardEl = await page.$('.os-canvas .os-card')
  if (cardEl) {
    await cardEl.click()
    await page.waitForTimeout(300)
  } else {
    console.warn('画布上找不到 .os-card')
  }

  await page.evaluate(() => {
    const c = document.querySelector('.os-canvas')
    if (c) c.style.display = 'none'
  })
  await page.waitForTimeout(150)

  const panelCard = await page.$('.os-panel-right')
  if (panelCard) {
    await panelCard.screenshot({ path: path.join(TMP, 'card-vs-video-2.png') })
    console.log('saved card-vs-video-2.png (卡片侧)')
  }

  await browser.close()
  vite.kill()
  console.log('DONE', path.join(TMP, 'card-vs-video-1.png'), path.join(TMP, 'card-vs-video-2.png'))
})().catch((e) => {
  console.error('FAIL', e)
  process.exit(1)
})

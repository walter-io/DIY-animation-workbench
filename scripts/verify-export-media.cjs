/**
 * 验证：轨道里的素材片段（导入的视频）会被导出进结果。
 * 做法：构造一个「只有素材片段、没有动效卡」的工程，素材用纯红视频铺满画布，
 *       导出后抽帧看画面是不是红色 —— 红色 = 素材真的渲染进去了。
 */
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execFileSync } = require('child_process')
const { chromium } = require('playwright')
const { spawn } = require('child_process')

const SRC = path.join(__dirname, '_tmp', 'export-media-red.mp4')
const PORT = 5192
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

  // 1) 从真实编辑器里取一份字段完整的工程做底子
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } })
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' })
  await wait(1500)
  const base = await page.evaluate(() => {
    try {
      return JSON.parse(localStorage.getItem('animation-editor-project-v1') || 'null')
    } catch {
      return null
    }
  })
  await browser.close()
  if (!base) {
    console.log('❌ 取不到工程基线')
    srv.kill('SIGTERM')
    return
  }

  // 2) 构造：清空动效卡，只放一个铺满画布的素材片段
  const project = {
    ...base,
    duration: 3,
    instances: [],
    mediaAssets: [
      { id: 'm1', kind: 'video', name: 'red.mp4', url: '', duration: 3, width: 320, height: 180 },
    ],
    imageClips: [
      {
        id: 'c1',
        assetId: 'm1',
        start: 0,
        duration: 3,
        x: 0,
        y: 0,
        w: 1920,
        h: 1080,
        opacity: 1,
        radius: 0,
        track: 1,
        focalX: 50,
        focalY: 50,
        zoom: 1,
        borderWidth: 0,
        borderColor: '#000000',
      },
    ],
  }
  const media = [
    { id: 'm1', base64: fs.readFileSync(SRC).toString('base64'), ext: 'mp4' },
  ]

  console.log('POST /api/export ...')
  const res = await fetch(`http://localhost:${PORT}/api/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project, fps: 10, format: 'mp4', transparent: false, media }),
  })
  if (!res.ok) {
    const t = await res.text()
    console.log('❌ 导出失败 HTTP', res.status, t.slice(0, 300))
    srv.kill('SIGTERM')
    return
  }
  const buf = Buffer.from(await res.arrayBuffer())
  const out = path.join(__dirname, '_tmp', 'export-with-media.mp4')
  fs.writeFileSync(out, buf)
  console.log('导出完成:', out, buf.length, 'bytes')
  console.log('验收头:', decodeURIComponent(res.headers.get('X-Animation-Verify') || '(无)'))

  // 3) 抽中间帧，缩到 1x1 读平均色
  const frame = path.join(os.tmpdir(), 'export-media-frame.png')
  execFileSync('ffmpeg', ['-y', '-ss', '1.5', '-i', out, '-vframes', '1', frame], { stdio: 'ignore' })
  const raw = execFileSync(
    'ffmpeg',
    ['-y', '-i', frame, '-vf', 'scale=1:1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
    { encoding: 'buffer', stdio: ['ignore', 'pipe', 'ignore'] },
  )
  const [r, g, b] = [raw[raw.length - 3], raw[raw.length - 2], raw[raw.length - 1]]
  console.log(`帧平均色 rgb(${r}, ${g}, ${b})`)

  const isRed = r > 120 && r > g * 1.6 && r > b * 1.6
  console.log(isRed ? '✅ 导出画面为红色 → 素材片段已渲染进导出结果' : '❌ 画面不是红色 → 素材没进导出')

  srv.kill('SIGTERM')
})()

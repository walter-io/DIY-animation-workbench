/**
 * 验证倍速导出：1x 与 3x 对比
 *  - 成片时长应基本一致（帧数守恒，ffmpeg -r 重新定时）
 *  - 画面必须仍是红色（素材没被倍速弄丢）
 *  - 3x 的墙钟耗时应明显短于 1x
 */
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execFileSync } = require('child_process')
const { chromium } = require('playwright')
const { spawn } = require('child_process')

const SRC = path.join(__dirname, '_tmp', 'export-media-red8.mp4')
const PORT = 5194
const DUR = 8
;(async () => {
  const root = path.resolve(__dirname, '..')
  if (!fs.existsSync(SRC)) {
    execFileSync('ffmpeg', [
      '-y', '-f', 'lavfi', '-i', `color=c=red:s=320x180:d=${DUR}`,
      '-pix_fmt', 'yuv420p', SRC,
    ], { stdio: 'ignore' })
  }

  const srv = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
    cwd: root, stdio: 'ignore', shell: true,
  })
  const wait = (ms) => new Promise((r) => setTimeout(r, ms))
  for (let i = 0; i < 60; i++) {
    try { const res = await fetch(`http://localhost:${PORT}/`); if (res.ok) break } catch {}
    await wait(500)
  }

  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } })
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' })
  await wait(1500)
  const base = await page.evaluate(() => {
    try { return JSON.parse(localStorage.getItem('animation-editor-project-v1') || 'null') } catch { return null }
  })
  await browser.close()
  if (!base) { console.log('❌ 取不到工程基线'); srv.kill('SIGTERM'); return }

  const project = {
    ...base,
    duration: DUR,
    instances: [],
    mediaAssets: [{ id: 'm1', kind: 'video', name: 'red.mp4', url: '', duration: DUR, width: 320, height: 180 }],
    imageClips: [{
      id: 'c1', assetId: 'm1', start: 0, duration: DUR,
      x: 0, y: 0, w: 1920, h: 1080, opacity: 1, radius: 0, track: 1,
      focalX: 50, focalY: 50, zoom: 1, borderWidth: 0, borderColor: '#000000',
    }],
  }
  const media = [{ id: 'm1', base64: fs.readFileSync(SRC).toString('base64'), ext: 'mp4' }]

  async function runExport(speed, tag) {
    const t0 = Date.now()
    const res = await fetch(`http://localhost:${PORT}/api/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project, fps: 24, format: 'mp4', transparent: false, media, speed }),
    })
    if (!res.ok) {
      console.log(`❌ ${tag} 导出失败`, res.status, (await res.text()).slice(0, 200))
      return null
    }
    const buf = Buffer.from(await res.arrayBuffer())
    const out = path.join(__dirname, `_tmp`, `export-speed-${tag}.mp4`)
    fs.writeFileSync(out, buf)
    const wall = (Date.now() - t0) / 1000

    // 成片时长
    const probe = execFileSync('ffprobe', [
      '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', out,
    ], { encoding: 'utf8' })
    // 中间帧平均色
    const frame = path.join(os.tmpdir(), `sp-${tag}.png`)
    execFileSync('ffmpeg', ['-y', '-ss', String(DUR / 2), '-i', out, '-vframes', '1', frame], { stdio: 'ignore' })
    const raw = execFileSync('ffmpeg', ['-y', '-i', frame, '-vf', 'scale=1:1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { encoding: 'buffer', stdio: ['ignore', 'pipe', 'ignore'] })
    const [r, g, b] = [raw[raw.length - 3], raw[raw.length - 2], raw[raw.length - 1]]
    // 开头帧：用来确认没有把页面加载期的空白录进成片
    const head = path.join(os.tmpdir(), `sp-${tag}-head.png`)
    execFileSync('ffmpeg', ['-y', '-ss', '0.3', '-i', out, '-vframes', '1', head], { stdio: 'ignore' })
    const hraw = execFileSync('ffmpeg', ['-y', '-i', head, '-vf', 'scale=1:1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { encoding: 'buffer', stdio: ['ignore', 'pipe', 'ignore'] })
    const [hr, hg, hb] = [hraw[hraw.length - 3], hraw[hraw.length - 2], hraw[hraw.length - 1]]
    return { wall, dur: parseFloat(String(probe).trim()), r, g, b, hr, hg, hb, size: buf.length }
  }

  const a = await runExport(1, '1x')
  const b = await runExport(3, '3x')
  console.log('\n===== 倍速对比 =====')
  for (const [tag, m] of [['1x', a], ['3x', b]]) {
    if (!m) continue
    console.log(`${tag}: 墙钟 ${m.wall.toFixed(1)}s | 成片 ${m.dur.toFixed(2)}s | 中段 rgb(${m.r},${m.g},${m.b}) | 开头 rgb(${m.hr},${m.hg},${m.hb}) | ${(m.size / 1024).toFixed(0)}KB`)
  }
  if (a && b) {
    console.log('\n===== 断言 =====')
    const isRed = (m) => m.r > 120 && m.r > m.g * 1.6 && m.r > m.b * 1.6
    const isRedHead = (m) => m.hr > 120 && m.hr > m.hg * 1.6 && m.hr > m.hb * 1.6
    const near = (v) => Math.abs(v - DUR) < 0.6
    console.log(isRed(a) ? '✅' : '❌', '1x 画面为红（素材在）')
    console.log(isRed(b) ? '✅' : '❌', '3x 画面为红（倍速没弄丢素材）')
    console.log(isRedHead(a) && isRedHead(b) ? '✅' : '❌', '成片开头就是素材画面（没有加载期空白）')
    console.log(near(a.dur) ? '✅' : '❌', `1x 成片时长 ≈ ${DUR}s（实际 ${a.dur.toFixed(2)}）`)
    console.log(near(b.dur) ? '✅' : '❌', `3x 成片时长 ≈ ${DUR}s（实际 ${b.dur.toFixed(2)}）`)
    console.log(b.wall < a.wall ? '✅' : '❌', `3x 更快 (${b.wall.toFixed(1)}s < ${a.wall.toFixed(1)}s，省 ${(100 - b.wall / a.wall * 100).toFixed(0)}%)`)
  }
  srv.kill('SIGTERM')
})()

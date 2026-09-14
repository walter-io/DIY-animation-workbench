/**
 * 验证「关键帧按钮移播放条 + 关键帧过渡 + 素材库持久化」四条需求：
 *
 *   ① 打了关键帧之后有过渡（sampleClipVisual 相邻帧插值，不再硬切）
 *   ② 关键帧按钮在播放条（.os-btn-kf），参数面板已无关键帧区块
 *   ③ 点按钮 = 在当前播放头给选中片段加 / 删关键帧，两帧之间自动过渡
 *   ④ 素材库刷新后保留 + 随「保存当前版本」存 + 只有「重置编辑台」才清
 *
 * 自包含：脚本自己 spawn vite dev server（沙箱会杀掉 `&` 后台进程，必须同进程拉起），
 * 跑完再杀掉。所以不要单独先起 5188。
 */
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
const PORT = process.env.PORT || '5188'
// 注意：vite 默认只监听 IPv6 ::1，127.0.0.1 会 ECONNREFUSED，必须用 localhost
const BASE = `http://localhost:${PORT}/`

const IMG = path.join(__dirname, '_tmp', 'persist-test.png')
const SHOT = path.join(__dirname, '_tmp', 'media-persist.png')

// 1x1 红色 PNG（ffmpeg 不可用时的兜底）
const FALLBACK_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

if (!fs.existsSync(IMG)) {
  fs.mkdirSync(path.dirname(IMG), { recursive: true })
  try {
    execFileSync('ffmpeg', [
      '-y', '-f', 'lavfi', '-i', 'color=c=0xff6f7c:s=320x180',
      '-frames:v', '1', '-loglevel', 'error', IMG,
    ])
  } catch {
    fs.writeFileSync(IMG, FALLBACK_PNG)
  }
}

let pass = 0
let fail = 0
const check = (name, ok, detail) => {
  console.log(`  ${ok ? '✅' : '❌'} ${name}${detail ? ' → ' + detail : ''}`)
  ok ? pass++ : fail++
}
const near = (a, b, tol = 0.05) => Math.abs(a - b) <= tol

const readProject = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || '{}'), KEY)
const idbCount = (page) =>
  page.evaluate((dbName) => new Promise((resolve) => {
    const req = indexedDB.open(dbName)
    req.onerror = () => resolve(-2)
    req.onsuccess = () => {
      const db = req.result
      try {
        const c = db.transaction('blobs', 'readonly').objectStore('blobs').count()
        c.onsuccess = () => resolve(c.result)
        c.onerror = () => resolve(-1)
      } catch {
        resolve(-3)
      }
    }
  }), DB_NAME)

// 复用 verify-split 的精确 seek：取刻度中心算 px/秒，点击 ruler 落点，再读回实际时间
const seek = async (page, t) => {
  await page.evaluate((time) => {
    const ticks = [...document.querySelectorAll('.os-tick')]
    const k = Math.max(0, Math.min(ticks.length - 2, Math.floor(time)))
    const a = ticks[k].getBoundingClientRect()
    const b = ticks[k + 1]?.getBoundingClientRect()
    const cx = a.left + a.width / 2
    const pxPerSec = b ? b.left + b.width / 2 - cx : 36
    const ruler = document.querySelector('.os-ruler')
    ruler.dispatchEvent(
      new MouseEvent('click', { bubbles: true, clientX: cx + (time - k) * pxPerSec, clientY: a.top + 5 }),
    )
  }, t)
  await page.waitForTimeout(300)
  return await page.evaluate(() => {
    const txt = (document.querySelector('.os-time')?.textContent || '0:00').split('/')[0].trim()
    const [m, s] = txt.split(':').map(Number)
    return m * 60 + s
  })
}

async function waitServer() {
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

;(async () => {
  // 1. 自包含拉起 vite
  const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--port', PORT, '--strictPort'], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let viteLog = ''
  vite.stdout.on('data', (d) => (viteLog += d.toString()))
  vite.stderr.on('data', (d) => (viteLog += d.toString()))

  const ready = await waitServer()
  if (!ready) {
    console.error('❌ vite 未能启动：\n' + viteLog)
    vite.kill()
    process.exit(2)
  }
  console.log('vite ready on ' + PORT)

  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1680, height: 950 } })
  const errors = []
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })

  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  // 清空历史状态，从默认工程开始，保证可复现
  await page.evaluate((k) => localStorage.removeItem(k), KEY)
  await page.evaluate((k) => localStorage.removeItem(k), VERSIONS_KEY)
  await page.evaluate((db) => new Promise((res) => {
    const r = indexedDB.deleteDatabase(db)
    r.onsuccess = r.onerror = r.onblocked = () => res()
  }), DB_NAME)
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(900)

  // ===== 1. 纯函数：过渡插值（需求①）+ serializeProject 去 url（需求④） =====
  console.log('\n=== 1. 纯函数 ===')
  const fn = await page.evaluate(async () => {
    const mk = await import('/src/mediaKeyframe.ts')
    const mp = await import('/src/mediaPersistence.ts')
    // 两个关键帧：t=0 x=0 → t=2 x=200，linear 缓动，中点应是 100（证明有过渡、不是硬切）
    const clip = {
      id: 'c', assetId: 'a', start: 0, duration: 3, x: 0, y: 0, w: 100, h: 100,
      opacity: 1, radius: 0, track: 1, focalX: 50, focalY: 50, zoom: 1,
      borderWidth: 0, borderColor: '#fff', mirror: false, shadow: false,
      keyframes: [
        mk.visualToKf(0, { x: 0, y: 0, w: 100, h: 100, opacity: 1, radius: 0, focalX: 50, focalY: 50, zoom: 1 }, 'linear'),
        mk.visualToKf(2, { x: 200, y: 0, w: 100, h: 100, opacity: 1, radius: 0, focalX: 50, focalY: 50, zoom: 1 }, 'linear'),
      ],
    }
    const mid = mk.sampleClipVisual(clip, 1)
    const noKeys = mk.sampleClipVisual({ ...clip, keyframes: [] }, 1)
    // serializeProject：url 清空、原对象不被改写、其余字段保留
    const src = { mediaAssets: [{ id: 'a1', kind: 'image', name: 'x', url: 'blob:http://x/abc', duration: 0, width: 320, height: 180 }] }
    const ser = mp.serializeProject(src)
    return {
      midX: mid.x,
      noKeysX: noKeys.x,
      urlStripped: ser.mediaAssets[0].url === '',
      keptFields: ser.mediaAssets[0].id === 'a1' && ser.mediaAssets[0].width === 320,
      originalIntact: src.mediaAssets[0].url === 'blob:http://x/abc',
    }
  })
  check('两关键帧中点插值出过渡（x≈100）', near(fn.midX, 100), `mid.x=${fn.midX}`)
  check('无关键帧时退回静态值（x=0）', near(fn.noKeysX, 0), `x=${fn.noKeysX}`)
  check('serializeProject 清空 url', fn.urlStripped === true)
  check('serializeProject 保留其余字段', fn.keptFields === true)
  check('serializeProject 不改写原对象', fn.originalIntact === true)

  // ===== 2. 端到端：导入素材 + 打关键帧 =====
  console.log('\n=== 2. 导入素材 + 打关键帧 ===')
  // 切到素材库 Tab
  await page.click('.os-left-tab:has-text("素材库")')
  await page.waitForTimeout(300)
  await page.setInputFiles('.os-panel-left input[type="file"]', IMG)
  await page.waitForTimeout(1200)

  let proj = await readProject(page)
  check('导入图片后 mediaAssets=1', (proj.mediaAssets || []).length === 1, `条数=${(proj.mediaAssets || []).length}`)
  check('素材像素已写入 IndexedDB', (await idbCount(page)) === 1, `blobs=${await idbCount(page)}`)

  // 点「＋」把素材加到播放头（默认播放头 0 → clip.start=0）
  await page.click('.os-media-act.add')
  await page.waitForTimeout(500)
  proj = await readProject(page)
  check('点「＋」后 imageClips=1', (proj.imageClips || []).length === 1, `条数=${(proj.imageClips || []).length}`)
  const clip0 = proj.imageClips?.[0]
  check('图片片段时长=3s、起点=0', clip0 && near(clip0.start, 0) && near(clip0.duration, 3), clip0 ? `${clip0.start}~${clip0.duration}s` : '无片段')

  // 选中片段 → 关键帧按钮应可用（需求②③）
  await page.click('.os-img-clip')
  await page.waitForTimeout(300)
  const kfEnabled = await page.$eval('.os-btn-kf', (el) => !el.disabled)
  check('选中片段且播放头在片段内 → 关键帧按钮可用', kfEnabled === true)

  // 在 1s 打一帧，2s 再打一帧
  const landed1 = await seek(page, 1)
  await page.click('.os-btn-kf')
  await page.waitForTimeout(300)
  const landed2 = await seek(page, 2)
  await page.click('.os-btn-kf')
  await page.waitForTimeout(400)

  proj = await readProject(page)
  const keys = proj.imageClips?.[0]?.keyframes ?? []
  check('打了两帧 → keyframes=2', keys.length === 2, `帧数=${keys.length} (落点 ${landed1}s / ${landed2}s)`)
  check('关键帧落在片段内 1s / 2s 附近', keys.length === 2 && near(keys[0].t, 1, 0.2) && near(keys[1].t, 2, 0.2), keys.map((k) => k.t.toFixed(2)).join(','))
  const markers = await page.$$eval('.os-kf-marker', (els) => els.length)
  check('片段条上渲染 2 个菱形标记', markers === 2, `标记数=${markers}`)

  // 参数面板已无关键帧按钮区块（需求②）
  const panelHasKeyBlock = await page.evaluate(() => {
    const p = document.querySelector('.os-panel-right, .os-param, .os-panel')
    const btns = [...(p ? p.querySelectorAll('button') : [])]
    return btns.some((b) => /关键帧/.test(b.textContent || ''))
  })
  check('参数面板已无「关键帧」按钮区块', panelHasKeyBlock === false)

  // ===== 3. 端到端：刷新后素材库保留 + 重建 objectURL（需求④） =====
  console.log('\n=== 3. 刷新持久化 ===')
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(600)
  // 刷新后左侧 Tab 会重置回「动效库」，先切回「素材库」才能看到素材项
  await page.click('.os-left-tab:has-text("素材库")')
  // 轮询等待 hydration effect 从 IndexedDB 重建 objectURL（缩略图 src 变成 blob:）
  let thumbSrc = ''
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(200)
    thumbSrc = await page.$eval('.os-media-thumb img', (el) => el.getAttribute('src') || '').catch(() => '')
    if (thumbSrc.startsWith('blob:')) break
  }

  proj = await readProject(page)
  const ma = proj.mediaAssets || []
  check('刷新后 mediaAssets 仍=1（不丢）', ma.length === 1, `条数=${ma.length}`)
  // 注意：localStorage 里 url 永远是 ''（serializeProject 落盘即清），
  // 真正的"重建成功"体现在 DOM 缩略图的 src 变成了 blob: 地址。
  check('刷新后 objectURL 已重建（缩略图 src=blob:）', thumbSrc.startsWith('blob:'), `src=${thumbSrc.slice(0, 28) || '空'}`)
  check('刷新后 imageClips 仍=1、关键帧=2', (proj.imageClips || []).length === 1 && (proj.imageClips?.[0]?.keyframes || []).length === 2,
    `clip=${(proj.imageClips || []).length} kf=${(proj.imageClips?.[0]?.keyframes || []).length}`)

  // ===== 4. 端到端：保存当前版本 / 重置编辑台（需求④） =====
  console.log('\n=== 4. 保存版本 + 重置 ===')
  await page.click('.os-dd-btn:has-text("版本")')
  await page.waitForTimeout(250)
  await page.click('.os-dd-item:has-text("保存当前版本")')
  await page.waitForTimeout(500)
  const savedVer = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) || '[]'), VERSIONS_KEY)
  check('保存当前版本 → 版本库有 1 条', savedVer.length === 1, `条数=${savedVer.length}`)
  check('版本里 mediaAssets 已去 url（url=\'\'）', savedVer[0]?.project?.mediaAssets?.[0]?.url === '', `url=${JSON.stringify(savedVer[0]?.project?.mediaAssets?.[0]?.url)}`)
  check('版本里 mediaAssets 元数据仍在（id/宽高）', savedVer[0]?.project?.mediaAssets?.[0]?.id && savedVer[0]?.project?.mediaAssets?.[0]?.width === 320)

  // 重置编辑台 → 素材库清空 + IndexedDB 清空
  await page.click('.os-dd-btn:has-text("版本")')
  await page.waitForTimeout(250)
  await page.click('.os-dd-item:has-text("重置编辑台")')
  await page.waitForTimeout(300)
  await page.click('.os-btn-danger')
  await page.waitForTimeout(700)

  proj = await readProject(page)
  check('重置后 mediaAssets=0', (proj.mediaAssets || []).length === 0, `条数=${(proj.mediaAssets || []).length}`)
  check('重置后 imageClips=0', (proj.imageClips || []).length === 0, `条数=${(proj.imageClips || []).length}`)
  check('重置后 IndexedDB 已清空', (await idbCount(page)) === 0, `blobs=${await idbCount(page)}`)

  const shot = await page.$('.os-timeline')
  if (shot) await shot.screenshot({ path: SHOT })

  console.log('\n=== 控制台错误 ===')
  console.log(errors.length ? errors.join('\n') : '  无')
  console.log(`\n结果：${pass} 通过 / ${fail} 失败`)

  await browser.close()
  vite.kill()
  process.exit(fail ? 1 : 0)
})().catch((e) => {
  console.error('脚本异常：', e)
  process.exit(3)
})

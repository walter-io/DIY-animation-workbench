// 验证：1) 复刻卡改名后无"复刻·"前缀；2) 素材片段入场动画生效（slideLeft 平移 / fade 淡显）
const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')
const { chromium } = require('playwright')

const PORT = 5191
const ROOT = path.resolve(__dirname, '..')
const PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function waitFor(url, ms = 60000) {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) {
    try {
      const res = await fetch(url)
      if (res.ok) return
    } catch {}
    await sleep(500)
  }
  throw new Error('dev server not reachable')
}

function mkProject(entrance, dur) {
  return {
    version: 1,
    meta: { duration: 10, fps: 30, width: 1920, height: 1080 },
    instances: [],
    imageClips: [
      {
        id: 'c1',
        assetId: 'a1',
        start: 0,
        duration: 8,
        x: 760,
        y: 390,
        w: 400,
        h: 300,
        opacity: 1,
        radius: 0,
        track: 1,
        focalX: 50,
        focalY: 50,
        zoom: 1,
        borderWidth: 0,
        borderColor: '#ffffff',
        mirror: false,
        shadow: false,
        entrance,
        entranceDur: dur,
      },
    ],
    subtitles: [],
    mediaAssets: [{ id: 'a1', kind: 'image', name: 't', url: PNG, width: 400, height: 300 }],
  }
}

;(async () => {
  const vite = spawn(
    `"${process.env.NODE_EXE || 'node'}" ./node_modules/vite/bin/vite.js --port ${PORT} --host ::1 --strictPort`,
    { cwd: ROOT, shell: true, stdio: 'ignore' },
  )
  try {
    await waitFor(`http://localhost:${PORT}/`)
    const browser = await chromium.launch()
    const page = await browser.newPage({ viewport: { width: 1600, height: 900 } })

    // ---- 1) 改名验证：库里搜 "复刻·" 应不再有卡片 ----
    await page.goto(`http://localhost:${PORT}/`)
    await page.waitForSelector('.os-lib-item', { timeout: 30000 })
    await page.fill('.os-lib-search', '复刻·')
    await sleep(300)
    const fkDot = await page.locator('.os-lib-item').count()
    console.log('search "复刻·" hits (expect 0):', fkDot)
    await page.fill('.os-lib-search', '')
    await sleep(200)

    // ---- 2) slideLeft：t=0 时媒体层有负向 translateX；播放后收敛到 ~0 ----
    await page.evaluate((p) => {
      try {
        localStorage.setItem('animation-editor-project-v1', JSON.stringify(p))
      } catch {}
    }, mkProject('slideLeft', 0.6))
    await page.reload()
    await page.waitForSelector('.os-media-layer', { timeout: 30000 })
    await sleep(400)
    const t0 = await page.$eval('.os-media-layer', (el) => {
      const cs = getComputedStyle(el)
      return { transform: cs.transform, opacity: cs.opacity }
    })
    console.log('slideLeft @t0 transform:', t0.transform, 'opacity:', t0.opacity)

    // 点标尺推进播放头到 t≈2.5s（片段 duration 8s，entrance 0.6s 早已结束 → 应归位）
    const ruler = page.locator('.os-ruler').first()
    if (await ruler.count()) {
      const box = await ruler.boundingBox()
      await page.mouse.click(box.x + box.width * 0.25, box.y + box.height / 2)
    } else {
      // 退路：直接点画布下方时间轴任意位置
      await page.mouse.click(400, 820)
    }
    await sleep(500)
    const t1 = await page.$eval('.os-media-layer', (el) => {
      const cs = getComputedStyle(el)
      return { transform: cs.transform, opacity: cs.opacity }
    })
    console.log('slideLeft @t~2.5 transform:', t1.transform, 'opacity:', t1.opacity)

    // ---- 3) fade：t=0 时 opacity≈0 ----
    await page.evaluate((p) => {
      try {
        localStorage.setItem('animation-editor-project-v1', JSON.stringify(p))
      } catch {}
    }, mkProject('fade', 0.6))
    await page.reload()
    await page.waitForSelector('.os-media-layer', { timeout: 30000 })
    await sleep(400)
    const f0 = await page.$eval('.os-media-layer', (el) => getComputedStyle(el).opacity)
    console.log('fade @t0 opacity (expect ~0):', f0)

    // ---- 4) 参数面板出现"入场动画"控制 ----
    await page.evaluate((p) => {
      try {
        localStorage.setItem('animation-editor-project-v1', JSON.stringify(p))
      } catch {}
    }, mkProject('none', 0.6))
    await page.reload()
    await page.waitForSelector('.os-media-layer', { timeout: 30000 })
    await page.click('.os-media-layer')
    await sleep(300)
    const hasEntrance = await page.locator('.os-param-divider:has-text("入场动画")').count()
    const hasSelect = await page.locator('select:has(option[value="slideLeft"])').count()
    console.log('param panel "入场动画" divider present:', hasEntrance, '| entrance select present:', hasSelect)

    await browser.close()
  } finally {
    vite.kill()
  }
  process.exit(0)
})().catch((e) => {
  console.error(e)
  process.exit(1)
})

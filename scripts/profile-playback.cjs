/**
 * 播放掉帧诊断：量「同时活跃的动效卡数量」对帧率的影响。
 * 若 FPS 随卡片数显著下降 → 瓶颈是每帧的 React 重渲染（播放头 dispatch 打穿全应用）。
 * 用法：先起 `npx vite --port 5192`，再 node scripts/profile-playback.cjs
 */
const { chromium } = require('playwright')

const EFFECTS = [
  'bullet-list', 'compare-bars', 'core-number-roller', 'ring',
  'trend', 'rank', 'concept-trio', 'checklist',
]

function makeProject(nCards) {
  const instances = []
  for (let i = 0; i < nCards; i++) {
    instances.push({
      id: `p${i}`,
      effectId: EFFECTS[i % EFFECTS.length],
      name: `卡${i}`,
      start: 0,
      duration: 60,
      slot: ['left', 'right', 'center', 'bottom'][i % 4],
      fit: 'auto',
      params: { title: `标题${i}`, items: '一\n二\n三', accent: '' },
    })
  }
  return {
    name: 'perf', skin: 'dark', style: 'glass', font: 'sans',
    palette: { accent: '#5ac8fa', data: '#5ac8fa', special: '#ffd166' },
    host: { layout: 'off', x: 1384, y: 754, w: 480, h: 270, circular: false, radius: 24, focalX: 50, focalY: 50, zoom: 1, mirror: false, borderWidth: 4, borderColor: '#ffffff', shadow: true, opacity: 1 },
    hostClips: [], cardOpacity: 0.65, fps: 30, duration: 60, layout: 'edit', presets: [],
    instances,
  }
}

async function measure(page, nCards) {
  await page.evaluate((p) => localStorage.setItem('animation-editor-project-v1', JSON.stringify(p)), makeProject(nCards))
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)

  // 起播 + 同时开长任务观测
  await page.evaluate(() => {
    window.__long = 0
    window.__longMs = 0
    try {
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) { window.__long++; window.__longMs += e.duration }
      }).observe({ entryTypes: ['longtask'] })
    } catch { /* ignore */ }
    const btn = [...document.querySelectorAll('.os-transport button')]
      .find((b) => /播放|暂停/.test(b.textContent || ''))
    btn && btn.click()
  })
  await page.waitForTimeout(250)

  const r = await page.evaluate(() => new Promise((resolve) => {
    const frames = []
    const t0 = performance.now()
    const tick = () => {
      frames.push(performance.now() - t0)
      if (performance.now() - t0 < 3000) requestAnimationFrame(tick)
      else {
        const d = []
        for (let i = 1; i < frames.length; i++) d.push(frames[i] - frames[i - 1])
        d.sort((a, b) => a - b)
        const pct = (p) => d[Math.min(d.length - 1, Math.floor(d.length * p))] ?? 0
        resolve({
          n: frames.length,
          fps: frames.length / (frames[frames.length - 1] / 1000),
          median: pct(0.5), p95: pct(0.95), p99: pct(0.99),
          max: d[d.length - 1] ?? 0,
          dropped: d.filter((x) => x > 32).length,
          long: window.__long, longMs: window.__longMs,
        })
      }
    }
    requestAnimationFrame(tick)
  }))
  return r
}

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1680, height: 950 } })
  const errors = []
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))

  await page.goto('http://127.0.0.1:5192/', { waitUntil: 'networkidle' })

  console.log('同时活跃卡片数 → 帧率（3 秒采样，越长越卡）\n')
  console.log('卡片数   FPS    中位    p95     p99    最大    掉帧   长任务')
  console.log('------  ------  -----  ------  ------  -----  ------  ------')

  for (const n of [1, 2, 4, 8]) {
    const r = await measure(page, n)
    console.log(
      String(n).padEnd(8) +
      r.fps.toFixed(1).padEnd(8) +
      r.median.toFixed(1).padEnd(7) +
      r.p95.toFixed(1).padEnd(8) +
      r.p99.toFixed(1).padEnd(8) +
      r.max.toFixed(1).padEnd(7) +
      `${r.dropped}/${r.n}`.padEnd(8) +
      `${r.long}(${r.longMs.toFixed(0)}ms)`,
    )
  }

  console.log('\n错误 =', errors.length ? errors.join('\n') : '无')
  await browser.close()
})()

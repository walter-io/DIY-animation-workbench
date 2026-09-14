/**
 * 探针：机位关键帧补间到底有没有插值。
 *
 * 直接在页面里 import hostTween 的纯函数（vite 会转译 TS），
 * 不依赖出镜视频 / DOM，所以结果只反映解算逻辑本身。
 *
 * 用例：0~5s 右侧半屏 → 5s 起左下圆，过渡 0.6s。
 * 期望：t=5 还在半屏，t=5.3 落在两者之间，t=5.6 到达左下角。
 */
const { chromium } = require('playwright')

const HOST = {
  layout: 'split-right',
  x: 1384, y: 754, w: 480, h: 270,
  circular: false, radius: 24,
  focalX: 50, focalY: 50, zoom: 1,
  mirror: false, borderWidth: 4, borderColor: '#ffffff', shadow: true, opacity: 1,
}

const SAMPLES = [0, 4.9, 5, 5.15, 5.3, 5.45, 5.6, 6, 9]

;(async () => {
  const b = await chromium.launch()
  const p = await b.newPage()
  p.on('pageerror', (e) => console.log('PAGEERROR:', e.message))

  await p.goto('http://127.0.0.1:5188', { waitUntil: 'domcontentloaded' })
  await p.waitForTimeout(800)

  const run = (project) =>
    p.evaluate(
      async ({ project, samples }) => {
        const m = await import('/src/hostTween.ts')
        return samples.map((t) => {
          const s = m.resolveHostState(project, t, 1920, 1080, false)
          return {
            t,
            x: Math.round(s.frame.x),
            y: Math.round(s.frame.y),
            w: Math.round(s.frame.w),
            h: Math.round(s.frame.h),
            radius: Math.round(s.radius),
            contentW: Math.round(s.content.w),
            mix: Number(s.mix.toFixed(3)),
            transitioning: s.transitioning,
            layout: s.layout,
          }
        })
      },
      { project, samples: SAMPLES },
    )

  console.log('=== 用例 A：段上显式写了 transition = 0.6 ===')
  const a = await run({
    host: HOST,
    hostTransition: 0.6,
    hostClips: [
      { id: 'a', start: 0, duration: 5, layout: 'split-right', transition: 0.6, ease: 'easeInOut' },
      { id: 'b', start: 5, duration: 5, layout: 'circle-bl', transition: 0.6, ease: 'easeInOut' },
    ],
  })
  for (const r of a) console.log(' ', JSON.stringify(r))

  console.log('\n=== 用例 B：段上没写 transition（应回落到 project.hostTransition = 0.6）===')
  const bRes = await run({
    host: HOST,
    hostTransition: 0.6,
    hostClips: [
      { id: 'a', start: 0, duration: 5, layout: 'split-right' },
      { id: 'b', start: 5, duration: 5, layout: 'circle-bl' },
    ],
  })
  for (const r of bRes) console.log(' ', JSON.stringify(r))

  console.log('\n=== 用例 C：transition = 0（硬切，应无插值）===')
  const c = await run({
    host: HOST,
    hostTransition: 0,
    hostClips: [
      { id: 'a', start: 0, duration: 5, layout: 'split-right', transition: 0 },
      { id: 'b', start: 5, duration: 5, layout: 'circle-bl', transition: 0 },
    ],
  })
  for (const r of c) console.log(' ', JSON.stringify(r))

  console.log('\n=== 参照值 ===')
  console.log('  右侧半屏 split-right 目标: x=960 y=0 w=960 h=1080 radius=0')
  console.log('  左下圆 circle-bl     目标: x=63  y=716 w=300 h=300 radius=150')

  await b.close()
  process.exit(0)
})()

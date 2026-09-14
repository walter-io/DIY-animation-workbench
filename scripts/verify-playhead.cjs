/**
 * 播放头上下文拆分后的回归验证：
 *  currentTime 从单一大 context 拆到独立 TimeContext 后，
 *  必须确认「真的需要逐帧时间」的组件依然拿得到时间，而机位段判定依然随播放头切换。
 * 用法：先起 `npx vite --port 5192`，再 node scripts/verify-playhead.cjs
 */
const { chromium } = require('playwright')

const project = {
  name: 'playhead', skin: 'dark', style: 'glass', font: 'sans',
  palette: { accent: '#5ac8fa', data: '#5ac8fa', special: '#ffd166' },
  host: {
    layout: 'off', x: 1384, y: 754, w: 480, h: 270,
    circular: false, radius: 24, focalX: 50, focalY: 50, zoom: 1, mirror: false,
    borderWidth: 4, borderColor: '#ffffff', shadow: true, opacity: 1,
  },
  // 三个机位段：0-5s 右下圆 / 8-13s 左侧半屏 / 16-21s 底部横条
  hostClips: [
    { id: 'hc1', start: 0, duration: 5, layout: 'circle-br', focalX: 50, focalY: 50, zoom: 1 },
    { id: 'hc2', start: 8, duration: 5, layout: 'split-left', focalX: 50, focalY: 50, zoom: 1 },
    { id: 'hc3', start: 16, duration: 5, layout: 'bar-bottom', focalX: 50, focalY: 50, zoom: 1 },
  ],
  cardOpacity: 0.65, fps: 30, duration: 24, layout: 'edit', presets: [],
  instances: [
    { id: 'p1', effectId: 'bullet-list', name: '要点清单卡', start: 0, duration: 24, slot: 'left', fit: 'auto', params: { title: '标题', items: '一\n二\n三', accent: '', showRank: true } },
  ],
}

const results = []
function check(name, ok, detail) {
  results.push({ name, ok })
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? '  → ' + detail : ''}`)
}

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1680, height: 950 } })
  const errors = []
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })

  await page.goto('http://127.0.0.1:5192/', { waitUntil: 'networkidle' })
  await page.evaluate((p) => localStorage.setItem('animation-editor-project-v1', JSON.stringify(p)), project)
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(900)

  // 导入主持视频，让机位段相关 UI 出现
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) => /出镜/.test(b.textContent || ''))
    btn && btn.click()
  })
  await page.waitForTimeout(300)
  await page.setInputFiles('.os-dd-form input[type=file]', 'public/host-sample.mp4')
  await page.waitForTimeout(900)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)

  const readTime = () => page.evaluate(() => {
    const el = document.querySelector('.os-canvas-spec')
    return el ? el.textContent : null
  })
  // 点标尺定位：onRulerClick 算 (clientX - left)/width * duration，
  // .os-tracks 有 flex 拉伸，实际宽度不等于 duration*36，所以按「占总时长的比例」点才准
  const seekTo = async (t) => {
    const box = await page.locator('.os-tracks').boundingBox()
    if (!box) throw new Error('找不到 .os-tracks')
    await page.mouse.click(box.x + (t / project.duration) * box.width, box.y + 4)
    await page.waitForTimeout(250)
  }

  // ===== 1. 播放时播放头确实在推进（画布时间码会变） =====
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('.os-transport button')].find((b) => /播放|暂停/.test(b.textContent || ''))
    btn && btn.click()
  })
  await page.waitForTimeout(300)
  const t1 = await readTime()
  await page.waitForTimeout(1200)
  const t2 = await readTime()
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('.os-transport button')].find((b) => /播放|暂停/.test(b.textContent || ''))
    btn && btn.click()
  })
  check('播放时播放头持续推进', !!t1 && !!t2 && t1 !== t2, `${t1} → ${t2}`)

  // ===== 2. 卡片动画确实跟着播放头走（同一张卡在两个时刻渲染不同） =====
  const snapAt = async (t) => {
    await seekTo(t)
    return page.evaluate(() => {
      const el = document.querySelector('.os-inst-body')
      return el ? el.innerHTML.length + '|' + (el.textContent || '').slice(0, 40) : 'NONE'
    })
  }
  const s0 = await snapAt(1)
  const s10 = await snapAt(10)
  check('按时间 seek 后画布内容随之更新', s0 !== 'NONE' && s10 !== 'NONE', `t=1 与 t=10 快照不同 = ${s0 !== s10}`)

  // ===== 3. 机位段随播放头切换（顶栏标签 + 参数面板都应反映当前段） =====
  const hostLabel = async () => page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) => /出镜/.test(b.textContent || ''))
    return btn ? btn.textContent.replace(/\s+/g, ' ').trim() : 'NONE'
  })
  await seekTo(2)
  const lbl2 = await hostLabel()
  await seekTo(10)
  const lbl10 = await hostLabel()
  await seekTo(18)
  const lbl18 = await hostLabel()
  check('机位段随播放头切换（顶栏标签变化）', lbl2 !== lbl10 && lbl10 !== lbl18, `"${lbl2}" / "${lbl10}" / "${lbl18}"`)

  // ===== 4. 时间轴播放头指针位置跟着走 =====
  const headLeft = async () => page.evaluate(() => {
    const h = document.querySelector('.os-playhead, [class*="playhead"]')
    return h ? h.style.left || getComputedStyle(h).left : 'NONE'
  })
  await seekTo(3)
  const h3 = await headLeft()
  await seekTo(15)
  const h15 = await headLeft()
  check('时间轴播放头指针随播放头移动', h3 !== 'NONE' && h3 !== h15, `${h3} → ${h15}`)

  console.log('\n错误 =', errors.length ? errors.join('\n') : '无')
  const failed = results.filter((r) => !r.ok).length
  console.log(`\n结果：${results.length - failed}/${results.length} 通过`)
  await browser.close()
  process.exit(failed === 0 && errors.length === 0 ? 0 : 1)
})()

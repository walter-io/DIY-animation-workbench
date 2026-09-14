/**
 * 字幕三项需求的端到端验证（需要 dev server 绑 IPv4）：
 *
 *   npx vite --port 5188 --strictPort --host 127.0.0.1
 *   npm run verify:subs
 *
 * A. 字幕置顶：字幕卡必须渲染在所有动效卡之后，并带明确的 z-index
 * B. 统一样式：字号 / 颜色 / 背景 / 位置由工程里一份全局样式决定，
 *    每张字幕卡自带的旧样式参数被覆盖（逐句在画布上实测）
 * C. 联动：通过面板改一处，工程里的全局样式同步；切位置会收回被拖开的字幕
 * D. 文案不联动：每句文案仍各自独立
 * E. 旧工程迁移：没有 subtitleStyle 字段时，沿用第一句字幕的样式
 */
const { chromium } = require('playwright')

const BASE = process.env.VERIFY_BASE || 'http://127.0.0.1:5188'
const KEY = 'animation-editor-project-v1'

const DEFAULT_HOST = {
  layout: 'off', x: 1384, y: 754, w: 480, h: 270, circular: false, radius: 24,
  focalX: 50, focalY: 50, zoom: 1, mirror: false, borderWidth: 4,
  borderColor: '#ffffff', shadow: true,
}

const mkSub = (id, text, start, fontSize) => ({
  id,
  effectId: 'srt-subtitle',
  name: '字幕',
  start,
  duration: 2,
  slot: 'bottom',
  fit: 'auto',
  params: {
    text,
    // 故意让每句自带不同的字号：如果全局样式没生效，画布上就会各不相同
    fontSize,
    align: 'center',
    color: '#ffffff',
    box: true,
    bg: 'rgba(0,0,0,0.55)',
  },
})

/** 字幕卡故意插在动效卡之间：渲染顺序若不重排，字幕就会被压在下面 */
const instances = [
  { id: 'c1', effectId: 'big-title', name: '大标题', start: 0, duration: 6, slot: 'center', fit: 'full', params: {} },
  mkSub('s1', '第一句字幕', 0, 30),
  { id: 'c2', effectId: 'bullet-list', name: '要点卡', start: 0, duration: 6, slot: 'left', fit: 'auto', params: {} },
  mkSub('s2', '第二句字幕', 2, 50),
  mkSub('s3', '第三句字幕', 4, 70),
]

const project = {
  name: 'subtitle-style', skin: 'dark', style: 'glass', font: 'sans',
  palette: { accent: '#5ac8fa', data: '#5ac8fa', special: '#ffd166' },
  host: { ...DEFAULT_HOST }, hostClips: [],
  subtitleStyle: { fontSize: 60, align: 'center', color: '#ffd166', box: true, bg: 'rgba(0,0,0,0.55)', slot: 'bottom' },
  cardOpacity: 0.35, cardOpacityV2: true,
  fps: 30, duration: 6, layout: 'edit', presets: [],
  instances,
}

let passed = 0
let failed = 0
function ok(name, cond, detail) {
  if (cond) { passed++; console.log(`  ✓ ${name}`) }
  else { failed++; console.log(`  ✗ ${name}${detail !== undefined ? ` — ${detail}` : ''}`) }
}
function section(t) { console.log(`\n${t}`) }

async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1680, height: 950 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()) })

  const readProject = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || 'null'), KEY)
  const seekTo = async (sec) => {
    await page.evaluate((s) => {
      const tracks = document.querySelector('.os-tracks')
      const r = tracks.getBoundingClientRect()
      tracks.dispatchEvent(new MouseEvent('click', {
        bubbles: true, clientX: r.left + (s / 6) * r.width, clientY: r.top + 2,
      }))
    }, sec)
    await page.waitForTimeout(350)
  }
  /** 画布上当前这句字幕的可见样式 */
  const barStyle = () =>
    page.evaluate(() => {
      const el = document.querySelector('.os-srt-bar')
      if (!el) return null
      const cs = getComputedStyle(el)
      return {
        text: (el.textContent || '').trim(),
        fontSize: cs.fontSize,
        color: cs.color,
        background: cs.backgroundColor,
      }
    })
  /** 点时间轴字幕轨（第 1 条泳道，top = 3px）上的第 n 个片段 */
  const pickSubtitle = async (no) => {
    const idx = await page.evaluate((n) => {
      const all = [...document.querySelectorAll('.os-tracks .os-clip')]
      const subs = all.filter((el) => el.style.top === '3px')
      const target = subs[n - 1]
      return target ? all.indexOf(target) : -1
    }, no)
    if (idx < 0) return false
    // 必须真点：clip 的选中逻辑挂在 click 上，dispatch mousedown 不触发
    await page.locator('.os-tracks .os-clip').nth(idx).click()
    await page.waitForTimeout(350)
    return true
  }

  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.evaluate((p) => localStorage.setItem('animation-editor-project-v1', JSON.stringify(p)), project)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1400)

  // ── A. 字幕置顶
  section('A. 字幕置顶在所有动效卡之上')
  await seekTo(1) // c1 / c2 / s1 同时在画面上
  const order = await page.evaluate(() =>
    [...document.querySelectorAll('.os-inst')].map((el) => ({
      isSub: !!el.querySelector('.os-srt-wrap'),
      z: el.style.zIndex || '',
    })),
  )
  const firstSub = order.findIndex((o) => o.isSub)
  const lastCard = order.map((o) => o.isSub).lastIndexOf(false)
  ok('画面上同时有动效卡和字幕', firstSub >= 0 && lastCard >= 0, JSON.stringify(order))
  ok('字幕渲染在所有动效卡之后', firstSub > lastCard, `字幕首个位置 ${firstSub}，动效卡最后位置 ${lastCard}`)
  ok('字幕带明确 z-index', order.filter((o) => o.isSub).every((o) => o.z === '50'), JSON.stringify(order.map((o) => o.z)))
  ok('动效卡没有被误加 z-index', order.filter((o) => !o.isSub).every((o) => o.z === ''), JSON.stringify(order.map((o) => o.z)))

  // ── B. 统一样式：逐句在画布上实测
  section('B. 统一样式覆盖每句自带的旧参数（全局 60px / #ffd166）')
  const seen = []
  for (const [t, want] of [[1, '第一句字幕'], [3, '第二句字幕'], [5, '第三句字幕']]) {
    await seekTo(t)
    const s = await barStyle()
    if (!s) { ok(`第 ${t}s 有字幕`, false, '画布上没找到字幕'); continue }
    seen.push(s)
    ok(`${t}s：文案是「${want}」`, s.text === want, s.text)
  }
  ok('三句字号统一为 60px（不是各自的 30/50/70）', seen.every((s) => s.fontSize === '60px'), JSON.stringify(seen.map((s) => s.fontSize)))
  ok('三句文字色统一', seen.every((s) => s.color === 'rgb(255, 209, 102)'), JSON.stringify(seen.map((s) => s.color)))
  ok('三句都有背景条', seen.every((s) => s.background !== 'rgba(0, 0, 0, 0)'), JSON.stringify(seen.map((s) => s.background)))

  // ── C. 面板改一处，整片同步
  section('C. 面板改一处，整片同步')
  await pickSubtitle(2)
  ok('选中字幕后出现「字幕统一样式」分区', (await page.locator('[data-sub-style]').count()) >= 4)

  await page.locator('[data-sub-style="fontSize"] input[type=range]').fill('32')
  await page.waitForTimeout(300)
  let p = await readProject()
  ok('改字号 → 全局样式同步', p.subtitleStyle.fontSize === 32, String(p.subtitleStyle.fontSize))
  ok('改字号不会去改每一张卡', p.instances.filter((i) => i.effectId === 'srt-subtitle').every((i) => i.params.fontSize !== 32), '字幕卡仍保留各自旧值（符合预期，渲染时以全局为准）')

  await seekTo(3)
  const afterSize = await barStyle()
  ok('画布上字号跟着变成 32px', afterSize && afterSize.fontSize === '32px', afterSize && afterSize.fontSize)

  await page.locator('[data-sub-style="box"] .os-switch, [data-sub-style="box"] button').first().click()
  await page.waitForTimeout(300)
  p = await readProject()
  ok('关掉背景条 → box 变 false', p.subtitleStyle.box === false, String(p.subtitleStyle.box))
  await seekTo(5)
  const afterBox = await barStyle()
  ok('画布上背景条消失', afterBox && afterBox.background === 'rgba(0, 0, 0, 0)', afterBox && afterBox.background)

  await page.locator('[data-sub-style="box"] .os-switch, [data-sub-style="box"] button').first().click()
  await page.waitForTimeout(300)
  p = await readProject()
  ok('再打开背景条 → box 变 true', p.subtitleStyle.box === true, String(p.subtitleStyle.box))

  await page.locator('[data-sub-style="slot"] button', { hasText: '顶部' }).click()
  await page.waitForTimeout(300)
  p = await readProject()
  ok('切到顶部 → 全局 slot 变 top', p.subtitleStyle.slot === 'top', p.subtitleStyle.slot)
  await seekTo(1)
  const topPos = await page.evaluate(() => {
    const el = document.querySelector('.os-inst')
    const sub = [...document.querySelectorAll('.os-inst')].find((e) => e.querySelector('.os-srt-wrap'))
    if (!sub) return null
    return { top: sub.style.top, transform: sub.style.transform }
  })
  // 贴顶 = 从内容区顶部往下 BOTTOM_MARGIN，且不做纵向回拉（translate 的 Y 为 0）
  ok(
    '字幕贴到画面上方',
    !!topPos && /translate\(-50%,\s*0(px)?\)/.test(topPos.transform),
    JSON.stringify(topPos),
  )

  // ── D. 文案不联动
  section('D. 文案仍然各自独立')
  await pickSubtitle(2)
  const texts = await page.evaluate(() => {
    const areas = [...document.querySelectorAll('.os-param-row textarea')]
    return areas.length
  })
  ok('内容区只剩「本句文案」一个输入框', texts === 1, `实际 ${texts} 个 textarea`)
  await page.locator('.os-param-row textarea').first().fill('改过的第二句')
  await page.waitForTimeout(400)
  p = await readProject()
  const subs = p.instances.filter((i) => i.effectId === 'srt-subtitle')
  ok('只有第 2 句文案变了', subs[1].params.text === '改过的第二句' && subs[0].params.text === '第一句字幕' && subs[2].params.text === '第三句字幕',
    JSON.stringify(subs.map((s) => s.params.text)))
  ok('改文案不影响全局样式', p.subtitleStyle.fontSize === 32 && p.subtitleStyle.slot === 'top')

  // ── E. 切位置收回被拖开的字幕
  section('E. 切换全局位置时收回自由定位的字幕')
  const dragged = JSON.parse(JSON.stringify(project))
  dragged.instances = dragged.instances.map((i) =>
    i.id === 's2' ? { ...i, free: true, x: 300, y: 900 } : i,
  )
  await page.evaluate((pp) => localStorage.setItem('animation-editor-project-v1', JSON.stringify(pp)), dragged)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1200)
  p = await readProject()
  ok('载入时第 2 句是被自由拖动过的', p.instances.find((i) => i.id === 's2').free === true)
  await pickSubtitle(2)
  await page.locator('[data-sub-style="slot"] button', { hasText: '底部' }).click()
  await page.waitForTimeout(400)
  p = await readProject()
  const s2 = p.instances.find((i) => i.id === 's2')
  ok('切位置后自由定位被收回', s2.free === undefined && s2.x === undefined, JSON.stringify({ free: s2.free, x: s2.x }))

  // ── F. 旧工程迁移
  section('F. 旧工程（没有 subtitleStyle 字段）迁移')
  const legacy = JSON.parse(JSON.stringify(project))
  delete legacy.subtitleStyle
  legacy.instances = [mkSub('s1', '第一句字幕', 0, 30), mkSub('s2', '第二句字幕', 2, 50)]
  await page.evaluate((pp) => localStorage.setItem('animation-editor-project-v1', JSON.stringify(pp)), legacy)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1200)
  p = await readProject()
  ok('自动生成 subtitleStyle', !!p.subtitleStyle, JSON.stringify(p.subtitleStyle))
  ok('沿用第一句的字号（30）', p.subtitleStyle && p.subtitleStyle.fontSize === 30, String(p.subtitleStyle && p.subtitleStyle.fontSize))
  ok('位置默认底部', p.subtitleStyle && p.subtitleStyle.slot === 'bottom', String(p.subtitleStyle && p.subtitleStyle.slot))

  ok('无页面报错', errors.length === 0, errors.slice(0, 2).join(' | '))
  await page.close()
  browser.close().catch(() => undefined)
}

main()
  .then(() => {
    console.log('\n' + '─'.repeat(48))
    console.log(failed === 0 ? `全部通过：${passed} 项` : `通过 ${passed} 项，失败 ${failed} 项`)
    return new Promise((r) => process.stdout.write('', r))
  })
  .then(() => process.exit(failed === 0 ? 0 : 1))
  .catch((e) => {
    console.log('\n执行出错：', e && e.message ? e.message : e)
    process.exit(1)
  })

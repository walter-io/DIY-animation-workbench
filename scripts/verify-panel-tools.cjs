/**
 * 端到端验证（需要 dev server 先跑起来，且必须绑 IPv4）：
 *
 *   npx vite --port 5188 --strictPort --host 127.0.0.1
 *   node scripts/verify-panel-tools.cjs
 *
 * A. 重置本卡
 *    - 参数回到动效出厂值，外观覆盖（尺寸/自由定位/着色/本卡透明度）全部清掉
 *    - 时间轴位置（起点、时长、槽位、段落）保持不变
 *    - 重置可撤销
 *
 * B. 更换特效下拉框
 *    - 展开后搜索框自动聚焦，输入关键词能筛出目标动效
 *    - 回车 / 点击都能选中并关闭面板
 *    - 无匹配时有空态提示，Esc 与点击外部都能关闭
 *
 * C. 动效库搜索框固定
 *    - 搜索框不在滚动容器内
 *    - 列表滚到底部时搜索框的视口位置不动
 */
const { chromium } = require('playwright')

const BASE = process.env.VERIFY_BASE || 'http://127.0.0.1:5188'
const STORAGE_KEY = 'animation-editor-project-v1'

let passed = 0
let failed = 0
function ok(name, cond, detail) {
  if (cond) {
    passed++
    console.log(`  ✓ ${name}`)
  } else {
    failed++
    console.log(`  ✗ ${name}${detail !== undefined ? ` — ${detail}` : ''}`)
  }
}
function section(t) {
  console.log(`\n${t}`)
}

const DEFAULT_HOST = {
  layout: 'off',
  x: 1384,
  y: 754,
  w: 480,
  h: 270,
  circular: false,
  radius: 24,
  focalX: 50,
  focalY: 50,
  zoom: 1,
  mirror: false,
  borderWidth: 4,
  borderColor: '#ffffff',
  shadow: true,
}

/** 一张被改得面目全非的卡：参数、尺寸、自由定位、着色、本卡透明度全都有自定义值 */
const DIRTY_CARD = {
  id: 'card_1',
  effectId: 'bullet-list',
  name: '要点清单卡',
  start: 2.5,
  duration: 4,
  slot: 'left',
  seg: '第一章',
  fit: 'box',
  w: 300,
  h: 200,
  baseW: 640,
  baseH: 360,
  autoFit: false,
  free: true,
  x: 111,
  y: 222,
  contentScale: 1.5,
  cardOpacity: 0.9,
  paint: [{ id: 'p1', text: '要点', prop: 'color', color: '#ff0000' }],
  params: { title: '改过的标题', items: 'A\nB' },
}

const project = {
  name: 'panel-tools',
  skin: 'dark',
  style: 'glass',
  font: 'sans',
  palette: { accent: '#5ac8fa', data: '#5ac8fa', special: '#ffd166' },
  host: { ...DEFAULT_HOST },
  hostClips: [],
  cardOpacity: 0.35,
  cardOpacityV2: true,
  fps: 30,
  duration: 12,
  layout: 'edit',
  presets: [],
  instances: [DIRTY_CARD],
}

async function partA(browser) {
  section('A. 重置本卡（参数与外观回默认，时间轴位置不动）')
  const page = await browser.newPage({ viewport: { width: 1680, height: 950 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('console.error: ' + m.text())
  })

  const readProject = () =>
    page.evaluate((k) => JSON.parse(localStorage.getItem(k) || 'null'), STORAGE_KEY)

  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.evaluate((p) => localStorage.setItem('animation-editor-project-v1', JSON.stringify(p)), project)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1000)

  // 点时间轴上的片段选中这张卡
  await page.click('.os-tracks .os-clip')
  await page.waitForTimeout(300)

  let inst = (await readProject()).instances[0]
  ok('面板里能看到「重置本卡」按钮', (await page.locator('.os-btn-reset').count()) === 1)
  ok(
    '按钮说明写清了保留时间轴位置',
    /保留它在时间轴上的起点/.test((await page.locator('.os-btn-reset').getAttribute('title')) || ''),
    await page.locator('.os-btn-reset').getAttribute('title'),
  )

  await page.click('.os-btn-reset')
  await page.waitForTimeout(400)

  inst = (await readProject()).instances[0]
  ok('内容参数回到动效出厂值', inst.params.title === '三个要点', `实际 ${inst.params.title}`)
  ok('多行参数也一起回默认', inst.params.items === '第一点\n第二点\n第三点', JSON.stringify(inst.params.items))
  ok('本卡背景透明度被清掉（回到跟随工程）', inst.cardOpacity === undefined, String(inst.cardOpacity))
  ok('局部着色被清空', Array.isArray(inst.paint) && inst.paint.length === 0, JSON.stringify(inst.paint))
  ok('尺寸模式回到内容自适应', inst.fit === 'auto', String(inst.fit))
  ok('自定义宽高被清掉', inst.w === undefined && inst.h === undefined, `${inst.w}/${inst.h}`)
  ok('缩放基准被清掉', inst.baseW === undefined && inst.baseH === undefined, `${inst.baseW}/${inst.baseH}`)
  ok('自由定位被关掉', inst.free === undefined, String(inst.free))
  ok('自由坐标被清掉', inst.x === undefined && inst.y === undefined, `${inst.x}/${inst.y}`)
  ok('文字比例回到 100%', inst.contentScale === undefined, String(inst.contentScale))

  ok('起点不变', inst.start === 2.5, String(inst.start))
  ok('时长不变', inst.duration === 4, String(inst.duration))
  ok('槽位不变', inst.slot === 'left', String(inst.slot))
  ok('段落分组不变', inst.seg === '第一章', String(inst.seg))
  ok('动效类型不变', inst.effectId === 'bullet-list', inst.effectId)

  // 撤销应当把改过的参数找回来
  await page.keyboard.press('Control+z')
  await page.waitForTimeout(400)
  inst = (await readProject()).instances[0]
  ok('重置可撤销（标题回来了）', inst.params.title === '改过的标题', `实际 ${inst.params.title}`)
  ok('撤销后本卡透明度也回来了', inst.cardOpacity === 0.9, String(inst.cardOpacity))

  ok('无页面报错', errors.length === 0, errors.slice(0, 2).join(' | '))
  await page.close()
}

async function partB(browser) {
  section('B. 更换特效下拉框（带搜索框）')
  const page = await browser.newPage({ viewport: { width: 1680, height: 950 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('console.error: ' + m.text())
  })

  const readProject = () =>
    page.evaluate((k) => JSON.parse(localStorage.getItem(k) || 'null'), STORAGE_KEY)

  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.evaluate((p) => localStorage.setItem('animation-editor-project-v1', JSON.stringify(p)), project)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1000)
  await page.click('.os-tracks .os-clip')
  await page.waitForTimeout(300)

  ok('更换特效不再是原生 select', (await page.locator('.os-param-row select').count()) === 0)
  ok('换成了自定义下拉框', (await page.locator('.os-effsel-btn').count()) === 1)

  const total = await page.evaluate(async () => {
    document.querySelector('.os-effsel-btn').click()
    await new Promise((r) => setTimeout(r, 200))
    return document.querySelectorAll('.os-effsel-opt').length
  })
  ok('展开后列出全部动效', total > 20, `实际 ${total} 项`)
  ok('弹出层里有搜索框', (await page.locator('.os-effsel-search').count()) === 1)
  ok(
    '搜索框自动获得焦点',
    await page.evaluate(() => document.activeElement === document.querySelector('.os-effsel-search')),
  )

  // 搜一个确定只命中少量的词
  await page.fill('.os-effsel-search', '要点清单')
  await page.waitForTimeout(250)
  const hits = await page.evaluate(() =>
    [...document.querySelectorAll('.os-effsel-opt')].map((el) => el.dataset.effectId),
  )
  ok('搜索能筛出目标动效', hits.includes('bullet-list'), JSON.stringify(hits))
  ok('筛掉不相关的动效', hits.length < total, `${hits.length} / ${total}`)
  ok(
    '筛出的每一项都命中关键词',
    await page.evaluate(() =>
      [...document.querySelectorAll('.os-effsel-opt')].every((el) =>
        (el.textContent || '').includes('要点清单'),
      ),
    ),
  )

  const cursorId = () =>
    page.evaluate(
      () => document.querySelector('.os-effsel-opt.is-cursor')?.dataset.effectId ?? null,
    )
  ok('高亮默认落在第一条命中项', (await cursorId()) === 'bullet-list', String(await cursorId()))
  await page.keyboard.press('ArrowDown')
  await page.waitForTimeout(150)
  const moved = await cursorId()
  ok('下方向键能把高亮移到下一条', moved !== 'bullet-list', String(moved))
  await page.keyboard.press('ArrowUp')
  await page.waitForTimeout(150)
  ok('上方向键能把高亮移回来', (await cursorId()) === 'bullet-list', String(await cursorId()))

  // 回车选中高亮项
  await page.keyboard.press('Enter')
  await page.waitForTimeout(400)
  ok('回车后弹出层关闭', (await page.locator('.os-effsel-pop').count()) === 0)
  ok(
    '回车选中的是高亮那一项',
    (await readProject()).instances[0].effectId === 'bullet-list',
    (await readProject()).instances[0].effectId,
  )

  // 无匹配空态
  await page.click('.os-effsel-btn')
  await page.waitForTimeout(200)
  await page.fill('.os-effsel-search', 'zzz不存在的动效zzz')
  await page.waitForTimeout(250)
  ok('无匹配时给出空态提示', (await page.locator('.os-effsel-empty').count()) === 1)
  ok('无匹配时列表为空', (await page.locator('.os-effsel-opt').count()) === 0)

  // Esc 关闭
  await page.keyboard.press('Escape')
  await page.waitForTimeout(250)
  ok('Esc 能关闭弹出层', (await page.locator('.os-effsel-pop').count()) === 0)

  // 点击外部关闭
  await page.click('.os-effsel-btn')
  await page.waitForTimeout(200)
  ok('重新展开成功', (await page.locator('.os-effsel-pop').count()) === 1)
  await page.mouse.click(840, 500)
  await page.waitForTimeout(250)
  ok('点击外部能关闭弹出层', (await page.locator('.os-effsel-pop').count()) === 0)

  // 点击也能选中
  await page.click('.os-effsel-btn')
  await page.waitForTimeout(200)
  await page.fill('.os-effsel-search', '标签行卡')
  await page.waitForTimeout(250)
  const clickable = await page.locator('.os-effsel-opt[data-effect-id="label-row"]').count()
  ok('能定位到「标签行卡」选项', clickable === 1, `实际 ${clickable}`)
  if (clickable === 1) {
    await page.click('.os-effsel-opt[data-effect-id="label-row"]')
    await page.waitForTimeout(400)
    ok(
      '点击后卡片换成标签行卡',
      (await readProject()).instances[0].effectId === 'label-row',
      (await readProject()).instances[0].effectId,
    )
    ok('点击后弹出层关闭', (await page.locator('.os-effsel-pop').count()) === 0)
    ok(
      '按钮上显示的是当前动效名',
      (await page.locator('.os-effsel-value').textContent()) === '标签行卡',
      await page.locator('.os-effsel-value').textContent(),
    )
  }

  ok('无页面报错', errors.length === 0, errors.slice(0, 2).join(' | '))
  await page.close()
}

async function partC(browser) {
  section('C. 动效库搜索框固定（不随列表滚动）')
  const page = await browser.newPage({ viewport: { width: 1680, height: 950 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('console.error: ' + m.text())
  })

  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1200)

  ok('搜索框存在', (await page.locator('.os-lib-search').count()) === 1)
  ok(
    '搜索框不在滚动容器内部',
    await page.evaluate(() => {
      const el = document.querySelector('.os-lib-search')
      return !!el && el.closest('.os-panel-body') === null
    }),
  )
  ok(
    '搜索框在独立的固定条里',
    await page.evaluate(() => !!document.querySelector('.os-lib-searchbar .os-lib-search')),
  )

  const before = await page.evaluate(() => document.querySelector('.os-lib-search').getBoundingClientRect().top)
  const scrolled = await page.evaluate(async () => {
    const body = document.querySelector('.os-panel-left .os-panel-body')
    body.scrollTop = 1200
    await new Promise((r) => setTimeout(r, 300))
    return { top: body.scrollTop, max: body.scrollHeight - body.clientHeight }
  })
  ok('列表确实滚动了', scrolled.top > 100, JSON.stringify(scrolled))

  const after = await page.evaluate(() => document.querySelector('.os-lib-search').getBoundingClientRect().top)
  ok('滚动后搜索框位置纹丝不动', Math.abs(after - before) < 1, `${before} → ${after}`)

  // 搜索功能本身没被结构改动破坏
  // 注意：库搜索是 name + description + category 三处一起匹配，
  // 所以「清单核对大屏」这类描述里带「要点清单」的也会被搜出来 —— 这是预期行为。
  const allCount = await page.evaluate(() => {
    document.querySelector('.os-lib-search').value = ''
    document.querySelector('.os-lib-search').dispatchEvent(new Event('input', { bubbles: true }))
    return document.querySelectorAll('.os-lib-item').length
  })
  await page.fill('.os-lib-search', '要点清单')
  await page.waitForTimeout(300)
  const names = await page.evaluate(() =>
    [...document.querySelectorAll('.os-lib-item .os-lib-name')].map((el) => el.textContent || ''),
  )
  ok('搜索仍然有效（目标卡在结果里）', names.some((n) => n.includes('要点清单卡')), JSON.stringify(names))
  ok('搜索确实筛掉了大部分卡', names.length > 0 && names.length < allCount, `${names.length} / ${allCount}`)

  ok('无页面报错', errors.length === 0, errors.slice(0, 2).join(' | '))
  await page.close()
}

;(async () => {
  const browser = await chromium.launch()
  try {
    await partA(browser)
    await partB(browser)
    await partC(browser)
  } catch (e) {
    failed++
    console.log('\n执行出错：', e && e.message ? e.message : e)
  }
  console.log('\n' + '─'.repeat(48))
  console.log(failed === 0 ? `全部通过：${passed} 项` : `通过 ${passed} 项，失败 ${failed} 项`)
  // 必须等 stdout 冲刷完再退出，否则 process.exit 会把输出截掉
  await new Promise((r) => process.stdout.write('', r))
  process.exit(failed === 0 ? 0 : 1)
  // 注意：不要 await browser.close()，某些环境下它不返回会挂住脚本
})()

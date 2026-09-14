/**
 * 换动效后尺寸跟着变的验证（需要 dev server 绑 IPv4）：
 *
 *   npx vite --port 5188 --strictPort --host 127.0.0.1
 *   npm run verify:replace
 *
 * 替换动效时，宽高 / 缩放基准 / 文字比例 / 尺寸模式都要回到新动效的默认值，
 * 不能沿用上一张卡量出来的尺寸 —— 否则换了动效画面还是旧的那套。
 * 判据：替换后的卡，尺寸字段与「直接从库里新增一张同动效的卡」完全一致。
 */
const { chromium } = require('playwright')

const BASE = process.env.VERIFY_BASE || 'http://127.0.0.1:5188'
const KEY = 'animation-editor-project-v1'

const DEFAULT_HOST = {
  layout: 'off', x: 1384, y: 754, w: 480, h: 270, circular: false, radius: 24,
  focalX: 50, focalY: 50, zoom: 1, mirror: false, borderWidth: 4,
  borderColor: '#ffffff', shadow: true,
}

/** 尺寸相关的字段：判定时只比这些 */
const SIZE_KEYS = ['fit', 'autoFit', 'w', 'h', 'baseW', 'baseH', 'contentScale']

/** 一张被手动量过尺寸的"内容自适应"卡：自定义宽高 + 缩放基准 + 文字比例 + 自由定位 */
const cardA = {
  id: 'cardA',
  effectId: 'bullet-list',
  name: '要点清单卡',
  start: 0,
  duration: 4,
  slot: 'left',
  fit: 'box',
  w: 900,
  h: 700,
  baseW: 640,
  baseH: 360,
  autoFit: false,
  contentScale: 1.6,
  free: true,
  x: 200,
  y: 150,
  paint: [{ id: 'p1', text: '要点', prop: 'color', color: '#ff0000', path: [1, 1] }],
  params: { title: '标题', items: '一\n二\n三' },
}

/** 一张铺满画布的卡 */
const cardB = {
  id: 'cardB',
  effectId: 'big-title',
  name: '大标题卡',
  start: 0,
  duration: 4,
  slot: 'center',
  fit: 'full',
  params: {},
}

const mkProject = (instances) => ({
  name: 'replace-size', skin: 'dark', style: 'glass', font: 'sans',
  palette: { accent: '#5ac8fa', data: '#5ac8fa', special: '#ffd166' },
  host: { ...DEFAULT_HOST }, hostClips: [],
  subtitleStyle: { fontSize: 44, align: 'center', color: '#ffffff', box: true, bg: 'rgba(0,0,0,0.55)', slot: 'bottom' },
  cardOpacity: 0.35, cardOpacityV2: true,
  fps: 30, duration: 8, layout: 'edit', presets: [],
  instances,
})

let passed = 0
let failed = 0
function ok(name, cond, detail) {
  if (cond) { passed++; console.log(`  ✓ ${name}`) }
  else { failed++; console.log(`  ✗ ${name}${detail !== undefined ? ` — ${detail}` : ''}`) }
}
function section(t) { console.log(`\n${t}`) }

const pick = (obj, keys) => keys.map((k) => `${k}=${obj ? obj[k] : undefined}`).join(' ')

async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1680, height: 950 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()) })

  const readProject = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || 'null'), KEY)
  const load = async (instances) => {
    await page.evaluate((p) => localStorage.setItem('animation-editor-project-v1', JSON.stringify(p)), mkProject(instances))
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1300)
    // 诊断：store 有个 effect 会在 project 变化时把 state 写回 localStorage，
    // 若它在我 setItem 之后才跑，就会把刚注入的工程覆盖掉。
    const n = await page.evaluate(
      () => (JSON.parse(localStorage.getItem('animation-editor-project-v1') || '{}').instances || []).length,
    )
    if (n !== instances.length) {
      console.log(`  [诊断] 期望 ${instances.length} 张卡，重载后 localStorage 里是 ${n} 张`)
    }
    return n
  }
  const select = async (id) => {
    const sel = `.os-tracks .os-clip[data-inst-id="${id}"]`
    try {
      // 片段是布局算完才渲染的，显式等它出现比死等固定毫秒稳
      await page.locator(sel).waitFor({ state: 'visible', timeout: 10000 })
    } catch {
      const dump = await page.evaluate(() =>
        [...document.querySelectorAll('.os-clip')].map((el) => el.getAttribute('data-inst-id')),
      )
      throw new Error(`时间轴上找不到 ${id}，现有片段：${JSON.stringify(dump)}`)
    }
    await page.locator(sel).click()
    await page.waitForTimeout(300)
  }
  /** 用「更换特效」下拉框把当前选中的卡换成目标动效 */
  const replaceWith = async (effectId) => {
    await page.click('.os-effsel-btn')
    await page.waitForTimeout(200)
    const name = await page.evaluate((id) => {
      const def = document.querySelector(`.os-effsel-opt[data-effect-id="${id}"]`)
      return def ? def.querySelector('.os-effsel-opt-name').textContent : null
    }, effectId)
    if (!name) return false
    await page.fill('.os-effsel-search', name)
    await page.waitForTimeout(250)
    await page.click(`.os-effsel-opt[data-effect-id="${effectId}"]`)
    await page.waitForTimeout(400)
    return true
  }
  /**
   * 从库里新增一张卡，作为「默认尺寸」的基准。
   * 注意：动效库的搜索只匹配名称 / 描述 / 分类，不匹配英文 id，所以要传中文名。
   */
  const addCard = async (name) => {
    await page.fill('.os-lib-search', name)
    await page.waitForTimeout(350)
    const hit = await page.evaluate(() => {
      const item = document.querySelector('.os-lib-item')
      if (!item) return null
      const id = item.getAttribute('data-effect-id')
      const btn = item.querySelector('.os-lib-act-add')
      if (!id || !btn) return null
      btn.click()
      return id
    })
    await page.waitForTimeout(400)
    await page.fill('.os-lib-search', '')
    await page.waitForTimeout(150)
    return hit
  }

  await page.goto(BASE, { waitUntil: 'domcontentloaded' })

  // ── 基准：从库里直接新增一张 bullet-list，记下它的默认尺寸
  await load([])
  const added = await addCard('要点清单卡')
  ok('能从动效库新增一张卡', added === 'bullet-list', String(added))
  let p = await readProject()
  const freshAuto = p.instances.find((i) => i.effectId === 'bullet-list')
  console.log(`  基准（新增的 bullet-list）：${pick(freshAuto, SIZE_KEYS)}`)

  // ── A. 自定义尺寸卡 → 换成另一种内容自适应卡
  section('A. 自定义尺寸卡换成内容自适应卡')
  await load([cardA])
  await select('cardA')
  ok('替换前是自定义尺寸（box 900×700 / 比例 1.6）', (await readProject()).instances[0].w === 900)
  ok('成功换成要点清单卡', await replaceWith('bullet-list'))
  p = await readProject()
  const a = p.instances[0]
  console.log(`  替换后：${pick(a, SIZE_KEYS)}`)
  for (const k of SIZE_KEYS) {
    ok(`尺寸字段 ${k} 与「新增卡」一致`, a[k] === freshAuto[k], `${a[k]} vs ${freshAuto[k]}`)
  }
  ok('保留起点 / 时长 / 槽位', a.start === 0 && a.slot === 'left', JSON.stringify({ start: a.start, slot: a.slot }))
  ok('保留局部着色（不属于尺寸）', Array.isArray(a.paint) && a.paint.length === 1, JSON.stringify(a.paint))

  // ── B. 换成铺满画布的卡
  section('B. 换成铺满画布的卡（big-title）')
  await load([cardA])
  await select('cardA')
  await replaceWith('big-title')
  p = await readProject()
  const b = p.instances[0]
  console.log(`  替换后：${pick(b, SIZE_KEYS)}  free=${b.free} x=${b.x} y=${b.y}`)
  ok('尺寸模式变成铺满画布', b.fit === 'full', String(b.fit))
  ok('宽高不再沿用 900×700', b.w === undefined && b.h === undefined, `${b.w}/${b.h}`)
  ok('缩放基准被清掉', b.baseW === undefined && b.baseH === undefined, `${b.baseW}/${b.baseH}`)
  ok('文字比例回到默认', b.contentScale === undefined, String(b.contentScale))
  ok('铺满画布的卡不接受自由定位', b.free === false && b.x === undefined && b.y === undefined, JSON.stringify({ free: b.free, x: b.x, y: b.y }))

  // ── C. 铺满画布的卡 → 换回内容自适应卡
  section('C. 铺满画布的卡换回内容自适应卡')
  await load([cardB])
  await select('cardB')
  ok('替换前是铺满画布', (await readProject()).instances[0].fit === 'full')
  await replaceWith('bullet-list')
  p = await readProject()
  const c = p.instances[0]
  console.log(`  替换后：${pick(c, SIZE_KEYS)}`)
  for (const k of SIZE_KEYS) {
    ok(`尺寸字段 ${k} 与「新增卡」一致`, c[k] === freshAuto[k], `${c[k]} vs ${freshAuto[k]}`)
  }

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

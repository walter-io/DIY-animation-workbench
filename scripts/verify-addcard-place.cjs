/**
 * 「新增动效卡落位」回归 —— 新卡不许和已有的卡叠在同一条轨道上（时段也重叠）。
 *
 *   npm run verify:addcard-place
 *
 * 背景（用户反馈）：「添加动效卡有的在同一个轨道上叠加在已有动效卡上面了」。
 * 根因：addInstance 直接写死 start = 播放头、track = 槽位默认轨道，
 * 完全不看这块地方有没有人。从库里连点几张卡（都在同一个播放头）时，
 * 第 3 张又回到「左侧 / 轨道1」，和第 1 张时段完全重合 —— 时间轴上两条卡条
 * 叠在同一行（后画的盖住先画的），画布上也是同一块地方硬压。
 *
 * 现在 pickPlacement（src/tracks.ts）按顺序挑落位：
 *   默认槽位+默认轨道 → 同槽位换空闲轨道 → 换空闲槽位 → 全占满才顺延时间。
 *
 * 断言（每个场景都会跑两条不变量）：
 *   A. 任意两张非字幕卡，不出现「同一轨道 + 时段重叠」（时间轴叠行）
 *   B. 任意两张非铺满卡，不出现「同一槽位 + 时段重叠」（画布硬压）
 * 另有 DOM 级检查：时间轴上两条卡条的矩形不许重叠（就是用户看到的样子）。
 *
 * 自包含：自己起 vite，跑完自己关。
 */
const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')
const { chromium } = require('playwright')

const PORT = 5236
const ROOT = path.resolve(__dirname, '..')
const OUT = path.join(ROOT, '_screenshots')
const KEY = 'animation-editor-project-v1'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const LANE = { left: 1, right: 2, center: 3, bottom: 4, top: 5 }
const laneOf = (i) => i.track ?? LANE[i.slot] ?? 1
const endOf = (i) => i.start + i.duration
const overlap = (a, b) => a.start < endOf(b) - 0.005 && b.start < endOf(a) - 0.005

let passed = 0
let failed = 0
function ok(name, cond, detail) {
  if (cond) {
    passed += 1
    console.log(`  ✓ ${name}`)
  } else {
    failed += 1
    console.log(`  ✗ ${name}${detail !== undefined ? ` — ${detail}` : ''}`)
  }
}
const section = (t) => console.log(`\n${t}`)

/** 手工种子卡：叠加卡（bullet-list → overlay/auto）与铺满卡（big-title → fullscreen/full） */
const overlay = (id, slot, start = 0, duration = 2) => ({
  id,
  effectId: 'bullet-list',
  name: `叠加卡${id}`,
  start,
  duration,
  slot,
  track: LANE[slot],
  fit: 'auto',
  paint: [],
  params: {},
})
const full = (id, start = 0, duration = 2) => ({
  id,
  effectId: 'big-title',
  name: `全屏卡${id}`,
  start,
  duration,
  slot: 'center',
  track: 3,
  fit: 'full',
  paint: [],
  params: {},
})

async function waitFor(url, ms = 90000) {
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

async function main() {
  const vite = spawn(
    `"${process.env.NODE_EXE || 'node'}" ./node_modules/vite/bin/vite.js --port ${PORT} --host ::1 --strictPort`,
    { cwd: ROOT, shell: true, stdio: 'ignore' },
  )
  let browser
  try {
    await waitFor(`http://localhost:${PORT}/`)
    browser = await chromium.launch()
    const page = await browser.newPage({ viewport: { width: 1680, height: 950 } })
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))

    const read = () =>
      page.evaluate((k) => JSON.parse(localStorage.getItem(k) || 'null'), KEY)

    /** 换一套种子实例：沿用 App 自己写下的工程骨架，只替换 instances（保证字段齐全） */
    const load = async (instances) => {
      await page.evaluate(
        ([k, insts]) => {
          const cur = JSON.parse(localStorage.getItem(k) || '{}')
          localStorage.setItem(k, JSON.stringify({ ...cur, instances: insts }))
        },
        [KEY, instances],
      )
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.waitForSelector('.os-lib-item', { timeout: 30000 })
      await sleep(700)
      for (let i = 0; i < 4; i += 1) {
        const vis = await page
          .locator('.os-modal-mask')
          .first()
          .isVisible()
          .catch(() => false)
        if (!vis) break
        await page.keyboard.press('Escape')
        await sleep(250)
      }
    }

    /** 点库里的「＋」新增一张卡，等工程写盘后返回新工程 */
    const addCard = async (effectId, expectCount) => {
      await page
        .locator(`.os-lib-item[data-effect-id="${effectId}"] .os-lib-act-add`)
        .first()
        .click()
      for (let i = 0; i < 40; i += 1) {
        const p = await read()
        if (p && p.instances.length >= expectCount) return p
        await sleep(100)
      }
      throw new Error(`新增「${effectId}」后工程实例数没变（期望 ${expectCount}）`)
    }

    /** 拖播放头到 t 秒（点标尺），返回实际落点 */
    const seekTo = async (t) => {
      const info = await page.evaluate(() => {
        const ticks = [...document.querySelectorAll('.os-tick')]
        let px = 0
        for (const el of ticks) {
          const val = parseFloat(el.querySelector('em').textContent)
          const left = parseFloat(el.style.left)
          if (val > 0 && left > 0) {
            px = left / val
            break
          }
        }
        const r = document.querySelector('.os-ruler').getBoundingClientRect()
        return { px, x: r.x, y: r.y + r.height / 2 }
      })
      if (!info.px) throw new Error('量不出时间轴缩放比例')
      await page.locator('.os-ruler').scrollIntoViewIfNeeded()
      const r2 = await page.locator('.os-ruler').boundingBox()
      await page.mouse.click(r2.x + t * info.px, r2.y + r2.height / 2)
      await sleep(250)
      const label = (await page.locator('.os-time').textContent()).trim()
      const cur = parseFloat(label.split('/')[0].trim().split(':')[1] ?? '0')
      return cur
    }

    /** 不变量 A / B */
    const checkInvariants = (label, instances) => {
      const cards = instances.filter((i) => i.effectId !== 'srt-subtitle')
      const badLane = []
      const badRegion = []
      for (let a = 0; a < cards.length; a += 1) {
        for (let b = a + 1; b < cards.length; b += 1) {
          const x = cards[a]
          const y = cards[b]
          if (!overlap(x, y)) continue
          if (laneOf(x) === laneOf(y)) {
            badLane.push(`${x.name}(轨${laneOf(x)}) × ${y.name}(轨${laneOf(y)}) @${x.start}s`)
          }
          if (x.fit !== 'full' && y.fit !== 'full' && x.slot === y.slot) {
            badRegion.push(`${x.name} × ${y.name} 都在 ${x.slot}`)
          }
        }
      }
      ok(`${label}｜没有两张卡在同一轨道叠行`, badLane.length === 0, badLane.join(' / '))
      ok(`${label}｜没有两张非铺满卡在同一槽位硬压`, badRegion.length === 0, badRegion.join(' / '))
    }

    /** DOM 级：时间轴上两条卡条的矩形不许重叠（用户看到的那个画面） */
    const domRowCollisions = () =>
      page.evaluate(() => {
        const rects = [...document.querySelectorAll('.os-clip[data-inst-id]')].map((el) => {
          const r = el.getBoundingClientRect()
          return {
            name: (el.querySelector('.os-clip-name')?.textContent ?? '').trim(),
            top: Math.round(r.top),
            left: Math.round(r.left),
            right: Math.round(r.right),
          }
        })
        const bad = []
        for (let a = 0; a < rects.length; a += 1) {
          for (let b = a + 1; b < rects.length; b += 1) {
            const x = rects[a]
            const y = rects[b]
            if (Math.abs(x.top - y.top) <= 3 && x.left < y.right - 2 && y.left < x.right - 2) {
              bad.push(`${x.name} × ${y.name}`)
            }
          }
        }
        return bad
      })

    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.os-lib-item', { timeout: 30000 })
    await sleep(900)

    // ── 0. 单张新卡：行为与过去一致（播放头处 + 默认槽位）
    section('0. 单张新卡仍然落在播放头 / 默认槽位')
    await load([])
    let p = await addCard('bullet-list', 1)
    ok('新增 1 张卡', p.instances.length === 1, String(p.instances.length))
    ok('落在播放头 0s', Math.abs(p.instances[0].start) < 0.05, String(p.instances[0].start))
    ok('默认落左侧槽位', p.instances[0].slot === 'left', p.instances[0].slot)
    ok('默认落轨道 1', laneOf(p.instances[0]) === 1, String(laneOf(p.instances[0])))

    // ── 1. 连点 5 张（全在同一播放头）：一张一条轨道，不许叠行
    section('1. 同一播放头连点 5 张卡')
    await load([])
    p = await addCard('bullet-list', 1)
    for (let n = 2; n <= 5; n += 1) p = await addCard('bullet-list', n)
    checkInvariants('连点 5 张', p.instances)
    ok(
      '5 张卡落在 5 条不同轨道',
      new Set(p.instances.map(laneOf)).size === 5,
      p.instances.map((i) => `轨${laneOf(i)}`).join(','),
    )
    ok('5 张卡都没被挪时间（仍在播放头）', p.instances.every((i) => Math.abs(i.start) < 0.05))
    ok('时间轴上卡条没有互相压住', (await domRowCollisions()).length === 0)

    fs.mkdirSync(OUT, { recursive: true })
    // 截图前把时间轴横向滚回开头，否则只拍到标尺右半边
    await page.evaluate(() => {
      const tracks = document.querySelector('.os-tracks')
      if (tracks?.parentElement) tracks.parentElement.scrollLeft = 0
    })
    await sleep(200)
    const tb = await page.locator('.os-tracks-layout').boundingBox()
    if (tb) {
      await page.screenshot({
        path: path.join(OUT, 'addcard-5tracks.png'),
        clip: { x: tb.x, y: tb.y, width: tb.width, height: tb.height },
      })
    }
    await page.screenshot({ path: path.join(OUT, 'addcard-full.png') })

    // ── 2. 播放头插在已有卡中间：新卡换轨道，时间不动
    // 这里刻意让已有卡落在「右侧」（新卡默认槽位就是右 → 旧代码必然叠上）
    section('2. 播放头停在已有卡中间再新增')
    await load([overlay('a', 'right', 0, 4)])
    const t1 = await seekTo(1)
    ok(`播放头确实停在 1s（实测 ${t1}s）`, Math.abs(t1 - 1) < 0.15, String(t1))
    p = await addCard('bullet-list', 2)
    const added = p.instances.find((i) => i.id !== 'a')
    checkInvariants('卡中间新增', p.instances)
    ok('新卡没被挪时间', Math.abs(added.start - t1) < 0.15, `${added.start} vs ${t1}`)
    ok('新卡不在已有卡的轨道上', laneOf(added) !== 2, `轨${laneOf(added)}`)
    ok('时间轴上卡条没有互相压住', (await domRowCollisions()).length === 0)

    // ── 3. 默认槽位被占：自动换一块画布地方
    section('3. 左右两块地方都有人时新增')
    await load([overlay('a', 'left', 0, 4), overlay('b', 'right', 0, 4)])
    await seekTo(1)
    p = await addCard('bullet-list', 3)
    const added3 = p.instances.find((i) => i.id !== 'a' && i.id !== 'b')
    checkInvariants('左右都有人', p.instances)
    ok('新卡躲开了左右两侧', added3.slot !== 'left' && added3.slot !== 'right', added3.slot)
    ok('新卡落在居中槽位对应的轨道 3', laneOf(added3) === 3, `轨${laneOf(added3)}`)

    // ── 4. 两张铺满卡：整屏只有一块地方，第二张顺延
    section('4. 全屏卡遇到全屏卡 → 顺延')
    await load([full('f1', 0, 4)])
    await seekTo(1)
    p = await addCard('big-title', 2)
    const f2 = p.instances.find((i) => i.id !== 'f1')
    checkInvariants('两张全屏卡', p.instances)
    ok('新全屏卡没有压在旧全屏卡上（时段错开）', !overlap(f2, p.instances[0]), `${f2.start} vs 0~4`)
    ok('顺延到旧全屏卡结尾之后', f2.start >= 4 - 0.05, String(f2.start))

    // ── 5. 全屏卡上仍可叠小卡（层级组合不被打断）
    section('5. 全屏卡上叠一张小卡')
    await load([full('f1', 0, 4)])
    const t5 = await seekTo(1)
    p = await addCard('bullet-list', 2)
    const s5 = p.instances.find((i) => i.id !== 'f1')
    checkInvariants('全屏卡 + 小卡', p.instances)
    ok('小卡仍在播放头处（不被顺延）', Math.abs(s5.start - t5) < 0.15, `${s5.start} vs ${t5}`)
    ok('小卡换到别的轨道，能压在画面上', laneOf(s5) !== 3, `轨${laneOf(s5)}`)

    // ── 6. 五条轨道全占满：才顺延时间
    section('6. 五条轨道全占满')
    await load([
      overlay('a', 'left', 0, 4),
      overlay('b', 'right', 0, 4),
      overlay('c', 'center', 0, 4),
      overlay('d', 'bottom', 0, 4),
      overlay('e', 'top', 0, 4),
    ])
    await seekTo(1)
    p = await addCard('bullet-list', 6)
    const q = p.instances.find((i) => !['a', 'b', 'c', 'd', 'e'].includes(i.id))
    checkInvariants('五轨占满', p.instances)
    ok('挤不下时顺延到空档（>= 4s）', q.start >= 4 - 0.05, String(q.start))
    ok('顺延后时间轴上仍不叠行', (await domRowCollisions()).length === 0)

    ok('无页面报错', errors.length === 0, errors.slice(0, 2).join(' | '))

    await page.close()
    browser.close().catch(() => undefined)
  } finally {
    try {
      vite.kill()
    } catch {}
    try {
      spawn('taskkill', ['/pid', String(vite.pid), '/T', '/F'], { stdio: 'ignore' })
    } catch {}
  }
  console.log('\n' + '─'.repeat(48))
  console.log(failed === 0 ? `全部通过 ✅（${passed} 项）` : `失败 ${failed} 项 ❌（通过 ${passed}）`)
  process.exit(failed === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

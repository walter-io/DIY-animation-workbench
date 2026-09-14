/** 验证：①半屏下文字垂直居中 ②内容偏移可拖动/可设置并对所有卡生效 */
const path = require('path')
const { chromium } = require('playwright')
const { spawn } = require('child_process')

const PORT = 5197
;(async () => {
  const root = path.resolve(__dirname, '..')
  const srv = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
    cwd: root, stdio: 'ignore', shell: true,
  })
  const wait = (ms) => new Promise((r) => setTimeout(r, ms))
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(`http://localhost:${PORT}/`); if (r.ok) break } catch {}
    await wait(500)
  }
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1500, height: 950 } })
  page.on('pageerror', (e) => console.log('PAGEERROR:', e.message))
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' })
  await wait(1000)
  await page.evaluate(() => {
    const k = 'animation-editor-project-v1'
    const p = JSON.parse(localStorage.getItem(k) || '{}')
    p.instances = []
    localStorage.setItem(k, JSON.stringify(p))
  })
  await page.reload({ waitUntil: 'networkidle' })
  await wait(900)
  const item = await page.$('.os-lib-item')
  if (item) await item.click()
  await wait(1000)

  const pickFit = (name) =>
    page.evaluate((n) => {
      const b = [...document.querySelectorAll('.os-seg-fit .os-seg-btn')].find((x) => x.textContent.trim() === n)
      if (!b) return false
      b.click(); return true
    }, name)

  // 所有文字叶子元素的并集中心，相对外框中心的偏移（屏幕像素）
  const textCenter = () =>
    page.evaluate(() => {
      const inst = document.querySelector('.os-inst')
      if (!inst) return null
      const ir = inst.getBoundingClientRect()
      const walker = document.createTreeWalker(inst, NodeFilter.SHOW_ELEMENT)
      let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity, n = 0
      while (walker.nextNode()) {
        const e = walker.currentNode
        if (e.children.length !== 0) continue
        if (!(e.textContent || '').trim()) continue
        // 编辑器自己的角标/手柄也是"文字"，必须排除，否则会把并集中心拉偏
        if (e.closest('.os-free-tag, .os-free-resize, .os-content-move')) continue
        const q = e.getBoundingClientRect()
        if (q.width < 2 || q.height < 2) continue
        l = Math.min(l, q.left); t = Math.min(t, q.top)
        r = Math.max(r, q.right); b = Math.max(b, q.bottom); n++
      }
      if (!n) return null
      return {
        offX: Math.round((l + r) / 2 - (ir.left + ir.width / 2)),
        offY: Math.round((t + b) / 2 - (ir.top + ir.height / 2)),
        instH: Math.round(ir.height),
        count: n,
      }
    })

  const readOffset = () =>
    page.evaluate(() => {
      try {
        const p = JSON.parse(localStorage.getItem('animation-editor-project-v1') || '{}')
        const i = (p.instances || [])[0]
        return i ? { x: i.contentOffsetX ?? 0, y: i.contentOffsetY ?? 0 } : null
      } catch { return null }
    })

  const setOffset = (x, y) =>
    page.evaluate(({ x, y }) => {
      const inputs = [...document.querySelectorAll('.os-param-row')]
        .find((r) => r.textContent.includes('内容位置'))
        ?.querySelectorAll('input[type=number]')
      if (!inputs || inputs.length < 2) return false
      const set = (el, v) => {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
        setter.call(el, String(v))
        el.dispatchEvent(new Event('input', { bubbles: true }))
      }
      set(inputs[0], x); set(inputs[1], y)
      return true
    }, { x, y })

  console.log('===== ① 半屏文字是否居中 =====')
  for (const name of ['铺满画布', '左侧半屏']) {
    await pickFit(name); await wait(800)
    const c = await textCenter()
    console.log(`${name}: 文字块中心相对外框中心 (${c.offX}, ${c.offY})  外框高 ${c.instH}  文字元素 ${c.count} 个`)
  }

  console.log('\n===== ② 参数面板设置偏移 =====')
  const okSet = await setOffset(120, -80)
  await wait(700)
  const afterSet = await readOffset()
  const transform = await page.evaluate(() => {
    const b = document.querySelector('.os-inst .os-inst-body')
    return b ? b.style.transform : null
  })
  console.log('设置入口找到:', okSet, '| 落库偏移:', JSON.stringify(afterSet), '| body transform:', transform)
  const centerAfterSet = await textCenter()
  console.log('设置后文字中心偏移:', `(${centerAfterSet.offX}, ${centerAfterSet.offY})`)

  console.log('\n===== ③ 画布拖动 ✥ 手柄 =====')
  await setOffset(0, 0)
  await wait(500)
  const handle = await page.$('.os-content-move')
  console.log('手柄存在:', !!handle)
  if (handle) {
    // 先确认这个坐标上真正命中的是谁，避免手柄被别的元素挡住
    const bb0 = await handle.boundingBox()
    console.log('手柄 bbox:', JSON.stringify(bb0))
    if (bb0) {
      const hit = await page.evaluate(({ x, y }) => {
        const el = document.elementFromPoint(x, y)
        return el ? el.className + '|' + el.tagName : 'null'
      }, { x: bb0.x + bb0.width / 2, y: bb0.y + bb0.height / 2 })
      console.log('该坐标命中的元素:', hit)
    }
    const bb = bb0
    if (bb) {
      await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2)
      await page.mouse.down()
      await page.mouse.move(bb.x + bb.width / 2 + 60, bb.y + bb.height / 2 + 40, { steps: 6 })
      await page.mouse.up()
      await wait(700)
    }
  }
  const afterDrag = await readOffset()
  console.log('拖动后偏移:', JSON.stringify(afterDrag))

  console.log('\n===== ④ 点「居中」按钮 =====')
  await setOffset(0, 0)
  await wait(500)
  const clicked = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === '居中')
    if (!b) return false
    b.click(); return true
  })
  await wait(800)
  const afterCenter = await readOffset()
  const centerAfterBtn = await textCenter()
  console.log('点到居中按钮:', clicked, '| 落库偏移:', JSON.stringify(afterCenter))
  console.log('居中后文字中心偏移:', `(${centerAfterBtn.offX}, ${centerAfterBtn.offY})`)

  console.log('\n===== 断言 =====')
  await pickFit('左侧半屏'); await wait(700)
  const half = await textCenter()
  console.log(Math.abs(half.offY) < 60 ? '✅' : '❌', `半屏文字垂直居中（offY=${half.offY}，容差60）`)
  console.log(afterSet && afterSet.x === 120 && afterSet.y === -80 ? '✅' : '❌', '参数可精确设置偏移 (120, -80)')
  console.log(transform && transform.includes('translate') ? '✅' : '❌', '偏移已作用到卡内内容 transform')
  console.log(afterDrag && (afterDrag.x !== 0 || afterDrag.y !== 0) ? '✅' : '❌', `拖动手柄可改偏移 (${JSON.stringify(afterDrag)})`)
  console.log(
    Math.abs(centerAfterBtn.offY) < 40 && Math.abs(centerAfterBtn.offX) < 40
      ? '✅'
      : '❌',
    `点「居中」后文字落在正中间 (${centerAfterBtn.offX}, ${centerAfterBtn.offY})`,
  )

  await page.screenshot({ path: path.join(root, 'scripts/_tmp/text-pos-final.png') })
  await browser.close()
  srv.kill('SIGTERM')
})()

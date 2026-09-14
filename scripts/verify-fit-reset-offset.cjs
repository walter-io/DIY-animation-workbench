/** 验证：改尺寸（fit）时，卡内内容偏移 contentOffsetX/Y 必须归零 */
const path = require('path')
const { chromium } = require('playwright')
const { spawn } = require('child_process')

const PORT = 5199
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
  // 示例卡会干扰选择器，先清空再重载
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

  const pickFit2 = async (name) => {
    const ok = await page.evaluate((n) => {
      const b = [...document.querySelectorAll('.os-seg-fit .os-seg-btn')].find((x) => x.textContent.trim() === n)
      if (!b) return false
      b.click(); return true
    }, name)
    return ok
  }

  const readOffset = () =>
    page.evaluate(() => {
      try {
        const p = JSON.parse(localStorage.getItem('animation-editor-project-v1') || '{}')
        const i = (p.instances || [])[0]
        return i ? { x: i.contentOffsetX ?? 0, y: i.contentOffsetY ?? 0, fit: i.fit ?? 'auto' } : null
      } catch { return null }
    })

  const setOffset = (x, y) =>
    page.evaluate(({ x, y }) => {
      const inputs = [...document.querySelectorAll('.os-param-row')]
        .find((r) => r.textContent.includes('内容位置'))
        ?.querySelectorAll('input[type=number]')
      if (!inputs || inputs.length < 2) return false
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
      const set = (el, v) => { setter.call(el, String(v)); el.dispatchEvent(new Event('input', { bubbles: true })) }
      set(inputs[0], x); set(inputs[1], y)
      return true
    }, { x, y })

  const bodyTransform = () =>
    page.evaluate(() => {
      const b = document.querySelector('.os-inst .os-inst-body')
      return b ? b.style.transform || '(none)' : null
    })

  const results = []
  const check = (name, ok, extra = '') => {
    results.push(ok)
    console.log(ok ? '✅' : '❌', name, extra)
  }

  // ---- ① 面板切档：先设偏移，再逐档切换，每次都应归零 ----
  console.log('===== ① 参数面板切换尺寸档 =====')
  const NAME2ID = {
    内容自适应: 'auto', 自定义: 'box', 铺满画布: 'full', 左侧半屏: 'leftHalf', 右侧半屏: 'rightHalf',
  }
  for (const name of ['铺满画布', '左侧半屏', '右侧半屏', '自定义', '内容自适应']) {
    // 若当前已在该档，点击是空操作（不算"修改尺寸"），先切到别的档制造一次真实切换
    const cur = await readOffset()
    if (cur && cur.fit === NAME2ID[name]) {
      await pickFit2(name === '内容自适应' ? '铺满画布' : '内容自适应')
      await wait(600)
    }
    await setOffset(120, -80)
    await wait(500)
    const before = await readOffset()
    const okClick = await pickFit2(name)
    await wait(700)
    const after = await readOffset()
    console.log(
      `切到「${name}」: 点击成功=${okClick} | 切换前 (${before?.x}, ${before?.y}) fit=${before?.fit} → 切换后 (${after?.x}, ${after?.y}) fit=${after?.fit}`,
    )
    check(`切到「${name}」后偏移归零`, after?.x === 0 && after?.y === 0, `→ (${after?.x}, ${after?.y})`)
  }

  // ---- ①b 点当前已选中的档（没真的改尺寸）不该清掉用户调好的位置 ----
  await pickFit2('左侧半屏')
  await wait(600)
  await setOffset(70, -45)
  await wait(500)
  await pickFit2('左侧半屏')
  await wait(600)
  const same = await readOffset()
  console.log(`重复点同一档: (${same?.x}, ${same?.y}) fit=${same?.fit}`)
  check('重复点同一档不改动偏移', same?.x === 70 && same?.y === -45, `→ (${same?.x}, ${same?.y})`)

  // ---- ② 归零后 transform 也应消失 ----
  console.log('\n===== ② transform 是否同步清掉 =====')
  await setOffset(90, 60)
  await wait(500)
  const tfBefore = await bodyTransform()
  await pickFit2('铺满画布')
  await wait(700)
  const tfAfter = await bodyTransform()
  console.log(`切换前 transform="${tfBefore}" → 切换后 transform="${tfAfter}"`)
  check('偏移归零后卡内内容不再有 translate', !String(tfAfter).includes('translate'))
  check('设置偏移时确实有 translate', String(tfBefore).includes('translate'))

  // ---- ③ 画布拖 resizer（auto → box）也应归零 ----
  console.log('\n===== ③ 画布拖 resizer 改尺寸 =====')
  await pickFit2('内容自适应')
  await wait(600)
  await setOffset(100, 100)
  await wait(500)
  const beforeResize = await readOffset()
  const handle = await page.$('.os-free-resize')
  console.log('resizer 手柄存在:', !!handle)
  if (handle) {
    const bb = await handle.boundingBox()
    if (bb) {
      await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2)
      await page.mouse.down()
      await page.mouse.move(bb.x + bb.width / 2 + 50, bb.y + bb.height / 2 + 30, { steps: 6 })
      await page.mouse.up()
      await wait(700)
    }
  }
  const afterResize = await readOffset()
  console.log(`拖拽前 (${beforeResize?.x}, ${beforeResize?.y}) fit=${beforeResize?.fit} → 拖拽后 (${afterResize?.x}, ${afterResize?.y}) fit=${afterResize?.fit}`)
  check(
    '画布拖 resizer 切到自定义尺寸后偏移归零',
    afterResize?.x === 0 && afterResize?.y === 0,
    `→ (${afterResize?.x}, ${afterResize?.y})`,
  )

  // ---- ④ 同档内继续改宽高不该把用户调好的偏移清掉 ----
  console.log('\n===== ④ 同一档内改宽高保留偏移 =====')
  await setOffset(60, -30)
  await wait(500)
  const beforeW = await readOffset()
  const okW = await page.evaluate(() => {
    const lab = [...document.querySelectorAll('label.os-field')].find((l) => /^\s*宽\s/.test(l.textContent || ''))
    const inp = lab?.querySelector('input[type=range]')
    if (!inp) return false
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    setter.call(inp, String(Number(inp.value || 600) + 40))
    inp.dispatchEvent(new Event('input', { bubbles: true }))
    return true
  })
  await wait(600)
  const afterW = await readOffset()
  console.log(`改宽度入口=${okW} | 改前 (${beforeW?.x}, ${beforeW?.y}) → 改后 (${afterW?.x}, ${afterW?.y})`)
  check('同一档内只改宽高时偏移保留', afterW?.x === 60 && afterW?.y === -30, `→ (${afterW?.x}, ${afterW?.y})`)

  console.log('\n===== 汇总 =====')
  const pass = results.filter(Boolean).length
  console.log(`${pass}/${results.length} 项通过`)
  await page.screenshot({ path: path.join(root, 'scripts/_tmp/fit-reset-offset.png') })
  await browser.close()
  srv.kill('SIGTERM')
  process.exit(pass === results.length ? 0 : 1)
})()

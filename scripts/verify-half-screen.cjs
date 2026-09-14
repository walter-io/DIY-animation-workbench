const path = require('path')
const { chromium } = require('playwright')
const { spawn } = require('child_process')
;(async () => {
  const root = path.resolve(__dirname, '..')
  const port = 5191
  const srv = spawn('npx', ['vite', '--port', String(port), '--strictPort'], {
    cwd: root,
    stdio: 'ignore',
    shell: true,
  })
  const wait = (ms) => new Promise((r) => setTimeout(r, ms))
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://localhost:${port}/`)
      if (res.ok) break
    } catch {}
    await wait(500)
  }

  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1500, height: 950 } })
  page.on('pageerror', (e) => console.log('PAGEERROR:', e.message))
  page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE-ERR:', m.text().slice(0, 200)) })
  await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle' })
  await wait(900)

  // 0) 清空工程里的卡，保证加完之后画布上只有一张，测量不会串到旧卡
  await page.evaluate(() => {
    const k = 'animation-editor-project-v1'
    const p = JSON.parse(localStorage.getItem(k) || '{}')
    p.instances = []
    localStorage.setItem(k, JSON.stringify(p))
  })
  await page.reload({ waitUntil: 'networkidle' })
  await wait(900)

  // 1) 加一张卡
  const item = await page.$('.os-lib-item')
  if (!item) { console.log('FAIL: 找不到动效库项'); await browser.close(); srv.kill('SIGTERM'); return }
  await item.click()
  await wait(900)

  const inst = await page.$('.os-inst')
  if (!inst) { console.log('FAIL: 卡没加到画布'); await browser.close(); srv.kill('SIGTERM'); return }

  // 尺寸行的按钮
  const fitBtns = await page.$$eval('.os-seg-fit .os-seg-btn', (bs) => bs.map((b) => b.textContent.trim()))
  console.log('尺寸选项:', fitBtns.join(' | '))

  async function pickFit(name) {
    return page.evaluate((n) => {
      const btns = [...document.querySelectorAll('.os-seg-fit .os-seg-btn')]
      const b = btns.find((x) => x.textContent.trim() === n)
      if (!b) return false
      b.click()
      return true
    }, name)
  }

  async function measure() {
    return page.evaluate(() => {
      const c = document.querySelector('.os-canvas')
      const i = document.querySelector('.os-inst')
      if (!c || !i) return null
      const cr = c.getBoundingClientRect()
      const ir = i.getBoundingClientRect()
      return {
        canvas: { left: Math.round(cr.left), width: Math.round(cr.width) },
        inst: { left: Math.round(ir.left), width: Math.round(ir.width), height: Math.round(ir.height) },
        relLeft: Math.round(ir.left - cr.left),
        relWidth: Math.round(ir.width),
        ratio: +(ir.width / cr.width).toFixed(3),
        cls: i.className,
      }
    })
  }

  // 调试：有几个 .os-seg-fit，点击前后 instance.fit 是否变化
  console.log('.os-seg-fit 数量:', await page.$$eval('.os-seg-fit', (a) => a.length))
  const readFit = () => page.evaluate(() => {
    try {
      const p = JSON.parse(localStorage.getItem('animation-editor-project-v1') || '{}')
      const i = (p.instances || [])[0]
      return i ? { fit: i.fit, w: i.w, h: i.h, free: i.free } : null
    } catch (e) { return 'ERR ' + e.message }
  })
  console.log('点击前 instance:', JSON.stringify(await readFit()))

  const results = {}
  // 对照：先点「铺满画布」，验证点击链路本身是否通
  {
    const ok = await pickFit('铺满画布')
    await wait(700)
    const m = await measure()
    console.log(`[对照 铺满画布] 点击=${ok} fit=${JSON.stringify(await readFit()?.fit ?? null)} 类名=${m && m.cls} width=${m && m.relWidth} ratio=${m && m.ratio}`)
  }
  for (const name of ['左侧半屏', '右侧半屏']) {
    const ok = await pickFit(name)
    await wait(700)
    console.log(`  点击后 instance:`, JSON.stringify(await readFit()))
    const m = await measure()
    results[name] = m
    console.log(`\n[${name}] 点击成功=${ok}`)
    if (m) {
      console.log(`  画布 left=${m.canvas.left} width=${m.canvas.width}`)
      console.log(`  卡片 left=${m.inst.left} width=${m.inst.width} height=${m.inst.height}`)
      console.log(`  相对画布 left=${m.relLeft}  width=${m.relWidth}  占画布比例=${m.ratio}`)
      console.log(`  类名=${m.cls}`)
    }
    await page.screenshot({ path: path.join(root, `scripts/_tmp/half-${name}.png`) })
  }

  // 断言
  console.log('\n===== 断言 =====')
  const L = results['左侧半屏']
  const R = results['右侧半屏']
  const checks = []
  checks.push(['左半屏宽度≈画布一半', L && Math.abs(L.ratio - 0.5) < 0.06])
  checks.push(['左半屏贴左边(relLeft<60)', L && L.relLeft < 60])
  checks.push(['右半屏宽度≈画布一半', R && Math.abs(R.ratio - 0.5) < 0.06])
  checks.push(['右半屏贴中线(relLeft≈半宽)', R && Math.abs(R.relLeft - R.canvas.width / 2) < 60])
  checks.push(['左半屏在右半屏左边', L && R && L.inst.left < R.inst.left - 100])
  for (const [n, ok] of checks) console.log(`${ok ? '✅' : '❌'} ${n}`)

  await browser.close()
  srv.kill('SIGTERM')
})()

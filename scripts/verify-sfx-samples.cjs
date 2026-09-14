/**
 * 端到端验证「科技感采样音效」：
 *
 *   node scripts/verify-sfx-samples.cjs   （自己拉起 vite，跑完杀掉）
 *
 *  1. public/sfx/ 下 20 个采样文件全部能 fetch + decode
 *  2. 每个采样音效在 OfflineAudioContext 里渲染出来不是静音（schedule 链路通）
 *  3. 被替换的 digitRoll（数字滚动）走采样文件且有声
 *  4. renderSfxMix 导出混音（含采样音效）产出非静音音轨
 *  5. 参数面板下拉出现「科技感采样」分组且选项数量正确
 *  6. 原合成音效依然有声（回归）
 */
const { chromium } = require('playwright')
const { spawn } = require('child_process')
const http = require('http')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const PORT = process.env.PORT || '5195'
const BASE = `http://localhost:${PORT}/`

let pass = 0
let fail = 0
const check = (name, ok, detail) => {
  console.log(`  ${ok ? '✅' : '❌'} ${name}${detail !== undefined && !ok ? ' → ' + detail : ''}`)
  ok ? pass++ : fail++
}
const KEY = 'animation-editor-project-v1'
const readProject = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || '{}'), KEY)

async function waitServer() {
  for (let i = 0; i < 80; i++) {
    const ok = await new Promise((resolve) => {
      const r = http.get(BASE, () => resolve(true))
      r.on('error', () => resolve(false))
      r.setTimeout(500, () => {
        r.destroy()
        resolve(false)
      })
    })
    if (ok) return true
    await new Promise((r) => setTimeout(r, 500))
  }
  return false
}

;(async () => {
  const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--port', PORT, '--strictPort'], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  vite.stdout.on('data', () => {})
  vite.stderr.on('data', () => {})
  if (!(await waitServer())) {
    console.error('❌ vite 未能启动')
    vite.kill()
    process.exit(2)
  }

  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1680, height: 950 } })
  const errors = []
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)

  // 逐个采样：fetch + decode + 离线渲染，检查非静音
  const report = await page.evaluate(async () => {
    const m = await import('/src/sfx.ts')
    const ctx = new AudioContext()
    const fileDefs = m.SFX_LIBRARY.filter((d) => d.src)
    const synthDefs = m.SFX_LIBRARY.filter((d) => !d.src)

    const offlineRenderPeak = (def) =>
      new Promise(async (resolve) => {
        const oc = new OfflineAudioContext(1, Math.ceil((def.duration + 0.3) * 22050), 22050)
        if (def.src) await m.loadSfxFile(def.src, oc)
        def.schedule(oc, 0.05, 1)
        const buf = await oc.startRendering()
        let peak = 0
        const ch = buf.getChannelData(0)
        for (let i = 0; i < ch.length; i++) peak = Math.max(peak, Math.abs(ch[i]))
        resolve(peak)
      })

    const loaded = []
    for (const def of fileDefs) {
      const buf = await m.loadSfxFile(def.src, ctx)
      loaded.push({ id: def.id, src: def.src, ok: !!buf && buf.duration > 0.05, dur: buf ? +buf.duration.toFixed(2) : 0 })
    }
    const peaks = []
    for (const def of [...fileDefs, ...synthDefs]) {
      peaks.push({ id: def.id, peak: +(await offlineRenderPeak(def)).toFixed(3) })
    }
    // 导出混音链路（含采样音效）
    const mix = await m.renderSfxMix(
      [
        { at: 0.1, id: 'digitRoll', gain: 1 },
        { at: 0.6, id: 'uiClick', gain: 1 },
        { at: 1.0, id: 'neonBlip', gain: 1 },
      ],
      2,
    )
    let mixPeak = 0
    if (mix) {
      const ch = mix.getChannelData(0)
      for (let i = 0; i < ch.length; i++) mixPeak = Math.max(mixPeak, Math.abs(ch[i]))
    }
    return { loaded, peaks, mixPeak: +mixPeak.toFixed(3), options: m.SFX_OPTIONS.length }
  })
  await ctxClose(page)
  async function ctxClose() {}

  console.log('\n=== 1. 采样文件加载 ===')
  const badLoad = report.loaded.filter((l) => !l.ok)
  check(`20 个采样全部可加载（实际 ${report.loaded.length} 个）`, report.loaded.length === 20, `数量 ${report.loaded.length}`)
  check('全部加载成功且时长 > 0.05s', badLoad.length === 0, JSON.stringify(badLoad))

  console.log('\n=== 2. 每个音效离线渲染非静音 ===')
  const silent = report.peaks.filter((p) => p.peak < 0.01)
  check(`全部 ${report.peaks.length} 个音效有声（峰值 > 0.01）`, silent.length === 0, JSON.stringify(silent))
  const dr = report.peaks.find((p) => p.id === 'digitRoll')
  check('数字滚动（合成重制版）峰值正常', dr && dr.peak > 0.1 && dr.peak <= 1, JSON.stringify(dr))

  console.log('\n=== 3. 导出混音链路 ===')
  check('renderSfxMix 产出非静音音轨', report.mixPeak > 0.1, `peak=${report.mixPeak}`)

  console.log('\n=== 3.5 长卡持续（sustain）===')
  const sus = await page.evaluate(async () => {
    const m = await import('/src/sfx.ts')
    const proj = { sfxEnabled: true, sfxVolume: 1 }
    const longCue = m.resolveSfx({ start: 0, duration: 6, sfxVolume: 1 }, proj, false, '数据', 'core-number-roller')
    const shortCue = m.resolveSfx({ start: 0, duration: 0.8, sfxVolume: 1 }, proj, false, '数据', 'core-number-roller')
    // 渲染一段持续音效，量「末尾 0.2s」的能量：铺满 = 有声；只响一声 = 尾部静音
    const tailPeak = async (id, sustain, oneShot) => {
      const def = m.sfxDef(id)
      const dur = 0.2 + (sustain ?? def.duration + 0.1)
      const oc = new OfflineAudioContext(1, Math.ceil(dur * 22050), 22050)
      if (def.src) await m.loadSfxFile(def.src, oc)
      m.scheduleSfxCue(def, oc, 0.2, 1, sustain)
      const buf = await oc.startRendering()
      const ch = buf.getChannelData(0)
      const win = oneShot ? 0.05 : 0.2
      const from = Math.max(0, ch.length - Math.floor(win * 22050))
      let peak = 0
      for (let i = from; i < ch.length; i++) peak = Math.max(peak, Math.abs(ch[i]))
      return +peak.toFixed(3)
    }
    return {
      longSustain: longCue ? longCue.sustain : null,
      shortSustain: shortCue ? shortCue.sustain : 'missing',
      tailDigitRoll: await tailPeak('digitRoll', longCue.sustain),
      tailDataProcessing: await tailPeak('dataProcessing', longCue.sustain),
      tailDataStream: await tailPeak('dataStream', longCue.sustain),
      tailOneShot: await tailPeak('digitRoll', undefined, true),
      // 手动音效时长：sfxDuration 优先，任意音效都能拉长；超卡截断；过短退回一声
      manualUiClick: m.resolveSfx({ start: 0, duration: 6, sfxVolume: 1, sfxDuration: 3 }, proj, false, '贴片', 'neonBlip')?.sustain,
      manualClamped: m.resolveSfx({ start: 0, duration: 6, sfxVolume: 1, sfxDuration: 99 }, proj, false, '数据', 'core-number-roller')?.sustain,
      manualTooShort: m.resolveSfx({ start: 0, duration: 6, sfxVolume: 1, sfxDuration: 0.1 }, proj, false, '数据', 'core-number-roller')?.sustain,
      tailManual: await tailPeak('uiClick', 2.5),
      // 自动模式对任何音效生效：非持续型（科技点击 0.2s）在 6s 长卡上也自动铺到卡尾
      autoNonMarked: m.resolveSfx({ start: 0, duration: 6, sfxVolume: 1 }, proj, false, '贴片', 'neonBlip')?.sustain,
      // 连贯性：数字滚动持续段（0.1s 起、长 3.5s）内最长静音应 < 0.15s —— 无断点、无回音
      // 力场（采样颗粒流）同样要连贯：持续 3s 内最长静音 < 0.15s
      forceLongestGap: await (async () => {
        const oc = new OfflineAudioContext(1, Math.ceil(3.5 * 22050), 22050)
        // 采样音效要先解码进这个离线上下文（应用内的导出混音也是这个顺序）
        await m.loadSfxFile('force-field.mp3', oc)
        m.scheduleSfxCue(m.sfxDef('forceField'), oc, 0.1, 1, 3)
        const buf = await oc.startRendering()
        const ch = buf.getChannelData(0)
        const from = Math.floor(0.1 * 22050)
        const to = Math.floor(3.1 * 22050)
        let longest = 0
        let run = 0
        for (let i = from; i < to; i++) {
          if (Math.abs(ch[i]) < 0.005) {
            run += 1
            if (run > longest) longest = run
          } else run = 0
        }
        return +(longest / 22050).toFixed(3)
      })(),
      rollLongestGap: await (async () => {
        const oc = new OfflineAudioContext(1, Math.ceil(4 * 22050), 22050)
        m.scheduleSfxCue(m.sfxDef('digitRoll'), oc, 0.1, 1, 3.5)
        const buf = await oc.startRendering()
        const ch = buf.getChannelData(0)
        const from = Math.floor(0.1 * 22050)
        const to = Math.floor(3.6 * 22050)
        let longest = 0
        let run = 0
        for (let i = from; i < to; i++) {
          if (Math.abs(ch[i]) < 0.005) {
            run += 1
            if (run > longest) longest = run
          } else run = 0
        }
        return +(longest / 22050).toFixed(3)
      })(),
      mixTail: await (async () => {
        const mix = await m.renderSfxMix(
          [{ at: 0.1, id: 'digitRoll', gain: 1, sustain: 4 }],
          4.5,
        )
        const ch = mix.getChannelData(0)
        // 混音缓冲比工程长 1 秒（留尾巴），量 sustain 段的末尾（0.1+4=4.1s 之前 0.2s）
        const end = Math.floor(4.1 * 22050)
        const from = Math.max(0, end - Math.floor(0.2 * 22050))
        let peak = 0
        for (let i = from; i < end; i++) peak = Math.max(peak, Math.abs(ch[i]))
        return +peak.toFixed(3)
      })(),
    }
  })
  check('6s 长数据卡解算出 sustain（≈5.4s）', typeof sus.longSustain === 'number' && sus.longSustain > 5, JSON.stringify(sus.longSustain))
  check('短卡仍是干脆一声（无 sustain 字段）', sus.shortSustain === undefined, JSON.stringify(sus.shortSustain))
  check('数字滚动持续铺满到卡尾（尾部有声）', sus.tailDigitRoll > 0.02, `tail=${sus.tailDigitRoll}`)
  check('数据运算循环铺满到卡尾', sus.tailDataProcessing > 0.02, `tail=${sus.tailDataProcessing}`)
  check('数据传输（合成重复）铺满到卡尾', sus.tailDataStream > 0.02, `tail=${sus.tailDataStream}`)
  check('短卡一次性播放：尾部安静（回归）', sus.tailOneShot < 0.02, `tail=${sus.tailOneShot}`)
  check('导出混音支持 sustain（尾部有声）', sus.mixTail > 0.02, `tail=${sus.mixTail}`)
  check('手动时长：非持续型音效（科技点击）按 3s 铺满', typeof sus.manualUiClick === 'number' && sus.manualUiClick > 2.9 && sus.manualUiClick < 3.1, JSON.stringify(sus.manualUiClick))
  check('手动时长超出卡尾：按卡尾截断（≈5.4s）', typeof sus.manualClamped === 'number' && sus.manualClamped > 5 && sus.manualClamped < 5.5, JSON.stringify(sus.manualClamped))
  check('手动时长比一声还短：退回一声', sus.manualTooShort === undefined, JSON.stringify(sus.manualTooShort))
  check('拉长的科技点击：铺满段尾部有声', sus.tailManual > 0.02, `tail=${sus.tailManual}`)
  check('自动模式对非持续型音效也生效（长卡铺到卡尾）', typeof sus.autoNonMarked === 'number' && sus.autoNonMarked > 5.5 && sus.autoNonMarked < 6, JSON.stringify(sus.autoNonMarked))
  check('力场颗粒流连贯（最长静音 < 0.15s）', sus.forceLongestGap < 0.15, `force=${sus.forceLongestGap}s`)
  check('数字滚动持续段连贯（最长静音 < 0.15s，无回音）', sus.rollLongestGap < 0.15, `longest=${sus.rollLongestGap}s`)

  console.log('\n=== 3.7 暂停即停 ===')
  const pauseReport = await page.evaluate(async () => {
    const m = await import('/src/sfx.ts')
    const out = {}
    // 预览路径：铺 5 秒的持续数字滚动 → 大量发声节点挂在工作集里
    m.playSfx('digitRoll', 1, 5)
    await new Promise((r) => setTimeout(r, 400))
    out.playingVoices = m.liveSfxVoiceCount()
    m.pauseSfx()
    out.pausedVoices = m.liveSfxVoiceCount()
    m.resumeSfx()
    m.playSfx('digitRoll', 1, 5)
    await new Promise((r) => setTimeout(r, 300))
    out.resumedVoices = m.liveSfxVoiceCount()
    m.pauseSfx()
    out.finalVoices = m.liveSfxVoiceCount()
    // 合成短音同样登记、同样暂停即停
    m.playSfx('neonBlip', 1)
    await new Promise((r) => setTimeout(r, 80))
    out.synthVoices = m.liveSfxVoiceCount()
    m.pauseSfx()
    out.synthPaused = m.liveSfxVoiceCount()
    return out
  })
  check('持续音效播放中挂起大量发声节点', pauseReport.playingVoices > 10, JSON.stringify(pauseReport.playingVoices))
  check('暂停后节点全部停止', pauseReport.pausedVoices === 0, JSON.stringify(pauseReport.pausedVoices))
  check('恢复播放后能再次发声', pauseReport.resumedVoices > 10, JSON.stringify(pauseReport.resumedVoices))
  check('再次暂停归零', pauseReport.finalVoices === 0, JSON.stringify(pauseReport.finalVoices))
  check('合成短音也登记进总线', pauseReport.synthVoices > 0, JSON.stringify(pauseReport.synthVoices))
  check('合成音暂停即停', pauseReport.synthPaused === 0, JSON.stringify(pauseReport.synthPaused))

  console.log('\n=== 4. 参数面板下拉 ===')
  await page.click('.os-tracks .os-clip')
  await page.waitForTimeout(400)
  const optGroups = await page.$$eval('.os-meta-grid select optgroup', (els) =>
    els.map((e) => ({ label: e.label, n: e.querySelectorAll('option').length })),
  )
  check(
    '下拉出现「科技感采样」分组（20 项）',
    optGroups.some((g) => g.label.includes('科技感采样') && g.n === 20),
    JSON.stringify(optGroups),
  )
  // 只统计音效下拉自己（含分组的那个 select）的选项数
  const optCount = await page.$$eval('.os-meta-grid select', (els) => {
    const sfxSel = els.find((e) => e.querySelector('optgroup'))
    return sfxSel ? sfxSel.querySelectorAll('option').length : -1
  })
  check('总选项数 = 跟随默认 + 无 + 32 个音效', optCount === 34, `实际 ${optCount}`)

  // 音效时长滑竿：自动模式旋钮停在默认长度；拖到 3.5s → 写入 sfxDuration；「自动」按钮清回默认
  const durSlider = page.locator('label:has-text("音效时长") input[type="range"]')
  check('音效时长是滑竿', (await durSlider.count()) === 1)
  const autoKnob = Number(await durSlider.evaluate((el) => el.value))
  check('自动模式旋钮停在生效时长（不在 0）', autoKnob > 0.1 && autoKnob <= 15, String(autoKnob))
  check('轨道上有默认长度刻度', (await page.locator('label:has-text("音效时长") span[title^="音效默认长度"]').count()) === 1)
  check('「自动」按钮存在', (await page.locator('label:has-text("音效时长") button:has-text("自动")').count()) === 1)
  await durSlider.evaluate((el) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
    setter.call(el, '3.5')
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await page.waitForTimeout(300)
  let dur = (await readProject(page)).instances[0].sfxDuration
  check('滑竿拖到 3.5s → 写入 sfxDuration', dur === 3.5, String(dur))
  await page.click('label:has-text("音效时长") button:has-text("自动")')
  await page.waitForTimeout(300)
  dur = (await readProject(page)).instances[0].sfxDuration
  const knobAfterAuto = Number(await durSlider.evaluate((el) => el.value))
  check('点「自动」→ 清回默认（字段清空、旋钮回生效时长）', dur === undefined && knobAfterAuto > 0.1, `dur=${dur} knob=${knobAfterAuto}`)

  check('无页面报错', errors.length === 0, errors.slice(0, 2).join(' | '))

  await browser.close()
  vite.kill()
  console.log(`\n结果：${pass} 通过，${fail} 失败`)
  process.exit(fail ? 1 : 0)
})().catch((e) => {
  console.error(e)
  process.exit(2)
})

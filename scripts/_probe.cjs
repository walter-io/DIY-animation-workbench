/** 探针：同一张卡在「起点」与「播放中」的可见度对比 */
const { chromium } = require('playwright')

const mk = (instances) => ({
  name: 'probe', skin: 'dark', style: 'glass', font: 'sans',
  palette: { accent: '#5ac8fa', data: '#5ac8fa', special: '#ffd166' },
  host: { layout: 'off', x: 1384, y: 754, w: 480, h: 270, circular: false, radius: 24, focalX: 50, focalY: 50, zoom: 1, mirror: false, borderWidth: 4, borderColor: '#ffffff', shadow: true },
  hostClips: [],
  subtitleStyle: { fontSize: 44, align: 'center', color: '#ffffff', box: true, bg: 'rgba(0,0,0,0.55)', slot: 'bottom' },
  cardOpacity: 0.35, cardOpacityV2: true, fps: 30, duration: 10, layout: 'edit', presets: [],
  instances,
})

const CASES = [
  ['关键词弹跳高亮', 'srcvid-keyword-pop'],
  ['否定徽章强调', 'srcvid-negation-badge'],
  ['金句观点卡', 'srcvid-statement-card'],
  ['要点清单卡', 'bullet-list'],
  ['标签行卡', 'label-row'],
  ['开场霓虹主标题', 'srcvid-hero-title'],
]

/**
 * 读「真正承载文字的那个元素」的 opacity / transform —— 外层容器恒为 1，
 * 只有落到内容元素上才能反映入场动画此刻把它画得多淡。
 */
const SAMPLE = `(() => {
  const inst = document.querySelector('.os-inst')
  if (!inst) return null
  const leaves = [...inst.querySelectorAll('*')].filter(
    (e) => e.children.length === 0 && (e.textContent || '').trim().length > 0,
  )
  const el = leaves[0] || inst
  const cs = getComputedStyle(el)
  // 逐级向上累乘 opacity：父级半透明时子级再高也看不见
  let eff = 1
  let cur = el
  while (cur && cur !== document.body) {
    eff *= parseFloat(getComputedStyle(cur).opacity || '1')
    cur = cur.parentElement
  }
  const b = inst.getBoundingClientRect()
  return {
    box: { w: Math.round(b.width), h: Math.round(b.height) },
    leafOpacity: Number(parseFloat(cs.opacity).toFixed(3)),
    effective: Number(eff.toFixed(3)),
    transform: cs.transform === 'none' ? 'none' : cs.transform.slice(0, 40),
    text: (inst.textContent || '').trim().slice(0, 18),
  }
})()`

;(async () => {
  const b = await chromium.launch()
  const p = await b.newPage({ viewport: { width: 1680, height: 950 } })
  p.on('pageerror', (e) => console.log('  PAGEERROR:', e.message))

  for (const [label, effectId] of CASES) {
    await p.goto('http://127.0.0.1:5188', { waitUntil: 'domcontentloaded' })
    // start=0：重载后播放头就在 0，progress 精确等于 0 —— 正是「刚加进来」的状态
    await p.evaluate((x) => localStorage.setItem('animation-editor-project-v1', JSON.stringify(x)), mk([{
      id: 'c1', effectId, name: effectId, start: 0, duration: 6, slot: 'left', fit: 'auto', params: {},
    }]))
    await p.reload({ waitUntil: 'domcontentloaded' })
    await p.waitForTimeout(1100)

    const seek = async (sec) => {
      await p.evaluate((s) => {
        const tracks = document.querySelector('.os-tracks')
        const r = tracks.getBoundingClientRect()
        tracks.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: r.left + (s / 10) * r.width, clientY: r.top + 2 }))
      }, sec)
      await p.waitForTimeout(320)
    }

    const atStart = await p.evaluate(SAMPLE)
    const rows = [`  起点 p=0    ${JSON.stringify(atStart)}`]
    for (const [tag, sec] of [['0.2', 1.2], ['0.35', 2.1], ['0.5', 3], ['0.7', 4.2]]) {
      await seek(sec)
      const s = await p.evaluate(SAMPLE)
      rows.push(`  p=${tag}  effective=${s ? s.effective : 'null'}`)
    }
    const flag = atStart && atStart.effective < 0.05 ? '  ★起点完全透明' : ''
    console.log(`\n${label}${flag}`)
    console.log(rows.join('\n'))
  }

  await b.close()
  process.exit(0)
})()

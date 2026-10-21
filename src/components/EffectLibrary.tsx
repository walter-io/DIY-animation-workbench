import { useEffect, useMemo, useRef, useState } from 'react'

import { createPortal } from 'react-dom'
import { useEditor } from '../store'
import type { EffectDef, EffectLib } from '../types'
import { cardMode, MODE_LABELS, defaultFitFor } from '../hyperframes/modes'
import { skins, paletteVars, canvasTone } from '../themes'
import { projectCanvasBg } from '../canvasBg'
import { categoryHint, categoryRank } from '../effectCategories'

const EN_SUBTITLES: Record<string, string> = {
  'core-number-roller': 'METRIC FOCUS',
  'compare-bars': 'COMPARE BARS',
  'golden-reveal': 'GOLDEN REVEAL',
  'big-title': 'BIG TITLE',
  'quote-card': 'QUOTE CARD',
  'section-header': 'SECTION HEADER',
  'cta-card': 'CTA CARD',
  'bullet-list': 'BULLET LIST',
  'label-row': 'LABEL ROW',
  'kpi-card': 'KPI CARD',
  'dual-number': 'DUAL NUMBER',
  'progress-bar': 'PROGRESS BAR',
  'ring-card': 'RING CARD',
  'trend-card': 'TREND CARD',
  'data-grid': 'DATA GRID',
  'rank-card': 'RANK TOP 3',
  'stack-bar': 'STACK BAR',
  'timeline-card': 'TIMELINE',
  'steps-card': 'STEPS',
  'info-board': 'INFO BOARD',
  'two-col': 'TWO COLUMNS',
  'compare-table': 'COMPARE TABLE',
  'bar-chart-race': 'BAR CHART RACE',
  'chapter-roadmap': 'CHAPTER ROADMAP',
  'show-bracket': 'SHOW BRACKET',
  'command-card': 'COMMAND CARD',
  'logo-orbiter': 'LOGO ORBITER',
  'srt-subtitle': 'SUBTITLE',
  'logo-sphere': 'LOGO SPHERE',
  'srcvid-hero-title': 'NEON HERO TITLE',
  'srcvid-keyword-pop': 'KEYWORD POP',
  'srcvid-numbered-roadmap': 'NUMBERED ROADMAP',
  'srcvid-comparison-lines': 'CONTRAST LINES',
  'srcvid-circular-relation': 'CIRCULAR RELATION',
  'srcvid-three-pipeline': 'THREE STAGE PIPELINE',
  'srcvid-flow-arrow': 'FLOW ARROW',
  'srcvid-negation-badge': 'NEGATION BADGE',
  'srcvid-statement-card': 'STATEMENT CARD',
  'srcvid-human-ai-diagram': 'HUMAN × AI SPLIT',
  'srcvid-profile-card': 'PROFILE CARD',
  'srcvid-phone-mockup': 'PHONE MOCKUP',
  'srcvid-consumption-chain': 'CONSUMPTION CHAIN',
  'srcvid-classification-table': 'AUDIENCE TABLE',
  'srcvid-concept-trio': 'CONCEPT TRIO',
  'srcvid-ip-circle': 'IP CIRCLE',
  'srcvid-end-cta': 'END CTA BAR',
  // 解说类（知识解说整页卡）
  'ex-title-slide': 'EXPLAINER TITLE',
  'ex-section-slide': 'EXPLAINER SECTION',
  'ex-key-point': 'KEY POINT PILL',
  'ex-tag-build': 'TAG BUILD UP',
  'ex-highlight-turn': 'HIGHLIGHT TURN',
  'ex-checklist': 'CHECKLIST ROWS',
  'ex-steps-flow': 'STEP FLOW',
  'ex-versus': 'VERSUS PANELS',
  'ex-stat-hero': 'STAT HERO',
  'ex-end-slide': 'EXPLAINER END',
  'ex-board-blank': 'BLANK BOARD',
  // 解说元素卡（可自由叠加的零件）
  'exa-headline': 'HEADLINE',
  'exa-subhead': 'SUBHEAD',
  'exa-eyebrow': 'EYEBROW',
  'exa-navy-pill': 'DARK PILL',
  'exa-tag': 'TAG PILL',
  'exa-amber-pill': 'AMBER PILL',
  'exa-number-row': 'NUMBER ROW',
  'exa-step-chip': 'STEP CHIP',
  'exa-arrow': 'ARROW',
  'exa-big-number': 'BIG NUMBER',
  'exa-caption': 'CAPTION',
  'exa-rule': 'RULE',
  'exa-paragraph': 'PARAGRAPH',
}

/** 两个库：常规（叠加在口播画面上）/ 解说（知识解说整页卡） */
const LIBS: { id: EffectLib; name: string; hint: string }[] = [
  { id: 'regular', name: '常规库', hint: '叠加在有人物的口播画面上' },
  { id: 'explain', name: '解说库', hint: '知识解说整页卡，像播一页好看的 PPT' },
]

/** 卡归属哪个库（缺省常规库 —— 存量卡与拓展包卡自动归常规库） */
function libOf(e: EffectDef): EffectLib {
  return e.lib ?? 'regular'
}

const PREVIEW_W = 220
const PREVIEW_H = 124

/**
 * 动效库缩略预览：无论大屏模板还是小卡，都等比缩放进同一个 220×124 画框，
 * 并沿用当前皮肤 + 主题色，保证"库里看到的"和"画布上得到的"一致。
 */
function EffectPreview({ def }: { def: EffectDef }) {
  const { state } = useEditor()
  const [progress, setProgress] = useState(0)
  const [box, setBox] = useState({ scale: 0.25, w: 1920, h: 1080 })
  const fitRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  // 铺满类按 1920×1080 原比例缩，自适应类先给一个自然排版宽度再缩
  const isFull = defaultFitFor(def.id) === 'full'

  useEffect(() => {
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      setProgress(((now - start) % 2400) / 2400)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const measure = () => {
      const w = el.scrollWidth || el.getBoundingClientRect().width
      const h = el.scrollHeight || el.getBoundingClientRect().height
      if (w > 1 && h > 1) {
        const scale = Math.min(PREVIEW_W / w, PREVIEW_H / h, isFull ? 1 : 1)
        setBox({ scale, w, h })
      }
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [isFull])

  const Comp = def.component
  const skin = skins[state.project.skin]
  // 与画布同款：底色决定色调（白/米白底用深字），库里悬停预览才不会"白底白字"
  const previewBg = projectCanvasBg(state.project, skin.canvasVars['--stage-bg'])
  const stageSkin = skins[canvasTone(previewBg, skin.ui)]
  const stageVars: React.CSSProperties = {
    ...(stageSkin.canvasVars as React.CSSProperties),
    ...(paletteVars(state.project.palette) as React.CSSProperties),
    // 与画布同款背景：工程画布背景改了，库里的悬停预览也跟着变
    background: previewBg,
    ...({ '--stage-card-opacity': String(state.project.cardOpacity) } as React.CSSProperties),
  } as React.CSSProperties

  return (
    <div className="os-lib-preview-fit" ref={fitRef} style={stageVars}>
      <div
        className="os-lib-preview-canvas"
        ref={canvasRef}
        style={{
          width: isFull ? 1920 : 620,
          transform: `translate(${Math.max(0, (PREVIEW_W - box.w * box.scale) / 2)}px, ${Math.max(
            0,
            (PREVIEW_H - box.h * box.scale) / 2,
          )}px) scale(${box.scale})`,
        }}
      >
        <Comp
          params={def.defaultParams}
          progress={progress}
          meta={{
            id: 'preview',
            effectId: def.id,
            name: def.name,
            start: 0,
            duration: 2,
            slot: 'center',
          }}
          isPreview
        />
      </div>
    </div>
  )
}

export default function EffectLibrary() {
  const { effects, selected, dispatch } = useEditor()
  const [lib, setLib] = useState<EffectLib>('regular')
  const [query, setQuery] = useState('')
  const [displayMode, setDisplayMode] = useState<'detail' | 'compact'>('detail')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [preview, setPreview] = useState<{ def: EffectDef; left: number; top: number } | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const selectedEffectId = selected?.effectId
  const toastTimer = useRef<number | null>(null)

  const flash = (msg: string) => {
    setToast(msg)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 1600)
  }

  useEffect(() => () => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
  }, [])

  useEffect(() => {
    if (!selectedEffectId) return
    document
      .querySelector(`[data-effect-id="${selectedEffectId}"]`)
      ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [selectedEffectId])

  const countByLib = useMemo(() => {
    const c: Record<EffectLib, number> = { regular: 0, explain: 0 }
    for (const e of effects) c[libOf(e)] += 1
    return c
  }, [effects])

  // 选中一张别的库里的卡时，自动切到它所在的库（否则用户会以为卡丢了）
  useEffect(() => {
    if (!selectedEffectId) return
    const target = effects.find((e) => e.id === selectedEffectId)
    if (target) setLib(libOf(target))
  }, [selectedEffectId, effects])

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const map = new Map<string, EffectDef[]>()
    for (const e of effects) {
      if (libOf(e) !== lib) continue
      if (
        q &&
        // 搜索范围：名称 + 描述 + 分类 + ID（如搜 "replica" 能命中所有卡）
        !`${e.name} ${e.description ?? ''} ${e.category ?? ''} ${e.id}`.toLowerCase().includes(q)
      ) {
        continue
      }
      const key = e.category ?? (e.plugin ? '插件' : '其他')
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(e)
    }
    return [...map.entries()].sort((a, b) => categoryRank(a[0]) - categoryRank(b[0]))
  }, [effects, query, lib])

  const toggleCategory = (cat: string) => {
    setCollapsed((cur) => ({ ...cur, [cat]: !cur[cat] }))
  }
  const allCollapsed = groups.length > 0 && groups.every(([cat]) => collapsed[cat])
  const toggleAll = () => {
    setCollapsed(allCollapsed ? {} : Object.fromEntries(groups.map(([cat]) => [cat, true])))
  }

  /** 当前搜索词在另一个库里还有多少张（提示用户切库，别以为卡没了） */
  const otherMatches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return 0
    return effects.filter(
      (e) =>
        libOf(e) !== lib &&
        `${e.name} ${e.description ?? ''} ${e.category ?? ''} ${e.id}`.toLowerCase().includes(q),
    ).length
  }, [effects, query, lib])

  /** 新增一张卡到时间轴（默认行为） */
  const addCard = (effect: EffectDef) => {
    dispatch({ type: 'addInstance', effectId: effect.id })
    flash(`已新增「${effect.name}」到时间轴`)
  }

  /** 用该动效替换当前选中的卡（需要已有选中卡且不是同一动效） */
  const replaceCard = (effect: EffectDef) => {
    if (!selected || selected.effectId === effect.id) return
    dispatch({ type: 'replaceInstanceEffect', id: selected.id, effectId: effect.id })
    flash(`已把选中的卡换成「${effect.name}」`)
  }

  const showPreview = (e: React.MouseEvent, def: EffectDef) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const left = Math.min(Math.max(8, window.innerWidth - 250), rect.right + 10)
    const top = Math.min(Math.max(8, rect.top), window.innerHeight - 280)
    setPreview({ def, left, top })
  }

  return (
    <>
      <aside className="os-panel os-panel-left">
        {toast && <div className="os-lib-toast">{toast}</div>}
        <div className="os-panel-header os-panel-header-lib">
          {/*
            标题右边原来挂着「叠加在有人物的口播画面上」这句说明：面板只有 220px 宽，
            长句子把「详情 / 简洁 / 全收」三个按钮整个挤到面板外面。
            说明已移到页签下方单占一行（见 .os-lib-hint），这里只留库名 + 数量。
          */}
          <span className="os-lib-header-title">动效库 ({countByLib[lib]})</span>
          <div className="os-lib-header-actions">
            <div className="os-lib-mode">
              {([
                ['detail', '详情'],
                ['compact', '简洁'],
              ] as const).map(([id, name]) => (
                <button
                  key={id}
                  className={`os-lib-mode-btn ${displayMode === id ? 'active' : ''}`}
                  type="button"
                  onClick={() => setDisplayMode(id)}
                >
                  {name}
                </button>
              ))}
            </div>
            <button
              className="os-lib-cat-all"
              type="button"
              onClick={toggleAll}
              disabled={!groups.length}
              title={allCollapsed ? '展开全部分类' : '收起全部分类'}
            >
              {allCollapsed ? '全开' : '全收'}
            </button>
          </div>
        </div>
        {/* 库页签：常规 / 解说 —— 两个库互不干扰，存量卡全在常规库 */}
        <div className="os-lib-tabs">
          {LIBS.map((l) => (
            <button
              key={l.id}
              type="button"
              className={`os-lib-tab ${lib === l.id ? 'active' : ''}`}
              title={l.hint}
              onClick={() => setLib(l.id)}
            >
              {l.name}
              <span className="os-lib-tab-count">{countByLib[l.id]}</span>
            </button>
          ))}
        </div>
        {/* 当前库的一句话说明：整行独占，多长的句子都不会去挤上面的按钮 */}
        <div className="os-lib-hint" title={LIBS.find((l) => l.id === lib)?.hint}>
          {LIBS.find((l) => l.id === lib)?.hint}
        </div>
        {/* 搜索条放在滚动容器外面：这样滚多远它都钉在库顶部，不会跟着列表跑掉 */}
        <div className="os-lib-searchbar">
          <div className="os-lib-search-wrap">
            <input
              className="os-lib-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索动效"
              spellCheck={false}
            />
            {query && (
              <button
                className="os-lib-search-clear"
                type="button"
                onClick={() => setQuery('')}
                title="清空搜索"
              >
                ×
              </button>
            )}
          </div>
        </div>
        <div className="os-panel-body">
          {groups.length === 0 && <div className="os-empty">没有匹配的动效</div>}
          {otherMatches > 0 && (
            <button
              type="button"
              className="os-lib-otherlib"
              onClick={() => setLib(lib === 'regular' ? 'explain' : 'regular')}
            >
              {lib === 'regular' ? '解说库' : '常规库'}里还有 {otherMatches} 张匹配的卡 →
            </button>
          )}
          {groups.map(([cat, list]) => (
            <div key={cat} className="os-lib-group">
              <button
                type="button"
                className="os-lib-cat"
                onClick={() => toggleCategory(cat)}
                aria-expanded={!collapsed[cat]}
                title={categoryHint(cat) || cat}
              >
                <span className="os-lib-cat-arrow">{collapsed[cat] ? '▸' : '▾'}</span>
                {cat}
                {categoryHint(cat) && <span className="os-lib-cat-hint">{categoryHint(cat)}</span>}
                <span className="os-lib-cat-count">{list.length}</span>
              </button>
              {!collapsed[cat] &&
                list.map((effect) => (
                  <div
                    key={effect.id}
                    className={`os-lib-item ${selectedEffectId === effect.id ? 'active' : ''} ${displayMode === 'compact' ? 'compact' : ''}`}
                    data-effect-id={effect.id}
                    role="button"
                    tabIndex={0}
                    title="点击新增一张卡到时间轴"
                    onClick={() => addCard(effect)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        addCard(effect)
                      }
                    }}
                    onMouseEnter={(e) => showPreview(e, effect)}
                    onMouseLeave={() => setPreview(null)}
                  >
                    <div className="os-lib-main">
                      <div className="os-lib-name">
                        {effect.name}
                        {effect.id.startsWith('hf-') && <span className="os-lib-badge">大屏</span>}
                        <span className={`os-lib-mode os-lib-mode-${cardMode(effect.id)}`}>{MODE_LABELS[cardMode(effect.id)]}</span>
                      </div>
                      <div className="os-lib-en">{EN_SUBTITLES[effect.id] ?? effect.id.toUpperCase()}</div>
                      {effect.description && <div className="os-lib-desc">{effect.description}</div>}
                    </div>
                    <div className="os-lib-actions">
                      <button
                        type="button"
                        className="os-lib-act os-lib-act-add"
                        title="新增这张卡到时间轴"
                        onClick={(e) => {
                          e.stopPropagation()
                          addCard(effect)
                        }}
                      >
                        +
                      </button>
                      {selected && selected.effectId !== effect.id && (
                        <button
                          type="button"
                          className="os-lib-act os-lib-act-swap"
                          title={`替换当前选中的卡（${selected.name}）`}
                          onClick={(e) => {
                            e.stopPropagation()
                            replaceCard(effect)
                          }}
                        >
                          ⇄
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          ))}
        </div>
      </aside>
      {preview &&
        createPortal(
          <div className="os-lib-preview-fixed" style={{ left: preview.left, top: preview.top }}>
            <div className="os-lib-preview-head">
              <div className="os-lib-preview-name">{preview.def.name}</div>
              {preview.def.description && (
                <div className="os-lib-preview-desc">{preview.def.description}</div>
              )}
            </div>
            <EffectPreview def={preview.def} />
          </div>,
          document.body,
        )}
    </>
  )
}

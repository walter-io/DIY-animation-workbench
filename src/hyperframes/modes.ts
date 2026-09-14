/**
 * 画面模式映射：参考 hyperframes-motion-library 的 director-rules.json
 * 与各模板 catalog.director 声明（从目标仓库 V1.3 提取）。
 *
 * 四种画面模式：
 *  - fullscreen  独立全屏：主体铺满安全区，不为人物/素材预留半屏
 *  - overlay     透明叠加：局部区域，主动避开人物、字幕和产品主体
 *  - data        数据图表：坐标、标签和结论共同填满安全区
 *  - transition  章节过渡：只出现与转折有关的信息
 *
 * 本仓库 React 卡按"默认落位习惯"推断模式；hf 卡取目标仓库登记值。
 */
export type LayoutMode = 'fullscreen' | 'overlay' | 'data' | 'transition'

export const MODE_LABELS: Record<LayoutMode, string> = {
  fullscreen: '独立全屏',
  overlay: '透明叠加',
  data: '数据图表',
  transition: '章节过渡',
}

/** hf 模板 → 画面模式（defaultMode + allowedModes，源自目标仓库 catalog director） */
export const hfModes: Record<string, { default: LayoutMode; allowed: LayoutMode[] }> = {
  'number-counter': { default: 'fullscreen', allowed: ['fullscreen', 'data'] },
  'line-chart-draw': { default: 'data', allowed: ['data', 'fullscreen'] },
  'metric-pulse': { default: 'fullscreen', allowed: ['fullscreen', 'data'] },
  'big-number-card': { default: 'fullscreen', allowed: ['fullscreen'] },
  'before-after-stat': { default: 'fullscreen', allowed: ['fullscreen', 'data'] },
  'turning-point-line': { default: 'data', allowed: ['data', 'fullscreen'] },
  'status-split': { default: 'transition', allowed: ['transition', 'fullscreen'] },
  'concept-spotlight': { default: 'overlay', allowed: ['overlay', 'fullscreen'] },
  'myth-fact-swap': { default: 'transition', allowed: ['transition', 'fullscreen'] },
  'cause-chain': { default: 'overlay', allowed: ['overlay', 'fullscreen'] },
  'mode-choice-compare': { default: 'fullscreen', allowed: ['fullscreen'] },
  'iteration-loop': { default: 'fullscreen', allowed: ['fullscreen'] },
}

/** 本仓库 React 卡 → 默认画面模式（按卡型语义推断） */
export const reactCardModes: Record<string, LayoutMode> = {
  // 全屏类：结论/金句/大标题/章节板
  'big-title': 'fullscreen',
  'quote-card': 'fullscreen',
  'golden-reveal': 'fullscreen',
  'cta-card': 'fullscreen',
  'section-header': 'fullscreen',
  'info-board': 'fullscreen',
  'chapter-roadmap': 'fullscreen',
  'show-bracket': 'fullscreen',
  'two-col': 'fullscreen',
  'compare-table': 'fullscreen',
  'tool-crossout': 'fullscreen',
  'concept-map': 'fullscreen',
  'data-grid': 'data',
  'bar-chart-race': 'data',
  'bar-chart-3d': 'data',
  'rank-card': 'data',
  'compare-bars': 'data',
  'stack-bar': 'data',
  'progress-bar': 'data',
  'ring-card': 'data',
  'trend-card': 'data',
  'dual-number': 'data',
  'kpi-card': 'data',
  'core-number-roller': 'fullscreen',
  // 信息/步骤类
  'timeline-card': 'overlay',
  'steps-card': 'overlay',
  'bullet-list': 'overlay',
  'label-row': 'overlay',
  'command-card': 'overlay',
  'srt-subtitle': 'overlay',
  // 动效装饰类默认全屏
  'logo-orbiter': 'fullscreen',
  'logo-sphere': 'fullscreen',
  'orbit-core': 'fullscreen',
}

/** 取一张卡的画面模式：hf 卡用模板登记，React 卡用推断表，未知回退 overlay */
export function cardMode(effectId: string): LayoutMode {
  if (effectId.startsWith('hf-')) {
    const tpl = effectId.slice(3)
    return hfModes[tpl]?.default ?? 'fullscreen'
  }
  return reactCardModes[effectId] ?? 'overlay'
}

/**
 * 一张卡的默认尺寸模式（新加实例 / 旧工程迁移时使用）。
 * 全屏类（fullscreen）与 hf 非叠加模板默认铺满画布，其余默认内容自适应。
 */
export function defaultFitFor(effectId: string): 'auto' | 'box' | 'full' {
  if (effectId.startsWith('hf-')) {
    return hfModes[effectId.slice(3)]?.default === 'overlay' ? 'auto' : 'full'
  }
  return reactCardModes[effectId] === 'fullscreen' ? 'full' : 'auto'
}

/** 一张卡是否允许以某槽位放置（fullscreen 建议 center/free，overlay 建议 left/right/bottom） */
export function slotOkForMode(effectId: string, slot: string): { ok: boolean; hint?: string } {
  const mode = cardMode(effectId)
  if (mode === 'fullscreen') {
    if (slot === 'left' || slot === 'right') {
      return { ok: false, hint: `「${MODE_LABELS[mode]}」动效建议居中（center）或自由定位铺满，避免被半屏截断` }
    }
    return { ok: true }
  }
  if (mode === 'overlay') {
    return { ok: true }
  }
  return { ok: true }
}

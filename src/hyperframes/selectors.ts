/**
 * 模板内容卡片选择器（源自 hyperframes-motion-library catalog director）：
 *  - frame：外层框架选择器（内容面板，如 .counter-panel / .card / .panel）
 *  - subject：真实信息元素（标题/数字/说明等）
 *
 * 用途：内容提取——iframe 里把 #root 按 frame 包围盒做 contain 缩放+居中，
 * 让模板里真正的内容卡片放大填满画布，而不是整个 1920×1080 大画布缩成小图。
 */
export const hfContentSelectors: Record<string, { frame: string[]; subject: string[] }> = {
  'bar-chart-grow': { frame: ['.scene'], subject: ['.title-area', '.chart-area'] },
  'number-counter': { frame: ['.counter-panel'], subject: ['.title', '.value', '.suffix', '.note'] },
  'line-chart-draw': { frame: ['.scene'], subject: ['.title-area', '.chart-area'] },
  'metric-pulse': { frame: ['.content'], subject: ['.headline', '.value', '.unit', '.note'] },
  'big-number-card': { frame: ['.card'], subject: ['.eyebrow', '.prefix', '.value', '.unit', '.caption-wrap'] },
  'before-after-stat': { frame: ['.comparison-panel'], subject: ['.label', '.tag', '.value', '.arrow', '.conclusion'] },
  'horizontal-bar-compare': { frame: ['.panel'], subject: ['.title', '.name', '.track', '.value', '.caption'] },
  'top-rank-list': { frame: ['.panel'], subject: ['.title', '.no', '.name', '.score', '.caption'] },
  'turning-point-line': { frame: ['.panel'], subject: ['.title', '.subtitle', '.line', '.point', '.caption'] },
  'source-citation-card': { frame: ['.card'], subject: ['.main', '.meta', '.note'] },
  'stat-duel': { frame: ['.panel'], subject: ['.duel', '.verdict'] },
  'status-split': { frame: ['.cluster'], subject: ['.tag', '.title', '.connector-word', '.arrow'] },
  'number-impact': { frame: ['.card'], subject: ['.content', '.meter'] },
  'concept-spotlight': { frame: ['.card'], subject: ['.label', '.term', '.definition', '.note'] },
  'three-step-flow': { frame: ['.panel'], subject: ['.title', '.index', '.step-title', '.desc', '.rail'] },
  'myth-fact-swap': { frame: ['.wrap'], subject: ['.label', '.text', '.swap', '.caption'] },
  'key-point-marker': { frame: ['.marker'], subject: ['.kicker', '.point', '.source'] },
  'checklist-pop': { frame: ['.panel'], subject: ['.title', '.list'] },
  'timeline-scan': { frame: ['.panel'], subject: ['.title', '.timeline'] },
  'cause-chain': { frame: ['.cluster'], subject: ['.title', '.cards'] },
  'compact-number-callout': { frame: ['.statement'], subject: ['.eyebrow', '.context', '.value', '.unit', '.note'] },
  'mode-choice-compare': { frame: ['.compare'], subject: ['.title', '.option-title', '.option-detail', '.connector'] },
  'iteration-loop': { frame: ['.loop'], subject: ['.title', '.step-number', '.step-text', '.arrow', '.return-path', '.takeaway'] },
}

/**
 * 合并映射：hyperframes-motion-library 模板 ↔ 本仓库已有 React 卡
 *
 * 规则：
 *  - 若本仓库已有功能覆盖的卡 → 标记 mergedWith，两版并存、可互相替换
 *    （replaceInstanceEffect 的参数迁移会自动映射共享字段，如 label/title/value）
 *  - 若本仓库缺失 → mergedWith 为 null，作为新增卡引入
 */
export type MergeInfo = {
  /** 目标模板 id */
  hfId: string
  /** 本仓库对应的 React 卡 id（无则 null = 新增卡） */
  mergedWith: string | null
  /** 合并说明 */
  note: string
}

export const hyperframesMergeMap: MergeInfo[] = [
  { hfId: 'number-counter', mergedWith: 'core-number-roller', note: '数字滚动/计数器 → 核心数字滚动' },
  { hfId: 'metric-pulse', mergedWith: 'core-number-roller', note: '数据脉冲 → 核心数字滚动（全屏增强版）' },
  { hfId: 'big-number-card', mergedWith: 'big-title', note: '大数字结论 → 大标题卡（数字版）' },
  { hfId: 'compact-number-callout', mergedWith: 'core-number-roller', note: '全屏数字强调 → 核心数字滚动' },
  { hfId: 'before-after-stat', mergedWith: 'dual-number', note: '前后对比数字 → 双数字对比' },
  { hfId: 'stat-duel', mergedWith: 'dual-number', note: '双数据对比（叠加）→ 双数字对比' },
  { hfId: 'horizontal-bar-compare', mergedWith: 'compare-bars', note: '横向条形对比 → 左右对比条' },
  { hfId: 'top-rank-list', mergedWith: 'rank-card', note: 'Top 排名 → 排行榜 TOP3' },
  { hfId: 'turning-point-line', mergedWith: 'trend-card', note: '拐点趋势线 → 趋势卡（折线增强版）' },
  { hfId: 'status-split', mergedWith: 'two-col', note: '状态转折 → 双列清单卡（章节式对照）' },
  { hfId: 'number-impact', mergedWith: 'trend-card', note: '极值刻度 → 趋势卡' },
  { hfId: 'concept-spotlight', mergedWith: 'info-board', note: '概念解释卡 → 信息板卡' },
  { hfId: 'three-step-flow', mergedWith: 'steps-card', note: '三步流程 → 步骤流程卡' },
  { hfId: 'myth-fact-swap', mergedWith: 'tool-crossout', note: '误区纠正 → 工具替代卡' },
  { hfId: 'key-point-marker', mergedWith: 'golden-reveal', note: '重点标注 → 金句逐行揭示' },
  { hfId: 'checklist-pop', mergedWith: 'bullet-list', note: '清单核对 → 要点清单卡' },
  { hfId: 'timeline-scan', mergedWith: 'timeline-card', note: '时间线推进 → 时间线卡' },
  { hfId: 'cause-chain', mergedWith: 'steps-card', note: '因果链路 → 步骤流程卡' },
  { hfId: 'mode-choice-compare', mergedWith: 'two-col', note: '并列模式选择 → 双列清单卡' },
  // ===== 本仓库缺失 → 新增 =====
  { hfId: 'bar-chart-grow', mergedWith: null, note: '新增：柱状图增长（3-7 根柱形弹性增长）' },
  { hfId: 'line-chart-draw', mergedWith: null, note: '新增：折线绘制（逐段绘制 + 数据点）' },
  { hfId: 'source-citation-card', mergedWith: null, note: '新增：数据来源引用卡（可信度）' },
  { hfId: 'iteration-loop', mergedWith: null, note: '新增：迭代闭环（四步循环）' },
]

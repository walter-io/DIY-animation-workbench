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
  { hfId: 'before-after-stat', mergedWith: 'dual-number', note: '前后对比数字 → 双数字对比' },
  { hfId: 'turning-point-line', mergedWith: 'trend-card', note: '拐点趋势线 → 趋势卡（折线增强版）' },
  { hfId: 'status-split', mergedWith: 'two-col', note: '状态转折 → 双列清单卡（章节式对照）' },
  { hfId: 'concept-spotlight', mergedWith: 'info-board', note: '概念解释卡 → 信息板卡' },
  { hfId: 'myth-fact-swap', mergedWith: 'tool-crossout', note: '误区纠正 → 工具替代卡' },
  { hfId: 'cause-chain', mergedWith: 'steps-card', note: '因果链路 → 步骤流程卡' },
  { hfId: 'mode-choice-compare', mergedWith: 'two-col', note: '并列模式选择 → 双列清单卡' },
  // ===== 本仓库缺失 → 新增 =====
  { hfId: 'line-chart-draw', mergedWith: null, note: '新增：折线绘制（逐段绘制 + 数据点）' },
  { hfId: 'iteration-loop', mergedWith: null, note: '新增：迭代闭环（四步循环）' },
]

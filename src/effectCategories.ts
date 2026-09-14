/**
 * 动效分类的展示顺序与说明。
 * 抽成独立模块是因为动效库（左侧列表）和参数面板的「更换特效」下拉框
 * 必须用同一套顺序和同一套提示，否则两个入口的分类排列会对不上。
 *
 * 分类口径：按「这张卡在成片里承担什么作用」划分，一类一职。
 * 每个分类名都对应 src/cards/ 下的同名子目录（英文名见目录）。
 * 注意：sfx.ts 的 SFX_DEFAULT_BY_CATEGORY / SFX_ONSET_BY_CATEGORY 依赖这里的分类名，
 * 改名或新增分类时要同步那边的映射。
 */

/** 分类顺序：按"这张卡在成片里承担什么作用"排列，从开场到结尾走一遍视频结构 */
export const CATEGORY_ORDER = [
  '开场',
  '金句',
  '数据',
  '对比',
  '流程',
  '关系',
  '列表',
  '人物',
  '贴片',
  '结尾',
  '字幕',
  '装饰',
  '大屏模板',
] as const

/** 动效分类。由 CATEGORY_ORDER 派生，写错分类名会直接编译报错。 */
export type EffectCategory = (typeof CATEGORY_ORDER)[number]

export const CATEGORY_HINTS: Record<EffectCategory, string> = {
  开场: '点题立主题：大标题、段头',
  金句: '观点、引用、一句话打重',
  数据: '数字、图表、进度、统计',
  对比: 'A vs B、反差、新旧替代',
  流程: '步骤、时间线、链路、管线',
  关系: '概念图、矩阵、环形、放射',
  列表: '清单、要点、表格、网格',
  人物: '人像、分工、对话、吉祥物',
  贴片: '角标、窗口、标签等 UI 零件',
  结尾: '收尾、总结、CTA',
  字幕: '口播字幕',
  装饰: '纯氛围点缀',
  大屏模板: '1920×1080 全屏独立镜头',
}

/**
 * 取分类的提示文案。
 * UI 里分组 key 是 string（可能含运行时兜底值"插件"/"其他"），
 * 直接拿 string 去索引 CATEGORY_HINTS 过不了类型检查，统一走这个函数做窄化。
 * 未登记的分类返回空串，由调用方决定回退显示什么。
 */
export function categoryHint(cat: string): string {
  return CATEGORY_HINTS[cat as EffectCategory] ?? ''
}

/** 分类排序权重：不在 CATEGORY_ORDER 里的统一排到最后，并保持原有相对顺序 */
export function categoryRank(cat: string): number {
  const i = CATEGORY_ORDER.indexOf(cat as EffectCategory)
  return i < 0 ? CATEGORY_ORDER.length + 1 : i
}

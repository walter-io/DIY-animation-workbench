import type { CardSizeId } from './types'

/**
 * 动效卡通用默认尺寸（小 / 中 / 大）。
 *
 * 这是**工程级**默认值：只作用于「没有单独调过尺寸」的卡片。
 * 一张卡只要在参数面板里动过「整体缩放」（instance.contentScale 有值），
 * 或者被手动拖拽缩放过（fit 变成 box），就以它自己的为准，不受这里影响。
 *
 * 另外**铺满画布（fit = full）的卡完全不参与**：它本来就占满整个内容区，
 * 再缩放只会让画面出现空隙，所以这一档设置对它无效（用户在设置面板里能看到提示）。
 */
export const CARD_SIZE_OPTIONS: { id: CardSizeId; name: string; hint: string }[] = [
  { id: 'small', name: '小', hint: '卡片更紧凑，画面留白多，适合多卡同屏' },
  { id: 'medium', name: '中', hint: '默认大小，多数口播场景直接用这档' },
  { id: 'large', name: '大', hint: '卡片更醒目、字更大，适合单卡强调' },
]

/**
 * 三档对应的缩放系数：作用在内容整体（含文字与图形），
 * 走的是与单卡「整体缩放」同一条通道（instance.contentScale）。
 * 幅度刻意做小 —— 一档差 20% 左右，跨档不会把版式撑坏或缩成一团。
 */
const SCALE: Record<CardSizeId, number> = {
  small: 0.85,
  medium: 1,
  large: 1.18,
}

export const DEFAULT_CARD_SIZE: CardSizeId = 'medium'

/** 尺寸档 → 缩放系数；传空或认不出来的值都退回「中」（= 1，即不缩放） */
export function cardSizeScale(id: CardSizeId | undefined | null): number {
  if (!id) return SCALE[DEFAULT_CARD_SIZE]
  return SCALE[id] ?? SCALE[DEFAULT_CARD_SIZE]
}

/**
 * 反查：一个缩放系数落在哪一档上。
 * 用来在参数面板里高亮本卡的档位按钮 —— 滑杆微调到 0.93 这种中间值就返回 null（自定义），
 * 此时三个档位按钮都不高亮，避免"看着像小档、实际不是"的误判。
 */
export function cardSizeFromScale(scale: number | undefined | null): CardSizeId | null {
  if (typeof scale !== 'number' || !Number.isFinite(scale)) return null
  for (const o of CARD_SIZE_OPTIONS) {
    if (Math.abs(SCALE[o.id] - scale) < 0.005) return o.id
  }
  return null
}

/** 读旧工程 / 导入 JSON 时兜底：只认两个合法值，其余一律按「中」 */
export function normalizeCardSize(v: unknown): CardSizeId {
  return v === 'small' || v === 'large' ? v : DEFAULT_CARD_SIZE
}

/** 展示用：把系数变成百分比文本，例如 1.18 → 118% */
export function cardSizePercent(id: CardSizeId | undefined | null): number {
  return Math.round(cardSizeScale(id) * 100)
}

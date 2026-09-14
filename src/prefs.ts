import type { CardSizeId, Palette, Project, SkinId, StyleId, FontId } from './types'
import { normalizeCardSize } from './cardSize'

/**
 * 个人偏好 —— 把"历史版本里反复出现的习惯"沉淀下来，跨工程复用：
 *
 *  - 用卡习惯：每次记录把当前工程的动效卡种类叠加计数，
 *    自动出卡（口播稿 → 卡片）时给常用卡型加温和的偏好分；
 *  - 外观偏好：主题皮肤 / 骨架风格 / 字体 / 配色 / 卡片尺寸档 / 背景透明度，
 *    「重置编辑台」回到空白工程时自动套用，不用每次重新调。
 *
 * 只存本机 localStorage（键 animation-editor-prefs-v1），不上传；
 * 在「历史版本」面板里记录，也可在那里清除。
 */

const PREFS_KEY = 'animation-editor-prefs-v1'

export type UserPrefs = {
  version: 1
  /** 最近一次记录的时间（展示用） */
  updatedAt: string
  /** 累计记录次数 */
  sessions: number
  /** 用卡习惯：effectId → 累计张数（跨工程累加） */
  effectCounts: Record<string, number>
  /** 最近一次记录的外观偏好 */
  look?: {
    skin: SkinId
    style: StyleId
    font: FontId
    palette: Palette
    cardSize?: CardSizeId
    cardOpacity?: number
  }
}

export function readPrefs(): UserPrefs | null {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (!raw) return null
    const prefs = JSON.parse(raw) as UserPrefs
    if (!prefs || typeof prefs.effectCounts !== 'object') return null
    return prefs
  } catch {
    return null
  }
}

export function savePrefs(prefs: UserPrefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  } catch {
    /* 存储满等极端情况忽略：偏好丢了不影响编辑 */
  }
}

export function clearPrefs(): void {
  try {
    localStorage.removeItem(PREFS_KEY)
  } catch {
    /* ignore */
  }
}

/**
 * 把当前工程的习惯合并进个人偏好：
 * 用卡计数**累加**（越用越准），外观**覆盖**为最近一次的样子（人的口味会变）。
 */
export function recordPrefsFromProject(project: Project): UserPrefs {
  const prev = readPrefs() ?? {
    version: 1 as const,
    updatedAt: '',
    sessions: 0,
    effectCounts: {} as Record<string, number>,
  }
  const effectCounts = { ...prev.effectCounts }
  for (const inst of project.instances) {
    effectCounts[inst.effectId] = (effectCounts[inst.effectId] ?? 0) + 1
  }
  const look = {
    skin: project.skin,
    style: project.style,
    font: project.font,
    palette: project.palette,
    ...(project.cardSize ? { cardSize: project.cardSize } : {}),
    ...(typeof project.cardOpacity === 'number' ? { cardOpacity: project.cardOpacity } : {}),
  }
  const next: UserPrefs = {
    version: 1,
    updatedAt: new Date().toLocaleString('zh-CN'),
    sessions: prev.sessions + 1,
    effectCounts,
    look,
  }
  savePrefs(next)
  return next
}

/** 用卡偏好排行：effectId 按累计张数从多到少 */
export function prefEffectRanking(): string[] {
  const prefs = readPrefs()
  if (!prefs) return []
  return Object.entries(prefs.effectCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id)
}

/**
 * 把外观偏好套到一个工程上（重置编辑台 / 新建空白工程时用）。
 * 只动皮肤 / 风格 / 字体 / 配色 / 尺寸档 / 背景透明度，内容一律不碰。
 * 没有偏好或没有外观记录时原样返回。
 */
export function applyLook(project: Project): Project {
  const prefs = readPrefs()
  const look = prefs?.look
  if (!look) return project
  return {
    ...project,
    skin: look.skin,
    style: look.style,
    font: look.font,
    palette: look.palette,
    ...(look.cardSize ? { cardSize: normalizeCardSize(look.cardSize) } : {}),
    ...(typeof look.cardOpacity === 'number' ? { cardOpacity: look.cardOpacity } : {}),
  }
}

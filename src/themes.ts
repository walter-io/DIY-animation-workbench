import type { Palette, SkinId } from './types'

export type Skin = {
  id: SkinId
  name: string
  /** 应用在 .os-canvas 上的 CSS 变量 */
  canvasVars: Record<string, string>
  /** 背景氛围光团（radial-gradient 列表） */
  ambient: string[]
  /** 预览台 UI 主题（亮/暗） */
  ui: 'dark' | 'light'
}

/**
 * 语义色分工：
 *  - primary  主色 X：品牌强调、标题、关键线条
 *  - data     数据色 Y：数字、图表、进度等一切"数据"
 *  - assist   辅助色 Z：次级信息、对比条、徽标
 *  - special  特殊色 W：观点金句、警示、点睛
 */
export const skins: Record<SkinId, Skin> = {
  dark: {
    id: 'dark',
    name: '深色',
    ui: 'dark',
    canvasVars: {
      '--stage-bg': '#0b0b0d',
      '--stage-surface': 'rgba(255,255,255,0.07)',
      '--stage-surface-strong': 'rgba(255,255,255,0.12)',
      '--stage-text': '#f5f5f7',
      '--stage-text-muted': 'rgba(245,245,247,0.55)',
      '--stage-border': 'rgba(255,255,255,0.14)',
      '--stage-accent': '#5ac8fa',
      '--stage-grid': 'rgba(255,255,255,0.045)',
      // 语义色 X/Y/Z/W（可被工程主题色覆盖）
      '--stage-primary': '#8b9dff',
      '--stage-data': '#5ac8fa',
      '--stage-assist': '#ff7ab0',
      '--stage-special': '#ffd166',
      // 叠加层别名（旧卡曾用 --overlay-*，未定义会导致颜色失效）
      '--overlay-primary': 'var(--stage-primary)',
      '--overlay-data': 'var(--stage-data)',
      '--overlay-special': 'var(--stage-special)',
      '--overlay-assist': 'var(--stage-assist)',
      // 卡片质感（可被 style=flat 覆盖）
      // --stage-card-bg 是"卡片色"，通常带 alpha；背景层会在它下面垫一层
      // --stage-card-underlay（默认 = 画布底色 --stage-bg）合成出真正的实色。
      '--stage-card-bg': 'rgba(8,8,12,0.42)',
      '--stage-card-blur': 'blur(14px)',
      // 投影拆成"几何 + 颜色"两段：App.css 用 --stage-card-opacity 去稀释颜色，
      // 这样背景透明度拉满时投影也一起消失（不能写死成一个完整 box-shadow）。
      '--stage-card-shadow-geometry': '0 16px 40px',
      '--stage-card-shadow-color': 'rgba(0,0,0,0.2)',
    },
    ambient: [
      'radial-gradient(60% 50% at 18% 22%, rgba(120,140,255,0.16), transparent 70%)',
      'radial-gradient(55% 45% at 82% 30%, rgba(255,120,180,0.12), transparent 70%)',
      'radial-gradient(70% 60% at 50% 92%, rgba(80,200,255,0.10), transparent 70%)',
    ],
  },
  light: {
    id: 'light',
    name: '浅色',
    ui: 'light',
    canvasVars: {
      '--stage-bg': '#f4f5f7',
      '--stage-surface': 'rgba(15,18,30,0.05)',
      '--stage-surface-strong': 'rgba(15,18,30,0.09)',
      '--stage-text': '#0c0d10',
      // 弱化正文（卡片上的说明行等）：0.5 压在浅底上只有 3.57:1，压深到 0.62 → 5.3:1
      '--stage-text-muted': 'rgba(12,13,16,0.62)',
      '--stage-border': 'rgba(15,18,30,0.14)',
      '--stage-accent': '#0f8fc9',
      '--stage-grid': 'rgba(15,18,30,0.05)',
      // 语义色 X/Y/Z/W（可被工程主题色覆盖）
      '--stage-primary': '#4c5fe0',
      '--stage-data': '#0f8fc9',
      '--stage-assist': '#d9538a',
      '--stage-special': '#c78a1b',
      // 叠加层别名（旧卡曾用 --overlay-*，未定义会导致颜色失效）
      '--overlay-primary': 'var(--stage-primary)',
      '--overlay-data': 'var(--stage-data)',
      '--overlay-special': 'var(--stage-special)',
      '--overlay-assist': 'var(--stage-assist)',
      // 卡片质感（亮底柔和大投影）
      '--stage-card-bg': 'rgba(15,18,30,0.08)',
      '--stage-card-blur': 'blur(14px)',
      '--stage-card-shadow-geometry': '0 20px 48px',
      '--stage-card-shadow-color': 'rgba(15,18,30,0.14)',
    },
    ambient: [
      'radial-gradient(60% 50% at 20% 24%, rgba(120,140,255,0.18), transparent 70%)',
      'radial-gradient(55% 45% at 80% 28%, rgba(255,150,90,0.14), transparent 70%)',
      'radial-gradient(70% 60% at 50% 95%, rgba(120,200,255,0.14), transparent 70%)',
    ],
  },
}

export const skinList = Object.values(skins)

/* ───────────────────────── 颜色工具（浅底/深底自适应用） ───────────────────────── */

export type Rgb = { r: number; g: number; b: number; a: number }

/**
 * 解析颜色字符串：#rgb / #rrggbb / #rrggbbaa / rgb() / rgba()。
 * 传进来的是渐变（`linear-gradient(...)`）时取第一个颜色 —— 画布背景的
 * 「米白 / 黑」两档就是渐变，判断底色深浅时看首个色停足够。
 * 解析不出来返回 null（调用方各自兜底）。
 */
export function parseCssColor(input: string | undefined | null): Rgb | null {
  if (!input) return null
  const s = String(input).trim()
  if (!s) return null
  const hex = s.match(/#([0-9a-f]{3,8})\b/i)
  if (hex) {
    const h = hex[1]
    const to = (v: string) => parseInt(v, 16)
    if (h.length === 3 || h.length === 4) {
      return {
        r: to(h[0] + h[0]),
        g: to(h[1] + h[1]),
        b: to(h[2] + h[2]),
        a: h.length === 4 ? to(h[3] + h[3]) / 255 : 1,
      }
    }
    if (h.length === 6 || h.length === 8) {
      return {
        r: to(h.slice(0, 2)),
        g: to(h.slice(2, 4)),
        b: to(h.slice(4, 6)),
        a: h.length === 8 ? to(h.slice(6, 8)) / 255 : 1,
      }
    }
  }
  const fn = s.match(/rgba?\(([^)]+)\)/i)
  if (fn) {
    const p = fn[1].split(/[,\s/]+/).filter(Boolean).map(Number)
    if (p.length >= 3 && p.slice(0, 3).every((n) => Number.isFinite(n))) {
      return { r: p[0], g: p[1], b: p[2], a: p.length > 3 && Number.isFinite(p[3]) ? p[3] : 1 }
    }
  }
  return null
}

/** WCAG 相对亮度（0~1）。解析不出来按 0（= 当成黑）处理 */
export function relativeLuminance(color: string | undefined | null, fallback = 0): number {
  const c = parseCssColor(color)
  if (!c) return fallback
  const f = (v: number) => {
    const x = v / 255
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b)
}

/**
 * 画布色调 —— 由「画布背景色」决定，而不是由皮肤决定。
 *
 * 深色皮肤 + 画布背景「白色」时，卡片文字仍是深色皮肤的浅字（--stage-text #f5f5f7），
 * 画在白底上直接消失（实测「累计交付」只有 1.05:1）。所以色调必须跟着**底色**走：
 * 底色亮 → 用浅色皮肤那套深字；底色暗 → 用深色皮肤那套浅字。
 * 皮肤只决定编辑器 UI（面板、时间轴）的亮暗，两件事解耦。
 */
export function canvasTone(bgValue: string | undefined, fallback: 'dark' | 'light'): 'dark' | 'light' {
  const c = parseCssColor(bgValue)
  if (!c) return fallback
  return relativeLuminance(bgValue, fallback === 'light' ? 1 : 0) > 0.5 ? 'light' : 'dark'
}

/** 按画布色调取对应的画布变量（中性色 + 语义色都跟着走） */
export function canvasVarsFor(tone: 'dark' | 'light'): Record<string, string> {
  return skins[tone].canvasVars
}

/**
 * 压在某个底色上的文字该用近黑还是白。
 * 交叉点在底色亮度 ≈ 0.19（更亮 → 深字更清楚，更暗 → 白字更清楚）。
 */
export function readableOn(bg: string | undefined | null, dark = '#0b0f14', light = '#ffffff'): string {
  const l = relativeLuminance(bg, 0.02)
  return l > 0.19 ? dark : light
}

/** 卡片骨架风格 */
export const styleOptions: { id: 'glass' | 'flat'; name: string; vars: Record<string, string> }[] = [
  {
    id: 'glass',
    name: '玻璃质感',
    vars: {}, // 使用皮肤默认（半透明 + blur）
  },
  {
    id: 'flat',
    name: '实色面板',
    vars: {
      '--stage-card-bg': 'var(--stage-surface-strong)',
      '--stage-card-blur': 'blur(0px)',
      '--stage-card-shadow-geometry': '0 10px 28px',
      '--stage-card-shadow-color': 'rgba(0,0,0,0.16)',
    },
  },
]

/**
 * 主题色预设：一次选择，全工程卡片的主色 / 数据色 / 点缀色同步切换。
 * 单张卡若单独设置了"强调色"，则覆盖主色（面板可一键恢复跟随主题）。
 */
export type ThemePreset = { id: string; name: string; palette: Palette }

export const DEFAULT_PALETTE: Palette = {
  accent: '#5ac8fa',
  data: '#5ac8fa',
  special: '#ffd166',
}

export const themePresets: ThemePreset[] = [
  { id: 'ice', name: '冰蓝', palette: { accent: '#5ac8fa', data: '#5ac8fa', special: '#ffd166' } },
  { id: 'cyan', name: '科技青', palette: { accent: '#22d3ee', data: '#38bdf8', special: '#facc15' } },
  { id: 'violet', name: '紫罗兰', palette: { accent: '#8b9dff', data: '#a78bfa', special: '#ffd166' } },
  { id: 'emerald', name: '青翠', palette: { accent: '#34d399', data: '#5fd0c0', special: '#ffd166' } },
  { id: 'amber', name: '琥珀', palette: { accent: '#ffb86c', data: '#ffd166', special: '#ff7ab0' } },
  { id: 'rose', name: '玫瑰', palette: { accent: '#ff7ab0', data: '#f472b6', special: '#ffd166' } },
  { id: 'crimson', name: '朱红', palette: { accent: '#ff6b6b', data: '#f87171', special: '#ffd166' } },
  { id: 'graphite', name: '石墨', palette: { accent: '#e5e7eb', data: '#cbd5e1', special: '#ffd166' } },
]

export function paletteOf(id: string): Palette | undefined {
  return themePresets.find((t) => t.id === id)?.palette
}

export function matchPresetId(p: Palette): string | null {
  const hit = themePresets.find(
    (t) =>
      t.palette.accent.toLowerCase() === (p.accent ?? '').toLowerCase() &&
      t.palette.data.toLowerCase() === (p.data ?? '').toLowerCase() &&
      t.palette.special.toLowerCase() === (p.special ?? '').toLowerCase(),
  )
  return hit?.id ?? null
}

/**
 * 把主题色转成画布 CSS 变量（覆盖皮肤默认语义色）。
 *
 * ⚠️ **只输出用户真正设过的槽位**，绝不要写空字符串。
 * `paletteVars()` 是在 `...stageSkin.canvasVars` **之后**展开的（见 PreviewCanvas /
 * EffectLibrary），所以一旦这里把 `--stage-accent` / `--stage-data` 写成 `''`：
 *   1. 空字符串会覆盖掉上面刚铺好的「按画布色调选出来的」语义色；
 *   2. React 用 `style.setProperty(k, '')` 落下去等于**删除该声明**，
 *      元素自己也就没有这个变量了 → 一路继承到 `.os-app` 上的**皮肤**值。
 * 后果：深色皮肤 + 白色画布时，画布语义色仍是深色那套亮色（#5ac8fa），
 * 卡片上的数字 / 强调色直接变成白底浅蓝（实测 1.9:1，几乎看不见）。
 * 默认工程 palette 三个槽都是空串，所以这是**默认就会踩**的坑。
 */
export function paletteVars(p: Palette): Record<string, string> {
  const out: Record<string, string> = {}
  const accent = (p.accent ?? '').trim()
  if (accent) {
    out['--stage-primary'] = accent
    out['--stage-accent'] = accent
    out['--stage-accent-strong'] = accent
  }
  const data = (p.data ?? '').trim()
  if (data) out['--stage-data'] = data
  const special = (p.special ?? '').trim()
  if (special) out['--stage-special'] = special
  return out
}

/** 着色笔 / 强调色取色盘 */
export const QUICK_COLORS = [
  '#5ac8fa', '#22d3ee', '#34d399', '#8b9dff',
  '#a78bfa', '#ff7ab0', '#ff6b6b', '#ffb86c',
  '#ffd166', '#e5e7eb', '#94a3b8', '#1f2937',
]

/** 画布字体 */
export const fontOptions: { id: 'sans' | 'serif'; name: string; family: string }[] = [
  { id: 'sans', name: '加粗', family: "'Inter','PingFang SC','Microsoft YaHei',system-ui,sans-serif" },
  { id: 'serif', name: '普通', family: "'Songti SC','SimSun',Georgia,'Times New Roman',serif" },
]

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react'
import type {
  CardPreset,
  CardKeyframe,
  EasingId,
  EffectDef,
  Instance,
  LayoutPresetId,
  Palette,
  Params,
  PresetStyle,
  Project,
  SkinId,
  SlotId,
  CardFit,
  CardSizeId,
  HostClip,
  HostConfig,
  HostTrack,
  ImageClip,
  MediaAsset,
  MediaKeyframe,
  SubtitleStyle,
} from './types'
import { remapRectOrientation, type HostLayoutId } from './hostLayouts'
import { DEFAULT_SFX_ID, DEFAULT_SFX_VOLUME, normalizeSfxId, type SfxId } from './sfx'
import { registry } from './registry'
import { parseSrt } from './srt'
import { chunkCues, suggestCardsForChunks } from './autoCards'
import { applyLook } from './prefs'
import { defaultFitFor } from './hyperframes/modes'
import { DEFAULT_PALETTE, skins } from './themes'
import { alphaOfCssColor } from './cardOpacity'
import { DEFAULT_CARD_SIZE, normalizeCardSize } from './cardSize'
import {
  DEFAULT_HOST_EASE,
  DEFAULT_HOST_TRANSITION,
  MAX_HOST_TRANSITION,
  normalizeEase,
} from './hostTween'
import {
  MIN_HOST_TRACK,
  defaultHostTrack,
  hostTrackId,
  normalizeHostTrack,
  normalizeHostTracks,
} from './hostTrack'
import { applySplit } from './split'
import {
  DEFAULT_SUBTITLE_DURATION,
  MIN_SUBTITLE_DURATION,
  buildSubtitleInstances,
  clampSubtitleRange,
  insertSubtitleCard,
  isSubtitle,
  normalizeSubtitleTrack,
  planSubtitleCards,
  splitLegacySubtitleInstance,
} from './subtitleTrack'
import { hydrateAssetUrls, serializeProject } from './mediaPersistence'

export const DEFAULT_HOST: HostConfig = {
  layout: 'off',
  x: 1384,
  y: 754,
  w: 480,
  h: 270,
  circular: false,
  radius: 24,
  // 焦点默认取正中，用户可以按人物实际站位调
  focalX: 50,
  focalY: 50,
  zoom: 1,
  // 不擅自改动原始画面：镜像默认关，需要时用户自己开
  mirror: false,
  borderWidth: 4,
  borderColor: '#ffffff',
  shadow: true,
  opacity: 1,
}

const STORAGE_KEY = 'animation-editor-project-v1'
const HISTORY_LIMIT = 100

/** slot（画布左/右/中/下/上）→ 默认所在通用轨道号（字幕轨是第 0 条，所以动效卡从 1 起算） */
const SLOT_TRACK: Record<SlotId, number> = {
  left: 1,
  right: 2,
  center: 3,
  bottom: 4,
  top: 5,
}
/**
 * 新建工程的默认「背景不透明度」。
 * 滑杆上的「背景透明度」= 100% - 这个值，也就是 65% —— 玻璃卡的常规观感。
 */
const DEFAULT_CARD_OPACITY = 0.35

const PARAM_TRANSFER: Record<string, string[]> = {
  label: ['label', 'leftLabel', 'rightLabel', 'title', 'text', 'quote', 'subtitle', 'sub', 'segName', 'centerLabel', 'kicker', 'tag', 'command'],
  title: ['title', 'text', 'quote', 'label', 'leftLabel', 'rightLabel', 'subtitle', 'sub', 'segName', 'centerLabel', 'kicker', 'tag', 'command'],
  text: ['text', 'title', 'quote', 'label', 'leftLabel', 'rightLabel', 'subtitle', 'sub', 'segName', 'centerLabel', 'kicker', 'tag', 'command'],
  quote: ['quote', 'text', 'title', 'label', 'leftLabel', 'rightLabel', 'subtitle', 'sub', 'segName', 'centerLabel', 'kicker', 'tag', 'command'],
  kicker: ['kicker', 'tag', 'label', 'title', 'text', 'subtitle', 'segName', 'centerLabel'],
  tag: ['tag', 'kicker', 'label', 'title', 'text', 'subtitle', 'segName', 'centerLabel'],
  leftLabel: ['leftLabel', 'rightLabel', 'label', 'title', 'text', 'quote', 'subtitle', 'segName', 'centerLabel'],
  rightLabel: ['rightLabel', 'leftLabel', 'label', 'title', 'text', 'quote', 'subtitle', 'segName', 'centerLabel'],
  subtitle: ['subtitle', 'sub', 'hint', 'segName', 'footnote', 'author'],
  sub: ['sub', 'subtitle', 'hint', 'segName', 'footnote', 'author'],
  segName: ['segName', 'subtitle', 'sub', 'hint', 'footnote', 'author'],
  centerLabel: ['centerLabel', 'label', 'title', 'text', 'segName', 'subtitle', 'sub'],
  command: ['command', 'text', 'title', 'label', 'quote'],
  sourceLabel: ['sourceLabel', 'hint', 'subtitle', 'sub'],
  hint: ['hint', 'subtitle', 'sub', 'segName', 'footnote', 'author'],
  author: ['author', 'subtitle', 'sub', 'hint', 'footnote', 'segName'],
  footnote: ['footnote', 'subtitle', 'sub', 'hint', 'author', 'segName'],
  items: ['items', 'lines', 'rows', 'labels', 'steps', 'chapters', 'quote'],
  lines: ['lines', 'items', 'rows', 'labels', 'steps', 'chapters', 'quote'],
  rows: ['rows', 'items', 'lines', 'labels', 'steps', 'chapters'],
  labels: ['labels', 'items', 'lines', 'rows', 'steps', 'chapters'],
  steps: ['steps', 'items', 'lines', 'rows', 'labels', 'chapters'],
  chapters: ['chapters', 'items', 'lines', 'rows', 'labels', 'steps'],
  num: ['num', 'segNum', 'activeIndex'],
  segNum: ['segNum', 'num', 'activeIndex'],
  value: ['target', 'value', 'leftValue', 'rightValue', 'left', 'right', 'pct', 'leftPct'],
  target: ['target', 'value', 'leftValue', 'rightValue', 'left', 'right', 'pct', 'leftPct'],
  leftValue: ['leftValue', 'target', 'value', 'left', 'right', 'pct', 'leftPct'],
  rightValue: ['rightValue', 'target', 'value', 'left', 'right', 'pct', 'leftPct'],
  left: ['left', 'target', 'value', 'leftValue', 'rightValue', 'pct', 'leftPct'],
  right: ['right', 'target', 'value', 'leftValue', 'rightValue', 'pct', 'leftPct'],
  pct: ['pct', 'leftPct', 'target', 'value', 'left', 'right'],
  leftPct: ['leftPct', 'pct', 'target', 'value', 'left', 'right'],
  suffix: ['suffix', 'unit'],
  unit: ['unit', 'suffix'],
  color: ['color'],
  align: ['align'],
  duration: ['duration'],
  trend: ['trend'],
  showRank: ['showRank'],
  size: ['size'],
  box: ['box'],
  bg: ['bg'],
  // ===== hyperframes 模板字段迁移（合并优化：hf 卡 ↔ 本仓库卡互切时共享文案）=====
  headline: ['label', 'title', 'text', 'quote', 'subtitle', 'segName', 'centerLabel'],
  targetValue: ['target', 'value', 'leftValue', 'rightValue', 'left', 'right'],
  valueA: ['leftValue', 'left', 'target', 'value'],
  valueB: ['rightValue', 'right', 'target', 'value'],
  itemA: ['leftLabel', 'label', 'title', 'text'],
  itemB: ['rightLabel', 'label', 'title', 'text'],
  beforeLabel: ['leftLabel', 'label', 'title'],
  afterLabel: ['rightLabel', 'label', 'title'],
  beforeValue: ['left', 'leftValue', 'target', 'value'],
  afterValue: ['right', 'rightValue', 'target', 'value'],
  conclusion: ['subtitle', 'sub', 'hint', 'segName', 'footnote'],
  eyebrow: ['kicker', 'tag', 'label', 'title'],
  caption: ['subtitle', 'sub', 'hint', 'segName'],
  term: ['title', 'label', 'text', 'quote'],
  definition: ['text', 'subtitle', 'sub', 'hint'],
  myth: ['text', 'title', 'quote', 'oldTools'],
  fact: ['text', 'title', 'quote', 'newTools'],
  mythLabel: ['tag', 'kicker', 'label'],
  factLabel: ['tag', 'kicker', 'label'],
  cause: ['items', 'lines', 'rows', 'steps'],
  mechanism: ['items', 'lines', 'rows', 'steps'],
  result: ['items', 'lines', 'rows', 'steps'],
  step1: ['steps', 'items', 'lines', 'rows'],
  step2: ['steps', 'items', 'lines', 'rows'],
  step3: ['steps', 'items', 'lines', 'rows'],
  step4: ['steps', 'items', 'lines', 'rows'],
  desc1: ['subtitle', 'sub', 'hint'],
  desc2: ['subtitle', 'sub', 'hint'],
  desc3: ['subtitle', 'sub', 'hint'],
  takeaway: ['subtitle', 'sub', 'hint'],
  time1: ['num', 'segNum'],
  time2: ['num', 'segNum'],
  time3: ['num', 'segNum'],
  label1: ['items', 'lines', 'rows', 'steps'],
  label2: ['items', 'lines', 'rows', 'steps'],
  label3: ['items', 'lines', 'rows', 'steps'],
  point: ['text', 'quote', 'title', 'label'],
  source: ['sourceLabel', 'hint', 'subtitle', 'sub'],
  claim: ['subtitle', 'sub', 'hint'],
  context: ['subtitle', 'sub', 'hint', 'segName'],
  values: ['items', 'lines', 'rows'],
  colors: ['color'],
  leftTitle: ['leftLabel', 'label', 'title'],
  rightTitle: ['rightLabel', 'label', 'title'],
  leftDetail: ['left', 'subtitle', 'sub', 'hint'],
  rightDetail: ['right', 'subtitle', 'sub', 'hint'],
  leftTag: ['tag', 'kicker', 'label'],
  rightTag: ['tag', 'kicker', 'label'],
  rank1: ['items', 'rows', 'lines'],
  rank2: ['items', 'rows', 'lines'],
  rank3: ['items', 'rows', 'lines'],
  value1: ['target', 'value', 'left', 'right'],
  value2: ['target', 'value', 'left', 'right'],
  value3: ['target', 'value', 'left', 'right'],
  pointLabel: ['label', 'tag', 'title'],
}

let idSeq = 0
const uid = () => `inst_${Date.now().toString(36)}_${(idSeq++).toString(36)}`

/** 全局字幕样式默认值。字幕是整片一套样式，所以这份配置存在工程这一层 */
export const DEFAULT_SUBTITLE_STYLE: SubtitleStyle = {
  fontSize: 44,
  align: 'center',
  color: '#ffffff',
  box: true,
  bg: 'rgba(0,0,0,0.55)',
  slot: 'bottom',
}

const ALIGNS: SubtitleStyle['align'][] = ['left', 'center', 'right']
const SLOTS: SlotId[] = ['left', 'right', 'center', 'bottom', 'top']

/**
 * 旧工程没有 subtitleStyle 字段：拿第一句字幕的样式当全局样式，
 * 之后整片字幕统一跟着它。这样老工程打开后字幕外观不会变。
 */
function migrateSubtitleStyle(p: Project): SubtitleStyle {
  const base = { ...DEFAULT_SUBTITLE_STYLE }
  if (p.subtitleStyle) return { ...base, ...p.subtitleStyle }
  const first = (p.instances ?? []).find((i) => isSubtitle(i))
  if (!first) return base
  const q: Record<string, unknown> = first.params ?? {}
  const align = String(q.align ?? '')
  const slot = first.slot
  return {
    fontSize: typeof q.fontSize === 'number' ? q.fontSize : base.fontSize,
    align: (ALIGNS as string[]).includes(align) ? (align as SubtitleStyle['align']) : base.align,
    color: typeof q.color === 'string' && q.color ? q.color : base.color,
    box: typeof q.box === 'boolean' ? q.box : base.box,
    bg: typeof q.bg === 'string' && q.bg ? q.bg : base.bg,
    slot: (SLOTS as string[]).includes(slot) ? slot : base.slot,
  }
}

/**
 * 字幕卡渲染用的参数：全局样式覆盖单卡样式。
 * 文案（params.text）永远取单卡自己的 —— 每句话内容各不相同，不能联动。
 */
export function subtitleRenderParams(inst: Instance, style: SubtitleStyle): Params {
  const { slot: _slot, ...shared } = style
  return { ...inst.params, ...shared }
}

const DEFAULT_PROJECT: Project = {
  name: '未命名工程',
  skin: 'dark',
  style: 'glass',
  font: 'sans',
  palette: { ...DEFAULT_PALETTE },
  host: { ...DEFAULT_HOST },
  cardOpacity: DEFAULT_CARD_OPACITY,
  cardOpacityV2: true,
  cardSize: DEFAULT_CARD_SIZE,
  fps: 30,
  duration: 12,
  layout: 'edit',
  hostClips: [],
  hostTracks: [],
  imageClips: [],
  mediaAssets: [],
  hostTransition: DEFAULT_HOST_TRANSITION,
  hostEase: DEFAULT_HOST_EASE,
  instances: [
    {
      id: 'seed_1',
      effectId: 'core-number-roller',
      name: '核心数字滚动',
      start: 0,
      duration: 3,
      slot: 'left',
      fit: 'auto',
      params: { ...(registry[0]?.defaultParams ?? {}) },
    },
    {
      id: 'seed_2',
      effectId: 'compare-bars',
      name: '左右对比条',
      start: 3,
      duration: 3,
      slot: 'right',
      fit: 'auto',
      params: { ...(registry[1]?.defaultParams ?? {}) },
    },
    {
      id: 'seed_3',
      effectId: 'golden-reveal',
      name: '金句逐行揭示',
      start: 6,
      duration: 4,
      slot: 'left',
      fit: 'auto',
      params: { ...(registry[2]?.defaultParams ?? {}) },
    },
  ],
  presets: [],
  subtitleStyle: { ...DEFAULT_SUBTITLE_STYLE },
}

type HistoryEntry = {
  project: Project
  selectedId: string | null
  key?: string
}


type State = {
  project: Project
  selectedId: string | null
  history: HistoryEntry[]
  future: HistoryEntry[]
  currentTime: number
  playing: boolean
  plugins: EffectDef[]
  /** 垫底视频（objectURL，预览用，不持久化） */
  videoUrl: string | null
  videoName: string | null
  /** 视频实际像素尺寸（含内置黑边/letterbox） */
  videoW: number
  videoH: number
  /** 视频可视内容尺寸（自动检测去除内置黑边后的真实画面比例） */
  videoContentW: number
  videoContentH: number
  /** 视频可视内容在原像素中的偏移（黑边位置） */
  videoContentOffX: number
  videoContentOffY: number
  videoOpacity: number
  videoVisible: boolean
  /** 主持视频（出镜画面，objectURL，预览用，不持久化） */
  hostUrl: string | null
  hostName: string | null
  /** 主持视频原始像素尺寸（用于提示比例是否匹配） */
  hostW: number
  hostH: number
  /** 当前选中的机位段（在机位轨道上点选后，参数面板编辑它） */
  selectedHostClipId: string | null
  /** 当前选中的出镜素材条 id（点素材条后高亮 + 参数面板出现可填的起点/入点/时长） */
  selectedHostTrackId: string | null
  /** 当前选中的图片素材片段 id（点图片片段后高亮 + 参数面板可改位置/大小） */
  selectedImageClipId: string | null
  /** 当前选中的素材关键帧（clipId + 片段内相对时间 t）。点时间轴菱形高亮，Delete 删除 */
  selectedMediaKeyframe: { clipId: string; t: number } | null
  /** 当前选中的动效卡关键帧（cardId + 卡内相对时间 t）。与素材关键帧同构，Delete 删除 */
  selectedCardKeyframe: { cardId: string; t: number } | null
  /** 预览模式：stack 叠加 / split 分屏 / video 仅视频 */
  previewMode: 'stack' | 'split' | 'video'
  /** 画布方向：landscape 横屏 1920×1080 / portrait 竖屏 1080×1920 */
  canvasOrientation: 'landscape' | 'portrait'
  /** 用户是否手动覆盖过画布方向（手动后不再自动跟随视频方向） */
  orientationOverridden: boolean
  /** 整体缩放（乘在自适应缩放之上） */
  zoom: number
  /** 画布参考网格（剪辑参考线，不影响导出） */
  showGrid: boolean
  /** 时间轴轨道区高度（可拖拽调整） */
  trackH: number
  /** 用户手动添加的通用轨道数（轨道1 起算，字幕轨不算）；轨道总数 = max(用到的行, 这个数) */
  trackCount: number
  /**
   * 除 currentTime 外的状态快照，由 reducer 维护：只有非时间字段真的变了才换新引用。
   * 播放时每帧的 setTime 会换新 state，但这份快照引用不变，
   * 于是「跟时间无关的组件」（动效库、参数面板…）不会被每帧拖着重渲染。
   */
  static: StaticState
}

/** 不含播放头的状态视图 */
type StaticState = Omit<State, 'currentTime' | 'static'>

/** 只动了播放头？（用于决定 static 快照能否复用） */
function onlyPlayheadMoved(a: State, b: State): boolean {
  const x = a as unknown as Record<string, unknown>
  const y = b as unknown as Record<string, unknown>
  for (const k in x) {
    if (k === 'currentTime' || k === 'static') continue
    if (x[k] !== y[k]) return false
  }
  return true
}

type Action =
  | { type: 'setSkin'; skin: SkinId }
  | { type: 'setStyle'; style: Project['style'] }
  | { type: 'setFont'; font: Project['font'] }
  | { type: 'setPalette'; palette: Partial<Palette> }
  | { type: 'clearCardAccents' }
  | { type: 'savePreset'; preset: CardPreset }
  | { type: 'applyPreset'; presetId: string; targetId: string }
  | { type: 'applyPresetToAll'; presetId: string }
  | { type: 'renamePreset'; id: string; name: string }
  | { type: 'deletePreset'; id: string }
  | { type: 'setCardOpacity'; opacity: number }
  /** 工程级默认：动效卡通用尺寸（小 / 中 / 大），只影响没单独调过尺寸的卡 */
  | { type: 'setCardSize'; size: CardSizeId }
  /** 音效总开关：关掉后整片静音，导出也不烤音轨 */
  | { type: 'setSfxEnabled'; enabled: boolean }
  /** 全局音效音量 0~1 */
  | { type: 'setSfxVolume'; volume: number }
  /** 没单独指定音效的卡默认用哪个 */
  | { type: 'setSfxDefaultId'; id: SfxId }
  | { type: 'setTrackH'; height: number }
  | { type: 'setLayout'; layout: LayoutPresetId }
  | { type: 'setFps'; fps: number }
  | { type: 'setName'; name: string }
  | { type: 'setVideo'; url: string | null; name?: string }
  | { type: 'setHostVideo'; url: string | null; name?: string }
  /** 素材库拖视频到轨道：把这段视频设为出镜视频，并在指定起点生成一条素材条 */
  | { type: 'addHostTrackAt'; url: string | null; name?: string; start: number; sourceDuration: number }
  | { type: 'setHostVideoSize'; w: number; h: number }
  /** 素材库：导入一个素材（视频 / 图片） */
  | { type: 'addMediaAsset'; asset: MediaAsset }
  /** 素材库：移除一个素材（同时清掉引用它的图片片段） */
  | { type: 'removeMediaAsset'; id: string }
  /** 素材库：刷新后从 IndexedDB 恢复 objectURL（一次性批量替换整份素材列表） */
  | { type: 'setMediaAssets'; assets: MediaAsset[] }
  /** 素材库：把素材拖到轨道上生成一段片段（图片 / 视频都走这一条） */
  | { type: 'addMediaClipFromAsset'; assetId: string; start: number; track: number }
  | { type: 'addImageClip'; clip: ImageClip }
  | { type: 'updateImageClip'; id: string; patch: Partial<ImageClip> }
  | { type: 'removeImageClip'; id: string }
  /** 关键帧：在片段内第 t 秒打一个关键帧（同 t 覆盖） */
  | { type: 'addMediaKeyframe'; id: string; kf: MediaKeyframe }
  | { type: 'removeMediaKeyframe'; id: string; t: number }
  | { type: 'clearMediaKeyframes'; id: string }
  /** 时间轴：用户手动添加一条通用轨道（轨道数 +1） */
  | { type: 'addTrack' }
  /** 出镜素材条：拖整体 = 改起点，拖两端 = 截断（改入点 / 出点）；按 id 定位某一条 */
  | { type: 'setHostTrack'; id: string; track: HostTrack }
  /** 探测到出镜视频时长时写回素材条（首次导入用它初始化一条"整段全用"的素材） */
  | { type: 'setHostSourceDuration'; seconds: number }
  | { type: 'setHost'; patch: Partial<HostConfig> }
  /** 改全局字幕样式：整片口播字幕同步生效（改的是工程里那一份，不是逐张卡） */
  | { type: 'setSubtitleStyle'; patch: Partial<SubtitleStyle> }
  /** 口播字幕总开关：一键让整片字幕显示 / 不显示（只影响画不画，不动文案与时间轴） */
  | { type: 'setSubtitlesVisible'; visible: boolean }
  | { type: 'addHostClip'; at?: number; layout?: HostLayoutId }
  | { type: 'updateHostClip'; id: string; patch: Partial<HostClip> }
  /** 工程级默认：机位切换的过渡时长（秒） */
  | { type: 'setHostTransition'; seconds: number }
  | { type: 'setHostEase'; ease: EasingId }
  | { type: 'removeHostClip'; id: string }
  /** 删除一条出镜素材条（切开后把不要的那段删掉 = 中间挖洞） */
  | { type: 'removeHostTrack'; id: string }
  | { type: 'selectHostClip'; id: string | null }
  | { type: 'selectHostTrack'; id: string | null }
  | { type: 'selectImageClip'; id: string | null }
  /** 选中一个素材关键帧（时间轴菱形 / 参数面板关键帧列表） */
  | { type: 'selectMediaKeyframe'; clipId: string; t: number }
  /** 动效卡关键帧：打 / 删 / 清空 / 选中（与素材关键帧同构，作用对象是动效卡） */
  | { type: 'addCardKeyframe'; id: string; kf: CardKeyframe }
  | { type: 'removeCardKeyframe'; id: string; t: number }
  | { type: 'clearCardKeyframes'; id: string }
  | { type: 'selectCardKeyframe'; cardId: string; t: number }
  /** 通用剪刀：在播放头处把选中的素材一刀切开成两段 */
  | { type: 'splitAt' }
  | { type: 'setVideoSize'; w: number; h: number }
  | { type: 'setVideoContentSize'; w: number; h: number; offX: number; offY: number }
  | { type: 'setVideoOpacity'; opacity: number }
  | { type: 'toggleVideoVisible' }
  | { type: 'setPreviewMode'; mode: State['previewMode'] }
  | { type: 'setCanvasOrientation'; orientation: 'landscape' | 'portrait' }
  | { type: 'setZoom'; zoom: number }
  | { type: 'toggleGrid' }
  | { type: 'addInstance'; effectId: string }
  | { type: 'addSrtInstance'; srt: string; total: number; autoCards?: boolean }
  /** 在字幕轨上新增一张字幕卡；afterId 为空表示追加到轨尾 */
  | { type: 'addSubtitleCard'; afterId?: string | null; text?: string; duration?: number }
  | { type: 'select'; id: string | null }
  | { type: 'updateParam'; id: string; key: string; value: string | number | boolean }
  | { type: 'updateMeta'; id: string; patch: Partial<Pick<Instance, 'name' | 'start' | 'duration' | 'slot' | 'track' | 'seg' | 'dimAt' | 'lintOff' | 'fit' | 'free' | 'x' | 'y' | 'w' | 'h' | 'baseW' | 'baseH' | 'contentOffsetX' | 'contentOffsetY' | 'contentScale' | 'cardOpacity' | 'autoFit' | 'enter' | 'enterSpeed' | 'paint' | 'sfxOn' | 'sfxId' | 'sfxVolume' | 'sfxOffset' | 'sfxDuration' | 'offsetX' | 'offsetY' | 'animScale' | 'animOpacity'>> }
  | { type: 'replaceInstanceEffect'; id: string; effectId: string }
  /** 把一张卡恢复成「刚从库里拖出来」的样子：只重置参数与外观，不动它在时间轴上的位置 */
  | { type: 'resetInstance'; id: string }
  | { type: 'remove'; id: string }
  | { type: 'duplicate' }
  | { type: 'loadInstances'; instances: Instance[] }
  | { type: 'loadProject'; project: Project }
  | { type: 'resetProject' }
  | { type: 'registerPlugin'; def: EffectDef }
  /**
   * 按拓展包同步插件卡：保留 activeIds 里那些包的卡，其余包卡整体移除。
   * 卸载的动作统一由这一个入口做 —— 改每条卡的 register/unregister 迟早会漏。
   */
  | { type: 'syncPackPlugins'; activeIds: string[] }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'seek'; time: number }
  | { type: 'play' }
  | { type: 'pause' }
  | { type: 'setTime'; time: number }

function allEffects(state: State): EffectDef[] {
  return [...registry, ...state.plugins]
}

function effectById(state: State, id: string): EffectDef | undefined {
  return allEffects(state).find((e) => e.id === id)
}

/** 把预设套到一张卡上：参数总是覆盖，外观（尺寸/比例/透明度）只在预设里存了才覆盖 */
function applyPresetToInstance(inst: Instance, preset: CardPreset): Instance {
  const next: Instance = { ...inst, params: { ...inst.params, ...preset.params } }
  const s: PresetStyle | undefined = preset.style
  if (!s) return next
  if (s.fit) next.fit = s.fit
  if (s.w != null) next.w = s.w
  if (s.h != null) next.h = s.h
  if (s.contentScale != null) next.contentScale = s.contentScale
  if (s.cardOpacity != null) next.cardOpacity = s.cardOpacity
  return next
}

/** 时间轴硬上限（秒）：防止一次误拖把片段甩到天荒地老，1 小时足够长 */
export const MAX_TIMELINE = 3600

/**
 * 工程里所有内容的最晚结束时刻（秒）：动效卡 + 图片/视频素材片段 + 出镜素材条 都要算。
 * floor 是兜底值（空工程时用它）。
 */
export function contentEnd(project: Project, floor = 1): number {
  let end = floor
  for (const i of project.instances) {
    const e = (i.start ?? 0) + (i.duration ?? 0)
    if (e > end) end = e
  }
  for (const c of project.imageClips ?? []) {
    const e = (c.start ?? 0) + (c.duration ?? 0)
    if (e > end) end = e
  }
  for (const t of project.hostTracks ?? []) {
    const e = (t.start ?? 0) + (t.duration ?? 0)
    if (e > end) end = e
  }
  return Math.round(end * 1000) / 1000
}

/**
 * 工程时长 = 最后一个素材 / 动效的结束时刻 —— 不是用户填的数字，永远由内容算出来。
 * 把卡往右拖，时长自动变长；删掉末尾的卡，时长自动缩回。空工程给 1 秒兜底。
 */
export function derivedDuration(project: Project): number {
  return Math.max(1, contentEnd(project, 0))
}

/**
 * 内容结尾之后额外画出来的空白余量（秒）。
 * 轨道永远比内容长一截，右边才有地方可以继续往右拖 —— 拖过去之后内容变长，
 * 余量又跟着长出来，于是轨道实际上可以无限延伸。
 */
export function timelineTail(duration: number): number {
  return Math.max(10, Math.min(600, duration * 0.3))
}

/** 轨道右端的实际位置（含空白余量）：播放头最多能到这儿，标尺也画到这儿 */
export function timelineEnd(project: Project): number {
  const d = derivedDuration(project)
  return d + timelineTail(d)
}

function commitProject(
  state: State,
  project: Project,
  selectedId: string | null = state.selectedId,
  historyKey?: string,
): State {
  const last = state.history[state.history.length - 1]
  const history =
    historyKey && last?.key === historyKey
      ? state.history
      : [
          ...state.history,
          { project: state.project, selectedId: state.selectedId, key: historyKey },
        ].slice(-HISTORY_LIMIT)
  return { ...state, project, selectedId, history, future: [] }
}

function baseReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'setSkin':
      return commitProject(state, { ...state.project, skin: action.skin })
    case 'setStyle':
      return commitProject(state, { ...state.project, style: action.style })
    case 'setFont':
      return commitProject(state, { ...state.project, font: action.font })
    case 'setPalette': {
      const palette: Palette = {
        accent: action.palette.accent ?? state.project.palette.accent,
        data: action.palette.data ?? state.project.palette.data,
        special: action.palette.special ?? state.project.palette.special,
      }
      return commitProject(state, { ...state.project, palette }, state.selectedId, 'palette')
    }
    case 'clearCardAccents':
      return commitProject(state, {
        ...state.project,
        instances: state.project.instances.map((i) => ({ ...i, params: { ...i.params, accent: '' } })),
      })
    case 'savePreset':
      return commitProject(state, {
        ...state.project,
        presets: [
          ...state.project.presets.filter((p) => p.id !== action.preset.id),
          action.preset,
        ],
      })
    case 'applyPreset': {
      const preset = state.project.presets.find((p) => p.id === action.presetId)
      if (!preset) return state
      return commitProject(state, {
        ...state.project,
        instances: state.project.instances.map((i) =>
          i.id === action.targetId ? applyPresetToInstance(i, preset) : i,
        ),
      })
    }
    case 'applyPresetToAll': {
      const preset = state.project.presets.find((p) => p.id === action.presetId)
      if (!preset) return state
      return commitProject(state, {
        ...state.project,
        instances: state.project.instances.map((i) =>
          i.effectId === preset.effectId ? applyPresetToInstance(i, preset) : i,
        ),
      })
    }
    case 'renamePreset':
      return commitProject(state, {
        ...state.project,
        presets: state.project.presets.map((p) =>
          p.id === action.id ? { ...p, name: action.name.trim() || p.name } : p,
        ),
      })
    case 'deletePreset':
      return commitProject(state, {
        ...state.project,
        presets: state.project.presets.filter((p) => p.id !== action.id),
      })
    case 'setCardOpacity':
      return commitProject(
        state,
        { ...state.project, cardOpacity: Math.max(0, Math.min(1, action.opacity)) },
        state.selectedId,
        'cardOpacity',
      )
    case 'setCardSize':
      return commitProject(state, { ...state.project, cardSize: action.size }, state.selectedId, 'cardSize')
    case 'setSfxEnabled':
      return commitProject(
        state,
        { ...state.project, sfxEnabled: action.enabled },
        state.selectedId,
        'sfxEnabled',
      )
    case 'setSfxVolume':
      return commitProject(
        state,
        { ...state.project, sfxVolume: Math.max(0, Math.min(1, action.volume)) },
        state.selectedId,
        'sfxVolume',
      )
    case 'setSfxDefaultId':
      return commitProject(
        state,
        { ...state.project, sfxDefaultId: normalizeSfxId(action.id) },
        state.selectedId,
        'sfxDefaultId',
      )
    case 'setTrackH':
      // 下限 96px：5 条泳道 × 12px + 标尺/滚动条 34px 刚好放得下，不触发纵向滚动
      return { ...state, trackH: Math.max(96, Math.min(560, action.height)) }
    case 'setLayout':
      return commitProject(state, { ...state.project, layout: action.layout })
    case 'setFps':
      return commitProject(state, { ...state.project, fps: action.fps }, state.selectedId, 'fps')
    // 注：这里没有 setDuration —— 工程时长由内容决定（见 derivedDuration），不提供手动填写。
    case 'setName':
      return commitProject(state, { ...state.project, name: action.name }, state.selectedId, 'name')
    case 'addInstance': {
      const def = effectById(state, action.effectId)
      if (!def) return state
      // 口播字幕不走普通动效那条路：它属于字幕轨，必须按句排好、不与邻居重叠
      if (def.id === 'srt-subtitle') {
        const prev = state.project.instances.find((i) => i.id === state.selectedId)
        const afterId = prev && isSubtitle(prev) ? prev.id : null
        const { instances, id } = insertSubtitleCard(
          state.project.instances,
          afterId,
          def.defaultParams,
          uid,
        )
        return commitProject(state, { ...state.project, instances }, id)
      }
      const idx = state.project.instances.length
      const fit = defaultFitFor(def.id)
      // 铺满画布的卡默认居中，其余按左右交替
      const slot: SlotId = fit === 'full' ? 'center' : idx % 2 === 0 ? 'left' : 'right'
      // 新卡落到对应的通用轨道（左→轨道1、右→轨道2、居中→轨道3…），方便直接在轨道上排布
      const track = SLOT_TRACK[slot] ?? 1
      const inst: Instance = {
        id: uid(),
        effectId: def.id,
        name: def.name,
        // 就落在播放头处，不再被工程时长往回拉（时长本身会跟着新卡自动变长）
        start: Math.max(0, Math.min(state.currentTime, MAX_TIMELINE - 2)),
        duration: Number(def.defaultParams.duration ?? 2),
        slot,
        track,
        fit,
        paint: [],
        params: { ...def.defaultParams },
      }
      return commitProject(
        state,
        { ...state.project, instances: [...state.project.instances, inst] },
        inst.id,
      )
    }
    case 'addSrtInstance': {
      const cues = parseSrt(action.srt)
      if (!cues.length) return state
      const def = effectById(state, 'srt-subtitle')
      if (!def) return state
      // 一句一张卡：每条 cue 生成一张独立的字幕卡，全部落在同一条字幕轨上
      const { srt: _legacy, ...subtitleBase } = def.defaultParams
      const subtitles: Instance[] = buildSubtitleInstances(
        planSubtitleCards(cues),
        subtitleBase,
        uid,
      )
      if (!subtitles.length) return state
      const subtitle = subtitles[0]
      const instances: Instance[] = [...subtitles]

      if (action.autoCards) {
        const chunks = chunkCues(cues)
        const suggestions = suggestCardsForChunks(chunks)
        chunks.forEach((chunk, chunkIndex) => {
          const suggestion = suggestions[chunkIndex]
          if (!suggestion) return
          const start = chunk[0].start / 1000
          const end = chunk[chunk.length - 1].end / 1000
          const def = effectById(state, suggestion.effectId) ?? effectById(state, 'bullet-list')
          if (!def) return
          // 开场 / 收尾用铺满，论述段用内容自适应
          const fit: CardFit = suggestion.role === 'body' ? 'auto' : 'full'
          instances.push({
            id: uid(),
            effectId: def.id,
            name: `${def.name} ${String(chunkIndex + 1).padStart(2, '0')}`,
            start,
            duration: Math.max(0.5, end - start),
            slot: fit === 'full' ? 'center' : chunkIndex % 2 === 0 ? 'left' : 'right',
            fit,
            paint: [],
            params: {
              ...def.defaultParams,
              ...suggestion.params,
            },
            director: suggestion.director,
          })
        })
      }

      return commitProject(
        state,
        // 时长不用管：syncDuration 会按最后一个内容的结尾重算
        {
          ...state.project,
          instances: [...state.project.instances, ...instances],
        },
        subtitle.id,
      )
    }
    case 'addSubtitleCard': {
      const def = effectById(state, 'srt-subtitle')
      if (!def) return state
      const { srt: _legacy, ...base } = def.defaultParams
      const { instances, id } = insertSubtitleCard(
        state.project.instances,
        action.afterId ?? null,
        base,
        uid,
        { text: action.text ?? '', duration: action.duration ?? DEFAULT_SUBTITLE_DURATION },
      )
      // 时长不用管：syncDuration 会按最后一个内容的结尾重算
      return commitProject(state, { ...state.project, instances }, id)
    }
    case 'select':
      // 选中卡时清掉机位段 / 素材条 / 图片片段 / 关键帧的选中，避免剪刀「同时选中两样」切错对象
      return { ...state, selectedId: action.id, selectedHostClipId: null, selectedHostTrackId: null, selectedImageClipId: null, selectedMediaKeyframe: null, selectedCardKeyframe: null }
    case 'updateParam':
      return commitProject(
        state,
        {
          ...state.project,
          instances: state.project.instances.map((i) =>
            i.id === action.id ? { ...i, params: { ...i.params, [action.key]: action.value } } : i,
          ),
        },
        state.selectedId,
        `param:${action.id}:${action.key}`,
      )
    case 'updateMeta': {
      // 字幕卡的时间改动要先夹到「不越界、不与邻居重叠」的范围内，
      // 这样时间轴上无论怎么拖，轨道内始终按时间有序且不重叠。
      const target = state.project.instances.find((i) => i.id === action.id)
      const timePatch =
        target && isSubtitle(target) && (action.patch.start != null || action.patch.duration != null)
          ? clampSubtitleRange(state.project.instances, action.id, {
              start: action.patch.start ?? target.start,
              duration: action.patch.duration ?? target.duration,
            })
          : null
      // 尺寸模式一变就是重新排版：卡内内容偏移一律归零。
      // 否则上一档调好的位置会把文字顶到新外框外面（切半屏 / 铺满时尤其明显）。
      // 放在 reducer 里兜底，面板下拉、画布拖 resizer、宽高数字输入等所有入口都自动生效。
      const fitChanged =
        target != null && action.patch.fit != null && action.patch.fit !== (target.fit ?? 'auto')
      const patch = {
        ...(timePatch ? { ...action.patch, ...timePatch } : action.patch),
        ...(fitChanged ? { contentOffsetX: 0, contentOffsetY: 0 } : {}),
      }
      return commitProject(
        state,
        {
          ...state.project,
          instances: state.project.instances.map((i) => (i.id === action.id ? { ...i, ...patch } : i)),
        },
        state.selectedId,
        `meta:${action.id}`,
      )
    }
    case 'replaceInstanceEffect': {
      const source = state.project.instances.find((i) => i.id === action.id)
      const def = effectById(state, action.effectId)
      if (!source || !def) return state
      const sharedParams: Record<string, string | number | boolean> = {}
      const clampValue = (key: string, val: string | number | boolean) => {
        if (typeof val !== 'number') return val
        const schema = def.schema.find((s) => s.key === key)
        if (
          schema &&
          (schema.type === 'number' || schema.type === 'range') &&
          schema.min != null &&
          schema.max != null
        ) {
          return Math.min(schema.max, Math.max(schema.min, val))
        }
        return val
      }
      for (const [key, value] of Object.entries(source.params)) {
        if (key in def.defaultParams) {
          sharedParams[key] = clampValue(key, value)
          continue
        }
        for (const target of PARAM_TRANSFER[key] ?? []) {
          if (target in def.defaultParams && !(target in sharedParams)) {
            sharedParams[target] = clampValue(target, value)
            break
          }
        }
      }
      // 尺寸跟着新动效走：不继承上一张卡量过的宽高 / 缩放，
      // 否则换了动效画面尺寸还是旧的那套，看起来像没换干净。
      // 这里刻意只保留 addInstance 会写的那些字段 —— 换完的卡就该和刚从库里拖进来的卡一样。
      const fit = defaultFitFor(def.id)
      const replacement: Instance = {
        ...source,
        effectId: def.id,
        name: def.name,
        params: { ...def.defaultParams, ...sharedParams },
        duration: Number(def.defaultParams.duration ?? source.duration ?? 2),
        fit,
        // 与 addInstance 保持一致：新卡不写 autoFit，换完的卡也不写
        autoFit: undefined,
        w: undefined,
        h: undefined,
        baseW: undefined,
        baseH: undefined,
        contentScale: undefined,
        // 铺满画布的卡不接受自由定位（和参数面板切到「铺满画布」时的处理保持一致）
        ...(fit === 'full' ? { free: false, x: undefined, y: undefined } : {}),
      }
      return commitProject(
        state,
        {
          ...state.project,
          instances: state.project.instances.map((i) =>
            i.id === action.id ? replacement : i,
          ),
        },
        state.selectedId,
      )
    }
    case 'resetInstance': {
      const source = state.project.instances.find((i) => i.id === action.id)
      const def = effectById(state, source?.effectId ?? '')
      if (!source || !def) return state
      const fit = defaultFitFor(def.id)
      // 用「重建对象 + 显式置 undefined」而不是 delete，既让可选字段真的回到未设置，
      // 又避免 any。JSON 序列化时 undefined 会被剔除，存档里不会留下空 key。
      const reset: Instance = {
        // 编排信息一律保留：起点、时长、位置、段落、名字、导演备注都不是「卡片外观」
        id: source.id,
        effectId: source.effectId,
        name: source.name,
        start: source.start,
        duration: source.duration,
        slot: source.slot,
        seg: source.seg,
        dimAt: source.dimAt,
        lintOff: source.lintOff,
        director: source.director,
        // 内容参数回到动效出厂值（字幕卡的 text 也会被清空 —— 有 undo 兜底）
        params: { ...def.defaultParams },
        // 外观与尺寸覆盖全部清掉，回到「刚从库里拖出来」的样子
        fit,
        autoFit: undefined,
        free: undefined,
        x: undefined,
        y: undefined,
        w: undefined,
        h: undefined,
        baseW: undefined,
        baseH: undefined,
        contentScale: undefined,
        cardOpacity: undefined,
        // 入场方式与速度也回到默认（未设置 = 淡入 + 1 倍速）
        enter: undefined,
        enterSpeed: undefined,
        paint: [],
      }
      return commitProject(
        state,
        {
          ...state.project,
          instances: state.project.instances.map((i) => (i.id === action.id ? reset : i)),
        },
        state.selectedId,
        `reset:${action.id}`,
      )
    }
    case 'remove':
      {
        const project = {
          ...state.project,
          instances: state.project.instances.filter((i) => i.id !== action.id),
        }
        const selectedId =
          state.selectedId === action.id ? project.instances[0]?.id ?? null : state.selectedId
        return commitProject(state, project, selectedId)
      }
    case 'duplicate': {
      const source = state.project.instances.find((i) => i.id === state.selectedId)
      if (!source) return state
      // 字幕卡复制 = 在它后面插一张同文案的卡（后续句子自动后移），
      // 不能直接照抄时间，否则会和原句重叠。
      if (isSubtitle(source)) {
        const { srt: _legacy, ...base } = source.params
        const { instances, id } = insertSubtitleCard(
          state.project.instances,
          source.id,
          base,
          uid,
          { text: String(source.params.text ?? ''), duration: Math.max(MIN_SUBTITLE_DURATION, source.duration) },
        )
        return commitProject(state, { ...state.project, instances }, id)
      }
      const copy: Instance = {
        ...source,
        id: uid(),
        name: `${source.name} 副本`,
        // 副本紧挨着原件末尾排，不夹工程时长
        start: Math.max(0, Math.min(source.start + source.duration, MAX_TIMELINE - source.duration)),
        params: { ...source.params },
      }
      return commitProject(
        state,
        { ...state.project, instances: [...state.project.instances, copy] },
        copy.id,
      )
    }
    case 'loadInstances':
      return commitProject(
        state,
        { ...state.project, instances: action.instances },
        action.instances[0]?.id ?? null,
      )
    case 'setVideo':
      return {
        ...state,
        videoUrl: action.url,
        videoName: action.name ?? null,
        videoVisible: action.url != null,
        videoW: 0,
        videoH: 0,
        videoContentW: 0,
        videoContentH: 0,
        videoContentOffX: 0,
        videoContentOffY: 0,
        // 新视频重新允许自动跟随方向
        orientationOverridden: false,
      }
    case 'setHostVideo':
      return {
        ...state,
        hostUrl: action.url,
        hostName: action.name ?? null,
        hostW: 0,
        hostH: 0,
        selectedHostClipId: null,
        selectedHostTrackId: null,
        // 第一次导入出镜视频时自动给一个常用布局（右下圆）
        project:
          action.url != null && state.project.host.layout === 'off'
            ? { ...state.project, host: { ...state.project.host, layout: 'circle-br' } }
            : state.project,
      }
    case 'addHostTrackAt': {
      const sd = Math.max(MIN_HOST_TRACK, action.sourceDuration)
      const start = Math.max(0, Math.min(action.start, MAX_TIMELINE - MIN_HOST_TRACK))
      const track: HostTrack = {
        id: hostTrackId(),
        start,
        duration: Math.max(MIN_HOST_TRACK, Math.min(sd, MAX_TIMELINE - start)),
        trimIn: 0,
        sourceDuration: sd,
      }
      return {
        ...state,
        hostUrl: action.url ?? state.hostUrl,
        hostName: action.name ?? state.hostName,
        hostW: 0,
        hostH: 0,
        selectedHostClipId: null,
        selectedHostTrackId: track.id,
        project: { ...state.project, hostTracks: [...state.project.hostTracks, track] },
      }
    }
    case 'setHostVideoSize':
      if (action.w <= 0 || action.h <= 0) return state
      return { ...state, hostW: action.w, hostH: action.h }
    case 'addMediaAsset':
      return { ...state, project: { ...state.project, mediaAssets: [...state.project.mediaAssets, action.asset] } }
    case 'removeMediaAsset':
      // 同时清掉引用它的图片片段，避免悬空引用
      return {
        ...state,
        project: {
          ...state.project,
          mediaAssets: state.project.mediaAssets.filter((a) => a.id !== action.id),
          imageClips: state.project.imageClips.filter((c) => c.assetId !== action.id),
        },
      }
    case 'setMediaAssets':
      // 刷新后 IndexedDB 恢复出来的 objectURL 列表，直接替换（不走撤销历史）
      return { ...state, project: { ...state.project, mediaAssets: action.assets } }
    case 'addMediaClipFromAsset': {
      const asset = state.project.mediaAssets.find((a) => a.id === action.assetId)
      if (!asset) return state
      const host = state.project.host
      const isVideo = asset.kind === 'video'
      // 视频默认铺满源时长（上限 10s，避免一拖进来就占满整条片），图片给 3s
      const wantDuration = isVideo ? Math.min(asset.duration || 5, 10) : 3
      const start = Math.max(0, Math.min(action.start, MAX_TIMELINE - 0.2))
      const duration = Math.max(0.2, Math.min(wantDuration, MAX_TIMELINE - start))
      // 图片按原始宽高等比塞进画布中间；视频按 16:9 铺一块，再由「出镜画面」设置调
      const baseW = isVideo ? 640 : Math.min(960, asset.width || 960)
      const baseH = isVideo
        ? 360
        : Math.max(1, Math.round((baseW * (asset.height || 540)) / (asset.width || 960)))
      const clip: ImageClip = {
        id: `img_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
        assetId: asset.id,
        start,
        duration,
        x: Math.round((1920 - baseW) / 2),
        y: Math.round((1080 - baseH) / 2),
        w: baseW,
        h: baseH,
        opacity: 1,
        radius: host.radius,
        track: Math.max(1, action.track),
        focalX: host.focalX,
        focalY: host.focalY,
        zoom: host.zoom,
        borderWidth: host.borderWidth,
        borderColor: host.borderColor,
        mirror: host.mirror,
        shadow: host.shadow,
        entrance: 'none',
        entranceDur: 0.6,
        ...(isVideo
          ? { trimIn: 0, sourceDuration: asset.duration || duration }
          : {}),
      }
      return commitProject(
        state,
        { ...state.project, imageClips: [...state.project.imageClips, clip] },
        clip.id,
      )
    }
    case 'addImageClip':
      return commitProject(
        state,
        { ...state.project, imageClips: [...state.project.imageClips, action.clip] },
        action.clip.id,
      )
    case 'updateImageClip':
      return commitProject(state, {
        ...state.project,
        imageClips: state.project.imageClips.map((c) => (c.id === action.id ? { ...c, ...action.patch } : c)),
      })
    case 'addCardKeyframe':
      return commitProject(state, {
        ...state.project,
        instances: state.project.instances.map((i) => {
          if (i.id !== action.id) return i
          // 同一时间点只留一个：重复打帧视为覆盖（和素材关键帧一致）
          const keys = [...(i.keyframes ?? [])].filter((k) => Math.abs(k.t - action.kf.t) > 0.001)
          return { ...i, keyframes: [...keys, action.kf].sort((a, b) => a.t - b.t) }
        }),
      })
    case 'removeCardKeyframe': {
      const next = commitProject(state, {
        ...state.project,
        instances: state.project.instances.map((i) =>
          i.id === action.id
            ? { ...i, keyframes: (i.keyframes ?? []).filter((k) => Math.abs(k.t - action.t) > 0.001) }
            : i,
        ),
      })
      const sel = state.selectedCardKeyframe
      return sel && sel.cardId === action.id && Math.abs(sel.t - action.t) < 0.001
        ? { ...next, selectedCardKeyframe: null }
        : next
    }
    case 'clearCardKeyframes': {
      const next = commitProject(state, {
        ...state.project,
        instances: state.project.instances.map((i) =>
          i.id === action.id ? { ...i, keyframes: [] } : i,
        ),
      })
      const sel = state.selectedCardKeyframe
      return sel && sel.cardId === action.id ? { ...next, selectedCardKeyframe: null } : next
    }
    case 'selectCardKeyframe':
      // 选中卡关键帧时同时选中这张卡（参数面板切到卡的编辑器），并清掉素材侧的选中
      return {
        ...state,
        selectedId: action.cardId,
        selectedImageClipId: null,
        selectedHostClipId: null,
        selectedHostTrackId: null,
        selectedMediaKeyframe: null,
        selectedCardKeyframe: { cardId: action.cardId, t: action.t },
      }
    case 'addMediaKeyframe':
      return commitProject(state, {
        ...state.project,
        imageClips: state.project.imageClips.map((c) => {
          if (c.id !== action.id) return c
          const keys = [...(c.keyframes ?? [])].filter((k) => Math.abs(k.t - action.kf.t) > 0.001)
          return { ...c, keyframes: [...keys, action.kf].sort((a, b) => a.t - b.t) }
        }),
      })
    case 'removeMediaKeyframe': {
      const next = commitProject(state, {
        ...state.project,
        imageClips: state.project.imageClips.map((c) =>
          c.id === action.id
            ? { ...c, keyframes: (c.keyframes ?? []).filter((k) => Math.abs(k.t - action.t) > 0.001) }
            : c,
        ),
      })
      const sel = state.selectedMediaKeyframe
      return sel && sel.clipId === action.id && Math.abs(sel.t - action.t) < 0.001
        ? { ...next, selectedMediaKeyframe: null, selectedCardKeyframe: null }
        : next
    }
    case 'clearMediaKeyframes': {
      const next = commitProject(state, {
        ...state.project,
        imageClips: state.project.imageClips.map((c) =>
          c.id === action.id ? { ...c, keyframes: [] } : c,
        ),
      })
      const sel = state.selectedMediaKeyframe
      return sel && sel.clipId === action.id ? { ...next, selectedMediaKeyframe: null, selectedCardKeyframe: null } : next
    }
    case 'removeImageClip': {
      const next = commitProject(state, {
        ...state.project,
        imageClips: state.project.imageClips.filter((c) => c.id !== action.id),
      })
      const sel = state.selectedMediaKeyframe
      return {
        ...next,
        selectedImageClipId: state.selectedImageClipId === action.id ? null : state.selectedImageClipId,
        selectedMediaKeyframe: sel && sel.clipId === action.id ? null : sel,
      }
    }
    case 'selectImageClip':
      // 选中素材片段时清掉卡 / 机位段 / 素材条 / 关键帧的选中，参数面板只编辑这一份
      return { ...state, selectedImageClipId: action.id, selectedId: null, selectedHostClipId: null, selectedHostTrackId: null, selectedMediaKeyframe: null, selectedCardKeyframe: null }
    case 'selectMediaKeyframe':
      // 选中关键帧时同时选中所属片段（参数面板切到素材编辑器），并清掉其它对象的选中
      return {
        ...state,
        selectedImageClipId: action.clipId,
        selectedId: null,
        selectedHostClipId: null,
        selectedHostTrackId: null,
        selectedMediaKeyframe: { clipId: action.clipId, t: action.t },
        selectedCardKeyframe: null,
      }
    case 'addTrack':
      return { ...state, trackCount: state.trackCount + 1 }
    case 'setHostTrack':
      return commitProject(
        state,
        {
          ...state.project,
          hostTracks: state.project.hostTracks.map((tk) => (tk.id === action.id ? action.track : tk)),
        },
        state.selectedId,
        'hostTrack',
      )
    case 'setHostSourceDuration': {
      if (!(action.seconds > 0)) return state
      // 换了素材（时长对不上）就按新时长重建裁剪区间：旧入点可能已经超出新视频
      const cur = state.project.hostTracks[0]
      const sameSource = cur != null && Math.abs(cur.sourceDuration - action.seconds) < 0.05
      if (sameSource) return state
      const track =
        normalizeHostTrack({ start: cur?.start ?? 0, duration: cur?.duration, trimIn: cur?.trimIn ?? 0, sourceDuration: action.seconds }) ??
        defaultHostTrack(action.seconds)
      return commitProject(state, { ...state.project, hostTracks: [track] }, state.selectedId, 'hostTrack')
    }
    case 'setHost':
      return commitProject(state, {
        ...state.project,
        host: { ...state.project.host, ...action.patch },
      })
    case 'setSubtitleStyle': {
      const subtitleStyle = { ...state.project.subtitleStyle, ...action.patch }
      // 切全局位置时把之前被单独拖开的字幕收回来：自由定位优先于 slot，
      // 不收回的话它们会各自停在原处，看起来就像没同步。
      const instances = action.patch.slot
        ? state.project.instances.map((i) =>
            isSubtitle(i) && i.free ? { ...i, free: undefined, x: undefined, y: undefined } : i,
          )
        : state.project.instances
      return commitProject(
        state,
        { ...state.project, subtitleStyle, instances },
        state.selectedId,
        'subtitleStyle',
      )
    }
    case 'setSubtitlesVisible':
      return commitProject(
        state,
        { ...state.project, subtitlesVisible: action.visible },
        state.selectedId,
        'subtitlesVisible',
      )
    case 'addHostClip': {
      const at = action.at ?? state.currentTime
      const duration = 5
      // 起点对齐到 0.1s：播放头拖动/点击时间轴会给很长的浮点尾数
      // （8s 会变成 7.9928…），段标题和拖拽都会很难看
      const start = Math.max(0, Math.min(MAX_TIMELINE - 0.5, Math.round(at * 10) / 10))
      const clip: HostClip = {
        id: uid(),
        start,
        duration: Math.min(duration, MAX_TIMELINE - start),
        layout: action.layout ?? state.project.host.layout === 'off'
          ? 'circle-br'
          : state.project.host.layout,
        // 新段继承工程默认的过渡时长：加段就应该是"慢慢挪过去"，硬切要用户自己改回 0
        transition: state.project.hostTransition ?? DEFAULT_HOST_TRANSITION,
        ease: state.project.hostEase ?? DEFAULT_HOST_EASE,
      }
      return {
        ...commitProject(state, { ...state.project, hostClips: [...state.project.hostClips, clip] }),
        selectedHostClipId: clip.id,
      }
    }
    case 'updateHostClip':
      return commitProject(state, {
        ...state.project,
        hostClips: state.project.hostClips.map((c) =>
          c.id === action.id ? { ...c, ...action.patch } : c,
        ),
      })
    case 'setHostTransition':
      return commitProject(
        state,
        {
          ...state.project,
          hostTransition: Math.max(0, Math.min(MAX_HOST_TRANSITION, action.seconds)),
        },
        state.selectedId,
        'hostTransition',
      )
    case 'setHostEase':
      return commitProject(
        state,
        { ...state.project, hostEase: action.ease },
        state.selectedId,
        'hostEase',
      )
    case 'removeHostClip':
      return {
        ...commitProject(state, {
          ...state.project,
          hostClips: state.project.hostClips.filter((c) => c.id !== action.id),
        }),
        selectedHostClipId:
          state.selectedHostClipId === action.id ? null : state.selectedHostClipId,
      }
    case 'removeHostTrack':
      return {
        ...commitProject(state, {
          ...state.project,
          hostTracks: state.project.hostTracks.filter((tk) => tk.id !== action.id),
        }),
        selectedHostTrackId:
          state.selectedHostTrackId === action.id ? null : state.selectedHostTrackId,
      }
    case 'selectHostClip':
      return { ...state, selectedHostClipId: action.id, selectedHostTrackId: null, selectedId: null, selectedImageClipId: null, selectedMediaKeyframe: null, selectedCardKeyframe: null }
    case 'selectHostTrack':
      // 选中素材条时清掉机位段与卡的选中，免得参数面板 / 剪刀同时编辑两份
      return { ...state, selectedHostTrackId: action.id, selectedHostClipId: null, selectedId: null, selectedImageClipId: null, selectedMediaKeyframe: null, selectedCardKeyframe: null }
    case 'splitAt': {
      const result = applySplit(
        state.project,
        {
          selectedId: state.selectedId,
          selectedHostClipId: state.selectedHostClipId,
          selectedHostTrackId: state.selectedHostTrackId,
        },
        state.currentTime,
        uid,
      )
      if (!result) return state
      return {
        ...commitProject(state, result.project, result.selectedId),
        selectedHostClipId: result.selectedHostClipId,
        selectedHostTrackId: result.selectedHostTrackId,
      }
    }
    case 'setVideoSize':
      if (action.w <= 0 || action.h <= 0) return state
      return {
        ...state,
        videoW: action.w,
        videoH: action.h,
        // 自动识别：画布方向跟随视频方向（横屏视频→横屏画布，竖屏视频→竖屏画布），
        // 除非用户手动覆盖过方向
        canvasOrientation: state.orientationOverridden
          ? state.canvasOrientation
          : action.w >= action.h
            ? 'landscape'
            : 'portrait',
      }
    case 'setVideoContentSize':
      if (action.w <= 0 || action.h <= 0) return state
      return { ...state, videoContentW: action.w, videoContentH: action.h, videoContentOffX: action.offX, videoContentOffY: action.offY }
    case 'setVideoOpacity':
      return { ...state, videoOpacity: Math.max(0, Math.min(1, action.opacity)) }
    case 'toggleVideoVisible':
      return { ...state, videoVisible: !state.videoVisible }
    case 'setPreviewMode':
      return { ...state, previewMode: action.mode }
    case 'setCanvasOrientation': {
      if (action.orientation === state.canvasOrientation) return state
      // 翻转画布时只有「自定义」档需要跟着搬：其他预设存的是 0~1 比例，
      // 横竖屏各有一套（见 hostLayouts 的 portrait 覆盖），天然自适应；
      // 自定义存的是绝对像素，不按比例换算就会落到新画布外面。
      const host = state.project.host
      const nextHost =
        host.layout === 'custom'
          ? {
              ...host,
              ...remapRectOrientation(
                { x: host.x, y: host.y, w: host.w, h: host.h },
                state.canvasOrientation,
                action.orientation,
              ),
            }
          : null
      return {
        ...state,
        canvasOrientation: action.orientation,
        orientationOverridden: true,
        ...(nextHost ? { project: { ...state.project, host: nextHost } } : null),
      }
    }
    case 'setZoom':
      return { ...state, zoom: Math.max(0.5, Math.min(2, action.zoom)) }
    case 'toggleGrid':
      return { ...state, showGrid: !state.showGrid }
    case 'loadProject':
      return {
        ...commitProject(
          state,
          normalizeProject(action.project),
          action.project.instances[0]?.id ?? null,
        ),
        playing: false,
      }

    case 'resetProject': {
      // 回到空白编辑台时套用个人偏好里的外观（皮肤 / 配色 / 字体 / 尺寸档）：
      // 历史版本面板「记录我的偏好」积累的习惯，在这里自动生效
      return {
        ...state,
        project: {
          ...applyLook({
            ...DEFAULT_PROJECT,
            name: '未命名工程',
            instances: [],
          }),
        },
        selectedId: null,
        history: [],
        future: [],
        currentTime: 0,
        playing: false,
        plugins: [],
        videoUrl: null,
        videoName: null,
        videoW: 1920,
        videoH: 1080,
        videoContentW: 0,
        videoContentH: 0,
        videoContentOffX: 0,
        videoContentOffY: 0,
        videoOpacity: 0.92,
        videoVisible: false,
        hostUrl: null,
        hostName: null,
        hostW: 0,
        hostH: 0,
        selectedHostClipId: null,
        selectedHostTrackId: null,
        selectedImageClipId: null,
        selectedMediaKeyframe: null,
        selectedCardKeyframe: null,
        previewMode: 'stack',
        canvasOrientation: 'landscape',
        orientationOverridden: false,
        zoom: 1,
        showGrid: false,
        trackH: 200,
        trackCount: 5,
      }
    }
    case 'registerPlugin':
      if (state.plugins.some((p) => p.id === action.def.id)) return state
      return { ...state, plugins: [...state.plugins, action.def] }
    case 'syncPackPlugins': {
      const keep = new Set(action.activeIds)
      // 只动「有包归属」的插件：纯粹手注进来的插件（packId 为空）不该被这次同步误删
      const plugins = state.plugins.filter((p) => !p.packId || keep.has(p.packId))
      if (plugins.length === state.plugins.length) return state
      return { ...state, plugins }
    }
    case 'undo': {
      if (!state.history.length) return state
      const prev = state.history[state.history.length - 1]
      return {
        ...state,
        project: prev.project,
        selectedId: prev.selectedId,
        history: state.history.slice(0, -1),
        future: [
          { project: state.project, selectedId: state.selectedId },
          ...state.future,
        ].slice(0, HISTORY_LIMIT),
        playing: false,
      }
    }
    case 'redo': {
      if (!state.future.length) return state
      const next = state.future[0]
      return {
        ...state,
        project: next.project,
        selectedId: next.selectedId,
        history: [
          ...state.history,
          { project: state.project, selectedId: state.selectedId },
        ].slice(-HISTORY_LIMIT),
        future: state.future.slice(1),
        playing: false,
      }
    }
    case 'seek':
      // 上限是"轨道右端"而不是工程时长：内容后面那段空白也要能拖过去，否则没法在末尾之后起新卡
      return {
        ...state,
        currentTime: Math.max(0, Math.min(timelineEnd(state.project), action.time)),
      }
    case 'play':
      return { ...state, playing: true }
    case 'pause':
      return { ...state, playing: false }
    case 'setTime':
      return {
        ...state,
        currentTime: Math.max(0, Math.min(timelineEnd(state.project), action.time)),
      }
    default:
      return state
  }
}

/**
 * 每次 action 之后把 project.duration 重算成「最后一个内容的结束时刻」。
 * 放在总 reducer 出口做，读写 duration 的地方就不用各自操心，结果永远一致。
 */
function syncDuration(state: State): State {
  const d = derivedDuration(state.project)
  if (Math.abs(d - state.project.duration) < 0.001) return state
  return { ...state, project: { ...state.project, duration: d } }
}

/**
 * 在 baseReducer 外面套一层，维护 `static` 快照的引用稳定性。
 * 播放时每帧的 setTime 都会换新 state，但只要非时间字段没变就复用同一份 static 快照，
 * 于是只订阅 useEditor() 的组件（动效库、参数面板…）不会被播放头带着每帧重渲染。
 */
function reducer(state: State, action: Action): State {
  const next = syncDuration(baseReducer(state, action))
  if (next === state) return state
  if (next.static && onlyPlayheadMoved(state, next)) {
    return { ...next, static: state.static }
  }
  const { currentTime: _playhead, static: _snapshot, ...rest } = next
  return { ...next, static: rest }
}

/** 旧工程没有 fit 字段：按卡的画面模式推断；手动缩放过的保留为自定义尺寸 */
function migrateFit(i: Instance): CardFit {
  if (i.fit) return i.fit
  if (i.free && i.autoFit === false && i.w) return 'box'
  return defaultFitFor(i.effectId)
}

/** 旧工程 accent 默认写死为 #5ac8fa，迁移为空串表示跟随主题色 */
const LEGACY_ACCENT = '#5ac8fa'

/**
 * 一次性换算：旧版本把「背景透明度」又乘了一次卡片底色自带的 alpha。
 * 例如深色玻璃卡底色是 rgba(8,8,12,0.42)，工程里存 0.65 时实际覆盖率只有
 * 0.42 × 0.65 ≈ 0.27 —— 这也是"调到 100% 还是有底"的根因之一。
 * 现在滑杆就是真实覆盖率，所以要把存量工程的数值换算成等价的新值，观感保持不变。
 * 用工程上的 cardOpacityV2 标记防重，导入导出 / 无头渲染都幂等。
 */
function migrateCardOpacityScale(project: Project): Project {
  if (project.cardOpacityV2) return project
  const skin = skins[project.skin] ?? skins.dark
  const tint =
    project.style === 'flat'
      ? skin.canvasVars['--stage-surface-strong']
      : skin.canvasVars['--stage-card-bg']
  const t = alphaOfCssColor(tint)
  const next = Math.round(Math.max(0, Math.min(1, project.cardOpacity * t)) * 100) / 100
  return { ...project, cardOpacity: next, cardOpacityV2: true }
}

function normalizeProject(p: Project): Project {
  // 旧工程里的「一整轨 SRT 长卡」拆成一句一张卡（可重复执行：拆完的卡带 params.text）
  const split: Instance[] = []
  for (const i of p.instances ?? []) {
    const parts = splitLegacySubtitleInstance(i, uid)
    if (parts) split.push(...parts)
    else split.push(i)
  }
  const instances = normalizeSubtitleTrack(split)
  // 兼容旧版工程 JSON（缺 style/font/palette 字段时补默认）
  const base = migrateCardOpacityScale({
    ...p,
    style: p.style ?? 'glass',
    font: (p.font as string) === 'mono' ? 'sans' : (p.font ?? 'sans'),
    palette: {
      accent: p.palette?.accent ?? DEFAULT_PALETTE.accent,
      data: p.palette?.data ?? DEFAULT_PALETTE.data,
      special: p.palette?.special ?? DEFAULT_PALETTE.special,
    },
    cardOpacity: typeof p.cardOpacity === 'number' ? Math.max(0, Math.min(1, p.cardOpacity)) : DEFAULT_CARD_OPACITY,
    cardSize: normalizeCardSize(p.cardSize),
    // 音效：老工程没有这几个字段，补默认值（总开关按「开」，让老工程打开就有声音）
    sfxEnabled: p.sfxEnabled !== false,
    sfxVolume:
      typeof p.sfxVolume === 'number'
        ? Math.max(0, Math.min(1, p.sfxVolume))
        : DEFAULT_SFX_VOLUME,
    sfxDefaultId: p.sfxDefaultId ? normalizeSfxId(p.sfxDefaultId) : DEFAULT_SFX_ID,
    fps: p.fps ?? 30,
    duration: p.duration ?? 12,
    layout: p.layout ?? 'edit',
    skin: (p.skin as string) === 'mono' ? 'dark' : (p.skin ?? 'dark'),
    name: p.name ?? '未命名工程',
    instances: instances.map((i) => ({
      ...i,
      fit: migrateFit(i),
      paint: i.paint ?? [],
      params:
        String(i.params?.accent ?? '') === LEGACY_ACCENT
          ? { ...i.params, accent: '' }
          : { ...i.params },
    })),
    presets: (p.presets ?? []).filter((x) => x && x.id && x.effectId),
    host: { ...DEFAULT_HOST, ...(p.host ?? {}) },
    hostClips: (p.hostClips ?? []).filter((c) => c && c.id),
    // 旧工程没有这个字段：补默认值，等于打开工程就自动获得平滑过渡
    hostTransition:
      typeof p.hostTransition === 'number'
        ? Math.max(0, Math.min(MAX_HOST_TRANSITION, p.hostTransition))
        : DEFAULT_HOST_TRANSITION,
    hostEase: normalizeEase(p.hostEase),
    // 没配素材条的旧工程保持原样（= 视频与项目 1:1、全程出镜）；
    // 旧字段 hostTrack（单条）在这里并入 hostTracks 数组。
    hostTracks: normalizeHostTracks(p.hostTracks ?? p.hostTrack),
    hostTrack: undefined,
    imageClips: Array.isArray(p.imageClips)
      ? p.imageClips
          .filter((c: ImageClip) => c && c.id && c.assetId)
          // 老工程里的片段没有焦点 / 描边 / 关键帧这些字段，补上默认值
          .map((c: ImageClip) => ({
            ...c,
            focalX: c.focalX ?? p.host?.focalX ?? 50,
            focalY: c.focalY ?? p.host?.focalY ?? 50,
            zoom: c.zoom ?? p.host?.zoom ?? 1,
            borderWidth: c.borderWidth ?? p.host?.borderWidth ?? 0,
            borderColor: c.borderColor ?? p.host?.borderColor ?? '#ffffff',
            mirror: c.mirror ?? p.host?.mirror ?? false,
            shadow: c.shadow ?? p.host?.shadow ?? true,
            entrance: c.entrance ?? 'none',
            entranceDur: c.entranceDur ?? 0.6,
            keyframes: Array.isArray(c.keyframes) ? c.keyframes : [],
          }))
      : [],
    // 素材库：旧工程没有这个字段 → 空数组；有的话补全缺省字段（url 落盘时已清空，刷新后由 IndexedDB 重新生成）
    mediaAssets: Array.isArray(p.mediaAssets)
      ? p.mediaAssets
          .filter((a: MediaAsset) => a && a.id)
          .map((a: MediaAsset) => ({ ...a, url: typeof a.url === 'string' ? a.url : '' }))
      : [],
    subtitleStyle: migrateSubtitleStyle(p),
  })
  // 工程时长一律重算：不认工程文件里存的旧值，永远等于最后一个内容的结束时刻
  return { ...base, duration: derivedDuration(base) }
}

/**
 * 一次性修正：镜像默认值。
 * 之前把 mirror 默认成 true，等于擅自把用户的画面水平翻转了。
 * 这里对"从没手动改过镜像"的工程强制改回 false，且只做一次。
 */
const MIRROR_FIX_KEY = 'animation-editor-host-mirror-default-fixed'

function fixMirrorDefault(project: Project): Project {
  let done = false
  try {
    done = localStorage.getItem(MIRROR_FIX_KEY) === '1'
  } catch {
    return project
  }
  if (done) return project
  try {
    localStorage.setItem(MIRROR_FIX_KEY, '1')
  } catch {
    /* 忽略 */
  }
  if (project.host?.mirror) return { ...project, host: { ...project.host, mirror: false } }
  return project
}

/**
 * 一次性迁移：把老版本存在 localStorage 的"每动效一条"预设搬进工程。
 * 老数据结构是 { [effectId]: Params }，限制很多（一条、不随工程走），
 * 搬进来后就走新的"我的预设"（可命名、多条、随工程导出）。
 */
const LEGACY_PRESET_KEY = 'animation-editor-presets-v1'

function migrateLegacyPresets(project: Project): Project {
  let legacy: Record<string, Params>
  try {
    legacy = JSON.parse(localStorage.getItem(LEGACY_PRESET_KEY) || '{}')
  } catch {
    return project
  }
  const ids = Object.keys(legacy)
  if (ids.length === 0) return project

  const now = Date.now()
  const migrated: CardPreset[] = ids
    // 已经存在同名（同 effectId 且参数一致）的不重复搬
    .filter((effectId) => {
      const params = legacy[effectId]
      return !project.presets.some(
        (p) => p.effectId === effectId && JSON.stringify(p.params) === JSON.stringify(params),
      )
    })
    .map((effectId, i) => ({
      id: `cp_${now.toString(36)}_${i}`,
      effectId,
      name: `旧预设 · ${effectId}`,
      params: { ...legacy[effectId] },
      createdAt: now,
    }))

  if (migrated.length === 0) {
    localStorage.removeItem(LEGACY_PRESET_KEY)
    return project
  }
  // 搬完就清掉旧 key，避免下次重复迁移
  try {
    localStorage.removeItem(LEGACY_PRESET_KEY)
  } catch {
    /* 忽略 */
  }
  return { ...project, presets: [...project.presets, ...migrated] }
}

function loadInitial(): State {
  let project = DEFAULT_PROJECT
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Project
      if (parsed && parsed.instances) {
        project = fixMirrorDefault(migrateLegacyPresets(normalizeProject(parsed)))
      }
    }
  } catch {
    /* ignore */
  }
  // 时长由内容决定（默认工程也一样）：开局就按最后一个内容的结尾算，不用字面量里的 12
  project = { ...project, duration: derivedDuration(project) }
  // static 快照由 state 自身充当（它本来就不含 static / currentTime 之外的东西），
  // 之后由 reducer 的包装层负责在「只有播放头变了」时复用这份引用。
  const initial: Omit<State, 'static'> = {
    project,
    selectedId: project.instances[0]?.id ?? null,
    history: [],
    future: [],
    currentTime: 0,
    playing: false,
    plugins: [],
    videoUrl: null,
    videoName: null,
    videoW: 1920,
    videoH: 1080,
    videoContentW: 0,
    videoContentH: 0,
    videoContentOffX: 0,
    videoContentOffY: 0,
    videoOpacity: 0.92,
    videoVisible: false,
    hostUrl: null,
    hostName: null,
    hostW: 0,
    hostH: 0,
    selectedHostClipId: null,
    selectedHostTrackId: null,
    selectedImageClipId: null,
    selectedMediaKeyframe: null,
    selectedCardKeyframe: null,
    previewMode: 'stack',
    canvasOrientation: 'landscape',
    orientationOverridden: false,
    zoom: 1,
    showGrid: false,
    trackH: 200,
    trackCount: 5,
  }
  return { ...initial, static: initial }
}

type EditorContextValue = {
  state: StaticState
  dispatch: React.Dispatch<Action>
  effects: EffectDef[]
  selected: Instance | null
  effectFor: (effectId: string) => EffectDef | undefined
  /** 播放头当前所在的机位段（引用稳定：没跨段就不变） */
  activeHostClip: HostClip | null
}

const EditorContext = createContext<EditorContextValue | null>(null)
/** 播放头单独一个 context：只有订阅它的组件才会被每帧重渲染 */
const TimeContext = createContext<number>(0)

export function EditorProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadInitial)

  useEffect(() => {
    try {
      // 素材的 objectURL 是运行时值，落盘前清掉，由 IndexedDB 里的原始文件在下次打开时重新生成
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeProject(state.project)))
    } catch {
      /* ignore */
    }
  }, [state.project])

  // 打开工程 / 载入历史版本后，从 IndexedDB 取回素材的原始文件、重建 objectURL。
  // 只在「存在没有 url 的素材」时动手（刷新后、或载入的版本里 url 已被清空），
  // 本会话刚导入的素材 url 仍有效，hydrateAssetUrls 会原样跳过。
  useEffect(() => {
    const needsHydration = state.project.mediaAssets.some((a) => !a.url)
    if (!needsHydration) return
    let cancelled = false
    void hydrateAssetUrls(state.project.mediaAssets).then((hydrated) => {
      if (cancelled) return
      // 只在本轮真的有素材补上了 url 时才写回：缺 blob 的素材（比如 IndexedDB 被清空）
      // 永远补不上 url，若不判断会陷入"始终 needsHydration → 反复 dispatch"的死循环。
      const changed = hydrated.some((a, i) => !state.project.mediaAssets[i]?.url && !!a.url)
      if (changed) dispatch({ type: 'setMediaAssets', assets: hydrated })
    })
    return () => {
      cancelled = true
    }
  }, [state.project.mediaAssets])

  const effects = useMemo(() => [...registry, ...state.plugins], [state.plugins])
  const selected = useMemo(
    () => state.project.instances.find((i) => i.id === state.selectedId) ?? null,
    [state.project.instances, state.selectedId],
  )
  const effectFor = useMemo(
    () => (effectId: string) => effects.find((e) => e.id === effectId),
    [effects],
  )
  // 播放头落在哪个机位段上。find 返回的是 hostClips 里的同一个元素，
  // 所以只要没跨段，引用就不变 —— 顶栏 / 参数面板因此不必每帧重渲染。
  const activeHostClip = useMemo(
    () =>
      state.project.hostClips.find(
        (c) => state.currentTime >= c.start && state.currentTime < c.start + c.duration,
      ) ?? null,
    [state.project.hostClips, state.currentTime],
  )

  // 注意：这里用 state.static（由 reducer 维护的稳定快照）而不是 state 本身。
  // 播放时 currentTime 每帧都变，static 的引用却不变，
  // 于是只订阅 useEditor() 的组件不会被播放头带着每帧重渲染 —— 这是预览卡顿的主因。
  const value = useMemo<EditorContextValue>(
    () => ({ state: state.static, dispatch, effects, selected, effectFor, activeHostClip }),
    [state.static, effects, selected, effectFor, activeHostClip],
  )

  return (
    <EditorContext.Provider value={value}>
      <TimeContext.Provider value={state.currentTime}>{children}</TimeContext.Provider>
    </EditorContext.Provider>
  )
}

export function useEditor(): EditorContextValue {
  const ctx = useContext(EditorContext)
  if (!ctx) throw new Error('useEditor must be used within EditorProvider')
  return ctx
}

/**
 * 播放头当前时间（秒）。
 * 只有需要逐帧跟随播放头的组件（画布 / 时间轴指针 / 时间码）才用它 —— 用它会每帧重渲染。
 * 其余组件请用 useEditor()，避免被播放头带着跑。
 */
export function usePlayhead(): number {
  return useContext(TimeContext)
}

export type { Params }

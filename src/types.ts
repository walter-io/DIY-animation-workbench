import type { ComponentType } from 'react'

import type { EffectCategory } from './effectCategories'
import type { HostLayoutId } from './hostLayouts'
import type { SfxId } from './sfx'

export type SkinId = 'dark' | 'light'
export type StyleId = 'glass' | 'flat'
export type FontId = 'sans' | 'serif'
export type SlotId = 'left' | 'right' | 'center' | 'bottom' | 'top'

/**
 * 卡片尺寸模式（所有动效卡统一）：
 *  - auto      内容自适应：宽高由卡内容决定，文字比例只放大内容
 *  - box       自定义：宽高由 w/h 决定，内容按比例缩放填满（不再与文字比例冲突）
 *  - full      铺满画布：占满整个内容可用区
 *  - leftHalf  左侧半屏：占内容可用区的左半边（整屏高度），右半边留给画面或另一张卡
 *  - rightHalf 右侧半屏：占内容可用区的右半边（整屏高度），左半边留给画面或另一张卡
 *
 * 半屏两档与 full 同属「固定占位」：外框由模式决定，卡槽与自由定位不再生效。
 */
export type CardFit = 'auto' | 'box' | 'full' | 'leftHalf' | 'rightHalf'

/**
 * 动效卡通用默认尺寸档位（工程级，非铺满画布的卡才吃这一项）。
 * 详见 cardSize.ts —— 单卡调过「整体缩放」或被手动拖成自定义尺寸后不再跟随。
 */
export type CardSizeId = 'small' | 'medium' | 'large'

/** 整卡入场方式 */
export type EnterKind = 'none' | 'fade' | 'left' | 'right'

/** 着色笔作用的样式属性 */
export type PaintProp = 'color' | 'background' | 'border'

/** 单张卡内的局部着色覆盖（在画布上点选元素生成） */
export type PaintOverride = {
  id: string
  /** 相对卡根节点 [data-paint-root] 的 DOM 路径（nth-child 序号链） */
  path: number[]
  /** 元素文本，用于面板显示与人工核对 */
  text: string
  prop: PaintProp
  color: string
}

/** 主持视频（出镜画面）配置。矩形由布局预设决定，custom 时用 x/y/w/h */
export type HostConfig = {
  layout: HostLayoutId
  /** 自定义模式下的矩形（画布像素坐标） */
  x: number
  y: number
  w: number
  h: number
  /** 圆形（自定义模式用） */
  circular: boolean
  /** 圆角半径（画布像素，圆形时忽略） */
  radius: number
  /**
   * 镜头焦点（裁切锚点，0~100）。object-fit: cover 默认取原画面正中，
   * 但出镜的人常常不在正中间（比如站在画面右侧），这时就会被裁掉。
   * focalX/focalY 决定小窗里保留原画面的哪一块。
   */
  focalX: number
  focalY: number
  /** 画面缩放 1~3：人在原画面里偏小时放大一点 */
  zoom: number
  /** 左右镜像。默认 false —— 不擅自改动原始画面，需要时用户自己开 */
  mirror: boolean
  /** 描边宽度（画布像素，0 = 不要描边） */
  borderWidth: number
  borderColor: string
  /** 投影：让小窗从背景里浮起来 */
  shadow: boolean
  opacity: number
}

/**
 * 机位段：出镜画面在时间轴上的一段。
 *
 * 参考剪映的画中画轨道 —— 一条出镜视频可以按需切成多段，
 * 每段用不同的布局（这会儿在左下角，过一会儿占半屏），
 * 段与段之间 = 不出镜（剪掉）。动效卡会跟着每段的内容区自动让位。
 */
export type HostClip = {
  id: string
  start: number
  duration: number
  /** 该段用哪个布局；off = 这一段不出镜 */
  layout: HostLayoutId
  /** 覆盖全局镜头焦点（不填跟随 host.focalX/focalY） */
  focalX?: number
  focalY?: number
  zoom?: number
  /**
   * 进入本段的过渡时长（秒）：从上一机位平滑挪到本段的布局，而不是瞬间跳过去。
   * 0 = 硬切。不填时跟随 project.hostTransition。
   */
  transition?: number
  /** 过渡缓动；不填用默认（easeInOut） */
  ease?: EasingId
}

/**
 * 出镜素材条 —— 把出镜视频当成剪映里的一条媒体素材。
 *
 * 和 HostClip（机位段）是两回事，别混：
 *   - 素材条（这里）：回答"出镜视频在项目的哪一段时间里出现、用的是源视频的哪一截"
 *   - 机位段（HostClip）：回答"这段时间里出镜画面摆在画面哪个位置、什么形状"
 * 一条素材条上可以叠任意多个机位段，两者互不干涉。
 */
export type HostTrack = {
  /** 唯一标识（多条素材条各自独立，选中/拖拽/切开都靠它定位） */
  id: string
  /** 素材起点：项目第几秒开始出现出镜画面 */
  start: number
  /** 素材在项目里占多长（= 截断之后的长度，不是源视频总长） */
  duration: number
  /** 入点：从源视频第几秒开始取。拖素材左边缘改的是它 */
  trimIn: number
  /** 源视频总时长（导入时探测出来）。用来约束裁剪范围、画出被裁掉的部分 */
  sourceDuration: number
}

/** 工程主题色：主色 / 数据色 / 点缀色 */
export type Palette = {
  /** 主色（强调色）：标题、关键线条、主强调 */
  accent: string
  /** 数据色：数字、图表、进度 */
  data: string
  /** 点缀色：金句、警示、点睛 */
  special: string
}
export type EasingId = 'linear' | 'easeOut' | 'easeInOut' | 'easeOutQuart' | 'easeOutBack'
export type LayoutPresetId = 'edit' | 'review' | 'focus'

export type ParamKind =
  | { type: 'text'; default: string }
  | { type: 'number'; default: number; min?: number; max?: number; step?: number }
  | { type: 'range'; default: number; min: number; max: number; step?: number }
  | { type: 'color'; default: string }
  | { type: 'boolean'; default: boolean }
  | { type: 'select'; default: string; options: string[] }

export type ParamSchema = { key: string; label: string } & ParamKind

export type Params = Record<string, string | number | boolean>

/**
 * 导演信息（借鉴 hyperframes-motion-library 的 motion-plan director 契约）：
 * 记录一条动效的"信息依据"，让 lint 能校验内容是否来自口播，禁止编造数字/状态。
 */
export type DirectorInfo = {
  /** 原始口播引用（该动效对应的字幕文本） */
  sourceQuote: string
  /** 表达目的 */
  intent: string
  /** 必须出现的信息 */
  requiredInformation: string[]
  /** 禁止添加的信息（无来源数字/英文标签等） */
  forbiddenInformation: string[]
}

export type InstanceMeta = {
  id: string
  effectId: string
  name: string
  start: number
  duration: number
  slot: SlotId
  /**
   * 时间轴上的「行号」（0 = 字幕轨，1 = 轨道1，2 = 轨道2…）。
   * 与 slot（画布上的左右/居中位置）解耦：行号决定卡片落在哪一条轨道上，
   * slot 决定它在画布上的摆放位置（在参数面板里调）。不填时按 slot 反推一个默认行。
   */
  track?: number
  /** 所属段落分组 */
  seg?: string
  /** 相对卡起点的渐隐秒点：超过后整卡淡出 */
  dimAt?: number
  /** 关闭该实例的 lint 体检 */
  lintOff?: boolean
  /** 尺寸模式：auto 内容自适应 / box 自定义宽高 / full 铺满画布 / 左右半屏 */
  fit?: CardFit
  /**
   * 卡内内容（文字等）相对默认位置的偏移，单位是 1920×1080 画布像素。
   * 所有动效卡通用：只平移卡内内容，卡片外框与背景不动，
   * 用来把文字挪到想要的位置（半屏 / 铺满时尤其常用）。
   */
  contentOffsetX?: number
  contentOffsetY?: number
  /** 自由定位模式：脱离 slot，用画布坐标 x/y 与宽 w/高 h（1920×1080 空间）定位 */
  free?: boolean
  x?: number
  y?: number
  w?: number
  h?: number
  /** 局部着色覆盖（着色笔） */
  paint?: PaintOverride[]
  /** 自由定位缩放基准尺寸（内部内容按此比例缩放） */
  baseW?: number
  baseH?: number
  /** 卡片内容整体缩放比例（zoom，文字/图形一起缩放） */
  contentScale?: number
  /** 该卡背景透明度 0-1；未设置时跟随工程 cardOpacity */
  cardOpacity?: number
  /** 自由定位后是否仍按内容自适应（用户手动缩放后关闭） */
  autoFit?: boolean
  /**
   * 整卡入场方式：无 / 淡入 / 从左进入 / 从右进入。
   * 默认 fade（淡入）。这一层在卡片组件自己的动画之外，控制"整张卡怎么出现"。
   */
  enter?: EnterKind
  /** 入场速度倍率：1 = 基准 0.5 秒走完；越大越快 */
  enterSpeed?: number
  /**
   * 音效：这张卡出不出声。
   * 未设置（undefined）= 跟随工程总开关；显式 false = 单独把这张卡静音（总开关开着也不响）。
   */
  sfxOn?: boolean
  /** 音效类型；未设置 = 用工程默认音效（project.sfxDefaultId） */
  sfxId?: SfxId
  /** 该卡音量倍率 0~1，最终音量 = 它 × 工程总音量。未设置 = 1 */
  sfxVolume?: number
  /** 触发时机：相对卡起点的偏移秒（可为负 = 提前响）。未设置 = 0，即卡一出现就响 */
  sfxOffset?: number
  /**
   * 音效时长（秒）：声音总共播多久。未设置 = 自动 ——
   * 持续型音效（数字滚动 / 数据运算这类）跟随数据动画铺到卡尾，其余响一声。
   * 填了就按这个时长连续铺满（任意音效都能拉长）；超出卡片范围按卡尾截断。
   */
  sfxDuration?: number
  /**
   * 整卡动画：相对「布局算出来的位置」的增量。
   * 没有关键帧时就是这几个静态值（默认 0/0/1/1，等于不动）；
   * 一旦打了关键帧，就由关键帧插值接管 —— 与素材片段是同一套语义。
   */
  offsetX?: number
  offsetY?: number
  animScale?: number
  animOpacity?: number
  /**
   * 卡属性关键帧：在卡内第 t 秒固化一次外观，相邻帧之间自动补间。
   * 用来做"卡片出现后继续移动 / 放大 / 淡出"这类停留期动画。
   */
  keyframes?: CardKeyframe[]
  /** 导演信息：内容依据（AI 编排生成时记录，供 lint 校验） */
  director?: DirectorInfo
}

/**
 * 素材库里导入的一个素材（视频 / 图片）。
 * 元数据（id / kind / name / 时长 / 宽高 / 缩略图）随工程一起持久化；
 * 像素文件单独存 IndexedDB（见 mediaPersistence.ts），url 是运行时 objectURL，
 * 刷新后失效、由 IndexedDB 里的原始文件重新生成 —— 所以素材库刷新不丢。
 */
export type MediaAsset = {
  id: string
  kind: 'video' | 'image'
  name: string
  /** 预览用 objectURL（运行时值，不落盘） */
  url: string
  /** 视频时长（秒）；图片为 0 */
  duration: number
  width: number
  height: number
  /** 列表缩略图（dataURL）：视频抽首帧、图片用原图缩放 */
  thumb?: string
}

/** 片段在某一刻解算出来的外观（可能是静态值，也可能是两个关键帧之间插出来的） */
export type ClipVisual = {
  x: number
  y: number
  w: number
  h: number
  opacity: number
  radius: number
  focalX: number
  focalY: number
  zoom: number
}

/** 关键帧补间缓动 */
export type KeyframeEase = 'linear' | 'smooth' | 'ease-out' | 'ease-in'

/**
 * 素材片段上的一个关键帧：声明"片段内第 t 秒时，这个片段长什么样"。
 * 相邻两个关键帧之间按 ease 补间，于是位置 / 大小 / 形状 / 镜头焦点都能随时间平滑变化
 * —— 这就是剪映里那套"自由组合关键帧做过渡切换"，不再需要单独的机位轨道。
 */
export type MediaKeyframe = {
  /** 相对片段起点的时间（秒） */
  t: number
  x: number
  y: number
  w: number
  h: number
  opacity: number
  radius: number
  focalX: number
  focalY: number
  zoom: number
  ease?: KeyframeEase
}

/**
 * 动效卡的可动画外观（关键帧之间的插值对象）。
 *
 * 与素材片段的 ClipVisual 不同，这里存的是**相对布局算出来的位置的增量**：
 * 卡片摆在哪儿由 slot / fit / free 决定，关键帧只在它之上叠加平移、缩放、整体透明度，
 * 这样关键帧不需要关心布局，改 slot 或换内容自适应也不会把动画搞乱。
 */
export type CardVisual = {
  /** 整卡平移（画布像素），叠加在布局位置之上 */
  offsetX: number
  offsetY: number
  /** 整卡缩放倍率（1 = 原样），以卡中心为原点 */
  scale: number
  /** 整卡不透明度（1 = 不透明） */
  opacity: number
  /**
   * 外框尺寸覆盖（画布像素）。undefined = 仍用布局（slot / fit）算出来的尺寸。
   *
   * 为什么要记尺寸：`fit`（内容自适应 / 铺满画布…）是**离散枚举**，没法插值，
   * 但用户要的是"第一帧自适应大小、第二帧铺满画布"这种尺寸变化。
   * 所以关键帧记的是**尺寸本身**，渲染时覆盖布局结果 —— 两端都有值就能平滑补间。
   */
  w?: number
  h?: number
  /**
   * 外框左上角的绝对位置（画布像素）。undefined = 仍由布局（slot / fit 锚点）定位。
   *
   * 为什么尺寸之外还要记位置：fit 连同它的**锚点规则**也是离散枚举 ——
   * 铺满锚在内容区原点、自适应锚在槽位上。位置若仍交给"当前布局的锚点"决定，
   * 两帧就只能共用一个锚点，另一帧的内容必然跑偏（"第一帧铺满、第二帧自适应"
   * 时第一帧被挂到槽位锚点上、内容顶到屏幕边上，就是这个原因）。
   * 每帧把解算出的位置一起存下，渲染时直接摆到这个坐标，帧间位置带尺寸一起补间。
   */
  x?: number
  y?: number
}

/**
 * 动效卡上的一个关键帧：声明"卡内第 t 秒时，这张卡长什么样"。
 * 相邻两帧之间按 ease 补间，于是卡片可以在停留期间继续移动 / 缩放 / 淡出。
 */
export type CardKeyframe = CardVisual & {
  /** 相对卡起点的时间（秒） */
  t: number
  ease?: KeyframeEase
}

/**
 * 拖到轨道上的素材片段（图片或视频）：一段时间内显示在画布的某个矩形区域。
 * 真正的像素来自素材库里对应 assetId 的素材；assetId 只存引用，不存文件本身。
 * 图片直接按矩形贴上去；视频还会按 start / trimIn 换算源视频该播第几秒。
 */
export type ImageClip = {
  id: string
  assetId: string
  start: number
  duration: number
  /** 画布像素矩形（1920×1080 空间） */
  x: number
  y: number
  w: number
  h: number
  opacity: number
  /** 圆角（画布像素） */
  radius: number
  /** 所在轨道编号：1 = 轨道1。轨道越靠上，同屏时越优先显示（盖住下面的轨道） */
  track: number
  /** 镜头焦点：保留素材画面的哪一块（0-100，50 = 正中间） */
  focalX: number
  focalY: number
  /** 画面缩放：1 = 原始大小，>1 放大 */
  zoom: number
  /** 描边宽度（画布像素），0 = 不描边 */
  borderWidth: number
  borderColor: string
  /** 左右镜像 */
  mirror: boolean
  /** 投影 */
  shadow: boolean
  /** 视频专用：源视频入点（秒），片段第 0 帧对应源视频的这一秒 */
  trimIn?: number
  /** 视频专用：源视频总时长（秒），用于限制可拖长度 */
  sourceDuration?: number
  /** 入场动画：无 / 淡显 / 左入(从左侧移入) / 右入 / 上入 / 下入 */
  entrance?: EntranceMode
  /** 入场动画时长（秒），仅 entrance !== 'none' 时生效 */
  entranceDur?: number
  /** 关键帧：按片段内相对时间插值出上面的属性；为空 = 静态不变 */
  keyframes?: MediaKeyframe[]
}

/** 素材片段入场动画模式 */
export type EntranceMode = 'none' | 'fade' | 'slideLeft' | 'slideRight' | 'slideUp' | 'slideDown'

export type EffectProps = {
  params: Params
  progress: number
  meta: InstanceMeta
  isPreview?: boolean
}

export type EffectDef = {
  id: string
  name: string
  /** 动效分类：必须是 effectCategories 里登记过的分类名（写错会编译报错） */
  category?: EffectCategory
  description?: string
  component: ComponentType<EffectProps>
  schema: ParamSchema[]
  defaultParams: Params
  /** true = 运行时挂载进来的插件卡（拓展包 / 外部注入），不是仓库内置的 */
  plugin?: boolean
  /**
   * 归属哪个拓展包（packRuntime 装载时打上）。
   * 有了它才能整包卸载：停用或删掉包之后，这批卡会从动效库里消失。
   */
  packId?: string
}

export type Instance = InstanceMeta & { params: Params }

/**
 * 全局字幕样式。
 *
 * 口播字幕是「整片一套样式」：改任意一句的字号 / 颜色 / 背景 / 位置，
 * 所有字幕都跟着变。所以样式存在工程这一层，而不是散在每张字幕卡里 ——
 * 改一次只动一个对象，几百句字幕也不会卡。
 * 每句各自的 params.text（文案）仍然是逐卡的，不参与联动。
 */
export type SubtitleStyle = {
  /** 字号（px，画布 1920×1080 空间） */
  fontSize: number
  align: 'left' | 'center' | 'right'
  /** 文字颜色 */
  color: string
  /** 是否显示背景条 */
  box: boolean
  /** 背景条颜色 */
  bg: string
  /** 字幕在画面上的位置（所有字幕统一） */
  slot: SlotId
}

export type Project = {
  name: string
  skin: SkinId
  /** 卡片骨架风格（schema 预留） */
  style: StyleId
  /** 画布字体（schema 预留） */
  font: FontId
  /** 工程主题色：所有未单独设置强调色的卡片都跟随它 */
  palette: Palette
  /** 主持视频（出镜画面）的布局与外观；视频文件本身不进工程，只存引用名 */
  host: HostConfig
  /** 机位轨道：按时间段切换出镜布局。空数组 = 全程用 host.layout */
  hostClips: HostClip[]
  /**
   * 机位切换的默认过渡时长（秒）。
   * 新建的机位段继承它；单个段上写了 transition 就以段为准。0 = 全部硬切。
   */
  hostTransition?: number
  /**
   * 机位切换的默认过渡缓动。新建的机位段继承它；单个段上写了 ease 就以段为准。
   */
  hostEase?: EasingId
  /**
   * 出镜素材条（可多条）：出镜视频在时间轴上占的若干段，以及各段从源视频的哪一截取。
   * 剪刀工具在一刀切开后会复制成相邻的两段，所以这里是数组。
   * 空数组 = 老工程行为（从 0 秒开始、源视频整段 1:1 铺满项目）。
   */
  hostTracks: HostTrack[]
  /** @deprecated 老工程字段：单条素材条，迁移时并入 hostTracks */
  hostTrack?: HostTrack
  /** 拖到轨道上的图片素材片段（来自素材库） */
  imageClips: ImageClip[]
  /**
   * 素材库：导入的视频 / 图片（元数据随工程持久化，像素文件在 IndexedDB）。
   * 空数组 = 素材库为空。
   */
  mediaAssets: MediaAsset[]
  /** 全局字幕样式：所有口播字幕共用这一套；改一处，整片字幕同步 */
  subtitleStyle: SubtitleStyle
  /**
   * 口播字幕总开关：关掉后整片（预览 / 导出）都不画字幕。
   * 未设置（老工程）按「开」处理 —— 字幕文案与时间轴全部保留，只是不显示。
   */
  subtitlesVisible?: boolean
  /**
   * 卡片背景层的**不透明度** 0-1（不是"透明度"）。
   * 1 = 背景完全不透明；0 = 背景完全隐藏（无背景、无模糊，卡里只剩文字）。
   * 界面上的「背景透明度」滑杆显示的是 1 - 这个值。
   */
  cardOpacity: number
  /** 已按新口径换算过（旧工程把底色自带的 alpha 又乘了一遍，见 store 的 migrateCardOpacityScale） */
  cardOpacityV2?: boolean
  /**
   * 动效卡通用默认尺寸（小 / 中 / 大）。
   * 只作用于没有单独调过尺寸、且没被设成「铺满画布」的卡片；缺省按「中」处理。
   */
  cardSize?: CardSizeId
  /**
   * 音效总开关。关掉后整片不出声，导出也不会烤音轨。
   * 未设置（老工程）按「开」处理 —— 音效是后来加的，老工程不该因为缺这个字段就整个静音。
   */
  sfxEnabled?: boolean
  /** 全局音效音量 0~1，每张卡的最终音量 = 单卡音量 × 它 */
  sfxVolume?: number
  /** 没有单独指定音效的卡，默认用哪个音效 */
  sfxDefaultId?: SfxId
  fps: number
  duration: number
  layout: LayoutPresetId
  instances: Instance[]
  /** 我的预设（随工程一起导出/导入） */
  presets: CardPreset[]
}

export type Template = {
  id: string
  name: string
  description: string
  build: () => Instance[]
}

/**
 * 我的预设：一张卡调好后存下来的参数快照。
 * 存在 Project 里（而不是 localStorage），所以导出/导入工程时会一起带走。
 * 按 effectId 归类 —— 预设只对同类型的卡有意义。
 */
export type CardPreset = {
  id: string
  /** 所属动效 id（同一预设只会出现在同类型卡的参数面板里） */
  effectId: string
  name: string
  /** 参数快照 */
  params: Params
  /** 可选：连同尺寸 / 颜色等外观一起存 */
  style?: PresetStyle
  createdAt: number
}

/** 预设里可选保存的外观信息（不含位置，位置通常每张卡都不一样） */
export type PresetStyle = {
  fit?: InstanceMeta['fit']
  w?: number
  h?: number
  contentScale?: number
  cardOpacity?: number
}

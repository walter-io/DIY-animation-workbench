/**
 * 音效库 —— 科技感合成音效 + （原有版本用过的）采样音效声明。
 *
 * ⚠️ 本副本为「无音效」版本：`SFX_MUTED = true`，所有音效定义只用于**保留下拉选项与工程数据**，
 *    实际播放/导出全部静音；原先 `public/sfx/` 下的 mp3 素材已整体删除。
 *    下面那些带 `src` 的采样音效定义**故意保留**，这样老工程里存过的 sfxId 仍能正常解算、不被抹掉。
 *
 * 为什么以"合成"为主：
 *  - 这个项目是本地离线工具，往仓库里塞一堆 mp3/wav 既臃肿又有版权问题；
 *  - 科技感音效（UI 提示音、能量上涌、故障噪点这类）本来就是用振荡器 + 噪声 + 滤波包络做出来的，
 *    合成出来的质感反而更"电子"，也更好统一音量；
 *  - 同一套 schedule() 既能喂给 AudioContext（预览试听），也能喂给 OfflineAudioContext（导出混音），
 *    所以"预览听到的"和"导出烤进去的"必然是同一个声音，不会出现两边对不上。
 *
 * 每个音效只负责把自己的节点调度进 ctx，总音量由调用方通过 gain 传入（单卡音量 × 全局音量）。
 */

import type { EffectCategory } from './effectCategories'

/**
 * 内置音效 id（仓库自带的那批）。
 *
 * 注意 id 类型是开放的：拓展包（见 src/packRuntime.ts）可以在运行时注册自己的音效，
 * 它们的 id 不在下面的联合里。所以对外一律用 `SfxId`：
 * `BuiltinSfxId | (string & {})` —— 写死的那几个仍然有补全提示，同时允许任意字符串，
 * 不需要为第三方音效去改这个联合类型。
 */
export type BuiltinSfxId =
  | 'none'
  | 'neonBlip'
  | 'dataPop'
  | 'riser'
  | 'whoosh'
  | 'impact'
  | 'glitch'
  | 'scan'
  | 'lock'
  // ── 信号 / 电音系 ──
  | 'digitRoll'
  | 'signalPing'
  | 'dataStream'
  | 'synthHit'
  // ── 科技感采样（免费可商用素材，文件在 public/sfx/，来源与许可见 public/sfx/CREDITS.md）──
  | 'uiClick'
  | 'robotClick'
  | 'alienButton'
  | 'interfaceHint'
  | 'interfaceZoom'
  | 'interfaceExpand'
  | 'sciFiConfirm'
  | 'cyberConfirm'
  | 'fastSweep'
  | 'roboticSweep'
  | 'smallGlitch'
  | 'plasmaPowerUp'
  | 'arcadeBling'
  | 'fastBleep'
  | 'dataProcessing'
  | 'metalImpact'
  | 'forceField'
  | 'deepImpact'
  | 'electricChain'
  | 'beepSequence'

/** 对外用的音效 id：内置补全 + 允许拓展包自带任意 id */
export type SfxId = BuiltinSfxId | (string & {})

/**
 * ── 静音开关（本副本为「无音效」版本） ──
 *
 * 为 true 时，所有音效只保留「设置层」：参数面板的下拉、音量滑杆、总开关、
 * 导出面板的烤入开关全部照常显示与保存，但**任何时刻都不会真的出声**，
 * 导出也不会合成音轨（renderSfxMix 返回 null，调用方自动跳过）。
 *
 * 之所以做成一个开关而不是删代码：工程里已经存了每张卡的音效配置，
 * 保持定义不变才能让老工程、模板原样读回，将来想恢复有声也只是把这里改回 false。
 */
export const SFX_MUTED = true


/** 新建工程 / 没单独指定音效的卡，默认用这个（最百搭、不抢戏的那一个） */
export const DEFAULT_SFX_ID: SfxId = 'neonBlip'

/** 工程默认总音量 */
export const DEFAULT_SFX_VOLUME = 0.8

export type SfxDef = {
  id: SfxId
  name: string
  /** 一句话说明，用在按钮 title 上 */
  hint: string
  /** 大致时长（秒）：导出混音时用来预留尾巴，不用太精确 */
  duration: number
  /** 采样音效的文件名（public/sfx/ 下）。有 src 的走采样播放，没 src 的走合成 */
  src?: string
  /**
   * 采样电平对齐系数：采样文件都归一化到 -1.5dBFS 峰值，
   * 但"短促点击"和"持续扫频"的听感响度差很多，这里按音色给各自的衰减。
   */
  level?: number
  /** 下拉框分组（采样音效标「科技感采样」，合成的不标） */
  group?: string
  /** 归属的拓展包 id（内置音效没有这个值；停用包时按它整体卸载） */
  packId?: string
  /**
   * 持续模式：卡片很长、数据动画还没放完时，声音怎么跟随。
   *  - 'repeat'：连贯颗粒流 —— 颗粒间隔压到颗粒时长的 1/4（多层重叠），
   *    听感是**连续的一片**；给了 scheduleSustain 的音效则用自己的专属铺法
   *  - 'loop'  ：无缝循环（适合噪声底）
   * 只在「卡片剩余时长明显长于音效本身」时才启用，短卡仍是干脆的一声。
   */
  sustain?: 'repeat' | 'loop'
  /**
   * 长卡持续播放的专属渲染（可选）。给了它，长卡就不再走"整段重复"的通用铺法，
   * 由音效自己把 sustain 秒连贯地铺满 —— 例如数字滚动的单一连续声流（无重叠、无回音）。
   */
  scheduleSustain?: (ctx: BaseAudioContext, at: number, gain: number, sustain: number) => void
  /**
   * 把声音调度进某个音频上下文。
   * @param at   起始时间（上下文时间轴上的绝对秒）
   * @param gain 线性增益 0~1
   */
  schedule: (ctx: BaseAudioContext, at: number, gain: number) => void
}

/* ─────────────── 采样音效：加载 / 缓存 / 播放 ─────────────── */

/** 采样文件按上下文缓存解码结果：预览（AudioContext）与导出（OfflineAudioContext）各一份 */
const fileBufferCache = new WeakMap<BaseAudioContext, Map<string, AudioBuffer>>()
/** 拉取失败（404 等）的文件只试一次，避免每次触发都白打一轮请求 */
const failedSfxSrcs = new Set<string>()

/**
 * 采样文件的实际地址。
 * 已经是绝对地址（http(s) / blob / data / 根路径 /）的原样返回 —— 拓展包注册时
 * 会把自己的 src 改写成 `/packs/<包id>/sounds/xx.mp3` 这种绝对路径，靠这条规则直接生效。
 */
function sfxFileUrl(src: string): string {
  if (/^(https?:\/\/|blob:|data:|\/)/.test(src)) return src
  // 走 vite 的 BASE_URL：dev 是 /，构建产物是相对路径，两种部署方式都不破
  return `${import.meta.env.BASE_URL}sfx/${src}`
}

function getFileBuffer(ctx: BaseAudioContext, src: string): AudioBuffer | null {
  return fileBufferCache.get(cacheKeyOf(ctx))?.get(src) ?? null
}

/** 把一个采样解码进指定上下文并缓存；失败返回 null（失败源会被记入 failedSfxSrcs） */
export async function loadSfxFile(src: string, ctx: BaseAudioContext): Promise<AudioBuffer | null> {
  const key = cacheKeyOf(ctx)
  const hit = fileBufferCache.get(key)?.get(src)
  if (hit) return hit
  if (failedSfxSrcs.has(src)) return null
  try {
    const res = await fetch(sfxFileUrl(src))
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const bytes = await res.arrayBuffer()
    const buf = await key.decodeAudioData(bytes)
    let per = fileBufferCache.get(key)
    if (!per) {
      per = new Map()
      fileBufferCache.set(key, per)
    }
    per.set(src, buf)
    return buf
  } catch (err) {
    // 加载失败必须留下线索：否则"换到这个音效完全无声"查不到原因
    console.error(`[sfx] 采样加载失败：${sfxFileUrl(src)}`, err)
    failedSfxSrcs.add(src)
    return null
  }
}

/* ─────────────── 预览总线：暂停即停 ─────────────── */

type LiveSfxBus = {
  /** 所有预览音效的输出都汇进这条总线（静音 / 放行由播放状态控制） */
  master: GainNode
  /** 预览里创建的发声节点（采样 / 振荡器）：暂停时统一 stop */
  voices: Set<AudioScheduledSourceNode>
}
const liveBusCache = new WeakMap<AudioContext, LiveSfxBus>()
const liveViewCache = new WeakMap<AudioContext, BaseAudioContext>()

function liveBus(ctx: AudioContext): LiveSfxBus {
  let bus = liveBusCache.get(ctx)
  if (!bus) {
    const master = ctx.createGain()
    master.gain.value = 1
    master.connect(ctx.destination)
    bus = { master, voices: new Set() }
    liveBusCache.set(ctx, bus)
  }
  return bus
}

/**
 * 预览上下文的调度视图：输出汇进总线，创建的发声节点全部登记。
 * scheduleSfxCue 在预览路径上拿到的是这个视图，合成音 / 采样音无需各自处理暂停。
 */
function liveView(ctx: AudioContext): BaseAudioContext {
  const hit = liveViewCache.get(ctx)
  if (hit) return hit
  const bus = liveBus(ctx)
  const register = <T extends AudioScheduledSourceNode>(node: T): T => {
    bus.voices.add(node)
    node.onended = () => bus.voices.delete(node)
    return node
  }
  const view = {
    get currentTime() {
      return ctx.currentTime
    },
    sampleRate: ctx.sampleRate,
    destination: bus.master,
    createBuffer: (a: number, b: number, c: number) => ctx.createBuffer(a, b, c),
    createBufferSource: () => register(ctx.createBufferSource()),
    createOscillator: () => register(ctx.createOscillator()),
    createGain: () => ctx.createGain(),
    createBiquadFilter: () => ctx.createBiquadFilter(),
    decodeAudioData: (bytes: ArrayBuffer) => ctx.decodeAudioData(bytes),
  } as unknown as BaseAudioContext
  liveViewCache.set(ctx, view)
  return view
}

/** 解码缓存的 key：预览路径统一归到同一个视图对象上，避免重复解码 */
function cacheKeyOf(ctx: BaseAudioContext): BaseAudioContext {
  return liveCtx != null && ctx === liveCtx ? liveView(liveCtx) : ctx
}

/** 暂停：停掉预览里所有还在响（含未开播）的音效节点，并静音总线 */
export function pauseSfx(): void {
  if (!liveCtx) return
  const bus = liveBus(liveCtx)
  bus.master.gain.cancelScheduledValues(liveCtx.currentTime)
  bus.master.gain.setValueAtTime(0, liveCtx.currentTime)
  bus.voices.forEach((v) => {
    try {
      v.stop()
    } catch {
      /* 尚未 start 的节点 stop 会抛错，忽略 */
    }
  })
  bus.voices.clear()
}

/** 恢复播放：解除总线静音（被停掉的节点不会复活，重播会重新触发） */
export function resumeSfx(): void {
  if (!liveCtx) return
  const bus = liveBus(liveCtx)
  bus.master.gain.cancelScheduledValues(liveCtx.currentTime)
  bus.master.gain.setValueAtTime(1, liveCtx.currentTime)
}

/** 诊断用：当前预览总线上还挂着的发声节点数（0 = 一切已停） */
export function liveSfxVoiceCount(): number {
  return liveCtx ? liveBus(liveCtx).voices.size : 0
}

/** 播放一个已解码的采样：不加包络（素材自带自然衰减），音量 = 调用方 gain × 音色电平 */
function playFileBuffer(
  ctx: BaseAudioContext,
  buf: AudioBuffer,
  at: number,
  gain: number,
  level: number,
): void {
  const node = ctx.createBufferSource()
  node.buffer = buf
  const g = ctx.createGain()
  g.gain.value = gain * level
  node.connect(g).connect(ctx.destination)
  node.start(at)
}

/** 给采样音效生成 schedule：从缓存里取该上下文的解码结果，取不到就静默跳过 */
function fileSfxSchedule(src: string, level: number): SfxDef['schedule'] {
  return (ctx, at, gain) => {
    const buf = getFileBuffer(ctx, src)
    if (!buf) return
    playFileBuffer(ctx, buf, at, gain, level)
  }
}

/** 字符串 → 固定种子：同一音效每次重复的抖动序列一致，预览与导出听到的完全相同 */
function hashSeed(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i += 1) {
    h = (h ^ s.charCodeAt(i)) >>> 0
    h = (h * 16777619) >>> 0
  }
  return h || 1
}

/** 采样音效的持续播放：'loop' 无缝循环；其余走连贯颗粒流（多层重叠铺满整段） */
function emitSustained(
  def: SfxDef,
  ctx: BaseAudioContext,
  buf: AudioBuffer,
  at: number,
  sustain: number,
  gain: number,
): void {
  const level = def.level ?? 1
  if (def.sustain === 'loop') {
    const node = ctx.createBufferSource()
    node.buffer = buf
    node.loop = true
    const g = ctx.createGain()
    g.gain.value = gain * level
    node.connect(g).connect(ctx.destination)
    node.start(at)
    node.stop(at + sustain)
    return
  }
  const rand = makeRand(hashSeed(def.src ?? def.id))
  // 连贯颗粒流：颗粒间隔 ≈ 颗粒时长的 1/4（下限 45ms），四层以上相互重叠 ——
  // 听感是**连续的一片**，不是断续的爆点。电平按重叠层数做 √n 衰减保持响度稳定，
  // 音高 4% 内微抖让纹理活一点。断断续续的重复是明确不要的形态。
  const grain = buf.duration
  const interval = Math.max(0.045, grain / 4)
  const perGain = (gain * level) / Math.sqrt(grain / interval)
  let t = at
  let n = 0
  while (t < at + sustain - 0.02 && n < 900) {
    const rate = 0.96 + rand() * 0.08
    const node = ctx.createBufferSource()
    node.buffer = buf
    node.playbackRate.value = rate
    const g = ctx.createGain()
    g.gain.value = perGain * (0.9 + rand() * 0.2)
    node.connect(g).connect(ctx.destination)
    node.start(t)
    t += interval / rate
    n += 1
  }
}

/**
 * 统一的音效调度入口：预览（playSfx）与导出（renderSfxMix）都走这里。
 * 没有 sustain 需求（或卡片剩余时长没长出音效多少）就干脆的一声；
 * 有 sustain 时按音效的持续模式铺满整段。
 *
 * 采样文件可能还没解码完（首次触发）：加载完成后按剩余时长补铺，
 * 导出路径在调度前已统一预热缓存，因此烤进成片的时序是精确的。
 */
export function scheduleSfxCue(
  def: SfxDef,
  ctx: BaseAudioContext,
  at: number,
  gain: number,
  sustain?: number,
): void {
  // 无音效版本：设置层照常，但一个节点都不往上下文里塞
  if (SFX_MUTED) return
  // 预览路径换到"可停视图"上：节点统一登记、输出汇进总线，暂停即可全停
  const target = cacheKeyOf(ctx)
  // 只要给了时长（手动 sfxDuration 或长卡自动解算）且确实比一声长，就按持续模式铺满；
  // 没有时长请求就干脆一声。铺满形态由音效自己决定（loop / ticks / overlap）。
  const wantSustain = sustain != null && sustain > def.duration * 1.1
  if (def.src) {
    const buf = getFileBuffer(target, def.src)
    if (buf) {
      if (wantSustain && sustain != null) emitSustained(def, target, buf, at, sustain, gain)
      else playFileBuffer(target, buf, at, gain, def.level ?? 1)
      return
    }
    void loadSfxFile(def.src, target).then((loaded) => {
      if (!loaded) return
      const startAt = Math.max(at, target.currentTime + 0.02)
      const need = sustain != null ? Math.max(0.1, sustain - (startAt - at)) : undefined
      if (wantSustain && need != null) emitSustained(def, target, loaded, startAt, need, gain)
      else playFileBuffer(target, loaded, startAt, gain, def.level ?? 1)
    })
    return
  }
  if (wantSustain && sustain) {
    // 专属持续渲染优先：音效自己决定如何连贯铺满（如数字滚动的单一连续声流）
    if (def.scheduleSustain) {
      def.scheduleSustain(target, at, gain, sustain)
      return
    }
    // 合成音同样连贯铺满：重复间隔压到时长的一半，前后两遍相互重叠 ——
    // 听感是连续的数据串，不是一段一段的爆音；音量交替微抖避免死板。
    // 必须用 target（预览视图）：节点要登记进总线、输出要走总线，暂停才能全停
    const gap = def.duration * 0.5
    for (let t = at, i = 0; t < at + sustain - 0.02 && i < 300; t += gap, i += 1) {
      def.schedule(target, t, gain * (0.88 + (i % 2) * 0.12))
    }
    return
  }
  def.schedule(target, at, gain)
}

/** 预热：把所有采样音效（内置 + 拓展包已装载的）解码进预览上下文（app 启动后调用一次，试听/预览首响不空拍） */
export function preloadSfxFiles(): void {
  // 无音效版本：素材已删，预热只会白打一堆 404，直接跳过
  if (SFX_MUTED) return
  const ctx = liveContext()
  if (!ctx) return
  for (const def of sfxLibrary()) {
    if (def.src) void loadSfxFile(def.src, ctx)
  }
}

/** 白噪声缓冲区按上下文缓存：噪声源会被反复创建，每次都现算一遍太浪费 */
const noiseCache = new WeakMap<BaseAudioContext, AudioBuffer>()

function noiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  const cached = noiseCache.get(ctx)
  if (cached) return cached
  const len = Math.floor(ctx.sampleRate * 2)
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const data = buf.getChannelData(0)
  // 固定种子的线性同余：保证预览与导出渲染出的噪声完全一致（否则两次听到的"故障噪点"长得不一样）
  let seed = 20240917
  for (let i = 0; i < len; i += 1) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    data[i] = seed / 0x3fffffff - 1
  }
  noiseCache.set(ctx, buf)
  return buf
}

/** 固定种子的伪随机：保证预览与导出渲染出的"随机音"是同一串，不会两边长得不一样 */
function makeRand(seed: number): () => number {
  let s = seed >>> 0 || 1
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
}

/** 数字滚动的共享低通总线：滤掉三角波的高次谐波，听感圆润不扎耳 */
function digitRollBus(ctx: BaseAudioContext): BiquadFilterNode {
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 2300
  lp.Q.value = 0.7
  lp.connect(ctx.destination)
  return lp
}

/** 数字滚动的一颗"嗒"：软三角波，快起渐收 */
function digitTick(
  ctx: BaseAudioContext,
  lp: BiquadFilterNode,
  t: number,
  freq: number,
  level: number,
  decay: number,
): void {
  const osc = ctx.createOscillator()
  osc.type = 'triangle'
  osc.frequency.value = freq
  const g = envGain(ctx, t, level, 0.006, decay)
  osc.connect(g).connect(lp)
  osc.start(t)
  osc.stop(t + decay + 0.02)
}

/** 起一个噪声源（循环播放，靠包络裁出一段） */
function noiseSource(ctx: BaseAudioContext, at: number, dur: number): AudioBufferSourceNode {
  const src = ctx.createBufferSource()
  src.buffer = noiseBuffer(ctx)
  src.loop = true
  src.start(at, 0)
  src.stop(at + dur + 0.05)
  return src
}

/** 通用增益包络：0 → peak（attack）→ 近乎 0（dur 结束） */
function envGain(
  ctx: BaseAudioContext,
  at: number,
  peak: number,
  attack: number,
  dur: number,
): GainNode {
  const g = ctx.createGain()
  // exponentialRamp 不能到 0，用 0.0001 收尾
  g.gain.setValueAtTime(0.0001, at)
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), at + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  return g
}

export const SFX_LIBRARY: SfxDef[] = [
  {
    id: 'neonBlip',
    name: '霓虹轻点',
    hint: '短促的电子点触，最百搭的 UI 提示音',
    duration: 0.16,
    schedule(ctx, at, gain) {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(1250, at)
      osc.frequency.exponentialRampToValueAtTime(620, at + 0.09)
      // 各音效的电平在浏览器里实测对齐过（gain=1 时峰值约 0.75），
      // 保证换任何一个音效都不会突然变响或变闷
      const g = envGain(ctx, at, gain * 0.78, 0.008, 0.14)
      osc.connect(g).connect(ctx.destination)
      osc.start(at)
      osc.stop(at + 0.18)
    },
  },
  {
    id: 'dataPop',
    name: '数据弹出',
    hint: '音高上扬的弹跳音，适合数字 / 卡片冒出来',
    duration: 0.24,
    schedule(ctx, at, gain) {
      const osc = ctx.createOscillator()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(380, at)
      osc.frequency.exponentialRampToValueAtTime(940, at + 0.07)
      const g = envGain(ctx, at, gain * 0.8, 0.006, 0.22)
      osc.connect(g).connect(ctx.destination)
      osc.start(at)
      osc.stop(at + 0.26)
      // 叠一层高通噪声当"触点"，让起音更干脆
      const n = noiseSource(ctx, at, 0.03)
      const hp = ctx.createBiquadFilter()
      hp.type = 'highpass'
      hp.frequency.value = 2600
      const ng = envGain(ctx, at, gain * 0.3, 0.002, 0.03)
      n.connect(hp).connect(ng).connect(ctx.destination)
    },
  },
  {
    id: 'riser',
    name: '能量上涌',
    hint: '0.8 秒向上推进的蓄力音，配大标题 / 转场',
    duration: 0.85,
    schedule(ctx, at, gain) {
      const dur = 0.8
      const osc = ctx.createOscillator()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(170, at)
      osc.frequency.exponentialRampToValueAtTime(1350, at + dur)
      const lp = ctx.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.setValueAtTime(320, at)
      lp.frequency.exponentialRampToValueAtTime(6200, at + dur)
      lp.Q.value = 4
      // 先渐强再收尾，听着像在"蓄力"
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.0001, at)
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain * 0.55), at + dur * 0.82)
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
      osc.connect(lp).connect(g).connect(ctx.destination)
      osc.start(at)
      osc.stop(at + dur + 0.05)
      // 一层跟着一起爬的带通噪声，增加"气流感"
      const n = noiseSource(ctx, at, dur)
      const bp = ctx.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.setValueAtTime(500, at)
      bp.frequency.exponentialRampToValueAtTime(5200, at + dur)
      bp.Q.value = 1.1
      const ng = ctx.createGain()
      ng.gain.setValueAtTime(0.0001, at)
      ng.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain * 0.22), at + dur * 0.85)
      ng.gain.exponentialRampToValueAtTime(0.0001, at + dur)
      n.connect(bp).connect(ng).connect(ctx.destination)
    },
  },
  {
    id: 'whoosh',
    name: '数字滑入',
    hint: '带通噪声扫频，配卡片从侧面滑进来',
    duration: 0.52,
    schedule(ctx, at, gain) {
      const dur = 0.5
      const n = noiseSource(ctx, at, dur)
      const bp = ctx.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.setValueAtTime(380, at)
      bp.frequency.exponentialRampToValueAtTime(3400, at + dur)
      bp.Q.value = 1.3
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.0001, at)
      // 带通把噪声削掉大半，这里做 2.4 倍电平补偿，实测峰值才回到 0.7 上下
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain * 2.4), at + dur * 0.35)
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
      n.connect(bp).connect(g).connect(ctx.destination)
    },
  },
  {
    id: 'impact',
    name: '星际冲击',
    hint: '低频砸击 + 噪声爆点，强调重点数据',
    duration: 0.6,
    schedule(ctx, at, gain) {
      // 低频正弦砸下去
      const sub = ctx.createOscillator()
      sub.type = 'sine'
      sub.frequency.setValueAtTime(150, at)
      sub.frequency.exponentialRampToValueAtTime(42, at + 0.34)
      // 两层叠加会互相推高，实测 gain=1 时直接给满会削波（峰值 1.17），这里压到 0.72
      const sg = envGain(ctx, at, gain * 0.72, 0.005, 0.5)
      sub.connect(sg).connect(ctx.destination)
      sub.start(at)
      sub.stop(at + 0.55)
      // 噪声爆点：低通收掉刺耳的高频，听感更"厚"
      const n = noiseSource(ctx, at, 0.16)
      const lp = ctx.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.setValueAtTime(2400, at)
      lp.frequency.exponentialRampToValueAtTime(400, at + 0.16)
      const ng = envGain(ctx, at, gain * 0.32, 0.004, 0.16)
      n.connect(lp).connect(ng).connect(ctx.destination)
    },
  },
  {
    id: 'glitch',
    name: '故障噪点',
    hint: '几段错位的数字爆音，科技感最强，适合切换 / 报错',
    duration: 0.34,
    schedule(ctx, at, gain) {
      // 固定种子，保证每次听到（和导出出来的）都是同一串
      let seed = 987654321
      const rand = () => {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff
        return seed / 0x7fffffff
      }
      const bursts = 7
      for (let i = 0; i < bursts; i += 1) {
        const t = at + i * 0.038 + rand() * 0.012
        const dur = 0.016 + rand() * 0.022
        const n = noiseSource(ctx, t, dur)
        const bp = ctx.createBiquadFilter()
        bp.type = 'bandpass'
        bp.frequency.value = 700 + rand() * 3400
        // Q 别给太高：7 的时候窄带通几乎把噪声滤没了，实测峰值只有 0.15，基本听不见
        bp.Q.value = 3
        const g = ctx.createGain()
        g.gain.setValueAtTime(0.0001, t)
        g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain * (1.8 + rand() * 1.3)), t + 0.003)
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
        n.connect(bp).connect(g).connect(ctx.destination)
      }
    },
  },
  {
    id: 'scan',
    name: '电子扫描',
    hint: '带颤音的扫频，像仪器在扫描读数',
    duration: 0.58,
    schedule(ctx, at, gain) {
      const dur = 0.55
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(700, at)
      osc.frequency.exponentialRampToValueAtTime(1250, at + dur)
      // 颤音：用一个 28Hz 的 LFO 去调制振幅
      const lfo = ctx.createOscillator()
      lfo.type = 'sine'
      lfo.frequency.value = 28
      const lfoDepth = ctx.createGain()
      // 深度必须跟随电平：写成固定值的话，一旦基准电平调低就会出现"深度 > 基准"，
      // 振幅被调制到负数（相位反转），听感是抖得发毛而不是颤音。
      lfoDepth.gain.value = Math.max(0.0001, gain * 0.16)
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.0001, at)
      // 持续音的听感响度远高于短音，同样的峰值下 RMS 是别人的十倍，所以电平要压一半
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain * 0.3), at + 0.05)
      g.gain.setValueAtTime(Math.max(0.0002, gain * 0.3), at + dur * 0.7)
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
      lfo.connect(lfoDepth).connect(g.gain)
      osc.connect(g).connect(ctx.destination)
      osc.start(at)
      osc.stop(at + dur + 0.05)
      lfo.start(at)
      lfo.stop(at + dur + 0.05)
    },
  },
  {
    id: 'lock',
    name: '信号锁定',
    hint: '双音锁定提示（纯五度），适合"得出结论 / 定格"',
    duration: 0.62,
    schedule(ctx, at, gain) {
      // 880Hz 与 1320Hz 是纯五度，叠在一起有明确的"锁定"感
      for (const [freq, amp] of [
        [880, 0.5],
        [1320, 0.32],
      ] as const) {
        const osc = ctx.createOscillator()
        osc.type = 'sine'
        osc.frequency.value = freq
        const g = envGain(ctx, at, gain * amp, 0.01, 0.58)
        osc.connect(g).connect(ctx.destination)
        osc.start(at)
        osc.stop(at + 0.62)
      }
      // 起音处一小撮高通噪声，模拟"咔哒"锁上
      const n = noiseSource(ctx, at, 0.025)
      const hp = ctx.createBiquadFilter()
      hp.type = 'highpass'
      hp.frequency.value = 3200
      const ng = envGain(ctx, at, gain * 0.3, 0.002, 0.025)
      n.connect(hp).connect(ng).connect(ctx.destination)
    },
  },
  {
    id: 'digitRoll',
    name: '数字滚动',
    hint: '柔和的电子计数声，音高随数字爬升，长数据卡连续滚到卡尾（无回音）',
    duration: 0.85,
    schedule(ctx, at, gain) {
      // 短卡一声：一串渐升的软"嗒" + 单颗收尾（不用两连音，避免回音感）
      const lp = digitRollBus(ctx)
      const steps = 12
      const gap = 0.05
      for (let i = 0; i < steps; i += 1) {
        const prog = i / (steps - 1)
        digitTick(ctx, lp, at + i * gap, 950 + prog * 600, gain * 0.42 * (0.72 + prog * 0.38), 0.042)
      }
      digitTick(ctx, lp, at + steps * gap + 0.02, 1720, gain * 0.4, 0.12)
    },
    scheduleSustain(ctx, at, gain, sustain) {
      // 长卡铺满：**整段只有一条**连续嗒嗒声流，音高从头到尾一次性爬升
      //（数字越滚越快、越接近终值），卡尾一颗更高的"停住"音。
      // 绝不重叠两段序列、不加重复确认音 —— 那是回音感的来源。
      const lp = digitRollBus(ctx)
      const gap = 0.042
      const n = Math.max(2, Math.floor(sustain / gap))
      for (let i = 0; i < n; i += 1) {
        const prog = i / Math.max(1, n - 1)
        digitTick(ctx, lp, at + i * gap, 950 + prog * 620, gain * 0.42 * (0.72 + prog * 0.38), 0.042)
      }
      digitTick(ctx, lp, at + n * gap + 0.01, 1720, gain * 0.4, 0.1)
    },
  },
  {
    id: 'signalPing',
    name: '信号电波',
    hint: '声呐 ping 带两声回声，最像"接收到信号"',
    duration: 0.92,
    schedule(ctx, at, gain) {
      // 主 ping + 两声衰减的回声 —— 回声是"信号感"的关键，单发 ping 听起来只是个滴声
      const echoes: { delay: number; amp: number; freq: number }[] = [
        { delay: 0, amp: 1, freq: 1760 },
        { delay: 0.16, amp: 0.5, freq: 1740 },
        { delay: 0.34, amp: 0.26, freq: 1715 },
      ]
      for (const e of echoes) {
        const t = at + e.delay
        const osc = ctx.createOscillator()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(e.freq, t)
        // 每一声都稍微往下掉一点，像信号在衰减
        osc.frequency.exponentialRampToValueAtTime(e.freq * 0.94, t + 0.1)
        const g = envGain(ctx, t, gain * 0.8 * e.amp, 0.004, 0.11)
        osc.connect(g).connect(ctx.destination)
        osc.start(t)
        osc.stop(t + 0.13)
      }
    },
  },
  {
    id: 'dataStream',
    name: '数据传输',
    hint: '阶梯式跳音的数据串，长流程卡会自动重复到卡尾',
    duration: 0.62,
    sustain: 'repeat',
    schedule(ctx, at, gain) {
      const rand = makeRand(13571)
      // 频率走"阶梯"而不是纯随机：听感像数据在一段段往外送
      const ladder = [880, 1180, 1040, 1480, 1320, 1760, 1560, 2090]
      for (let i = 0; i < ladder.length; i += 1) {
        const t = at + i * 0.052
        const osc = ctx.createOscillator()
        osc.type = 'square'
        osc.frequency.value = ladder[i] + (rand() - 0.5) * 90
        const lp = ctx.createBiquadFilter()
        lp.type = 'lowpass'
        lp.frequency.value = 4200
        const g = envGain(ctx, t, gain * 0.62, 0.003, 0.034)
        osc.connect(lp).connect(g).connect(ctx.destination)
        osc.start(t)
        osc.stop(t + 0.04)
      }
    },
  },
  {
    id: 'synthHit',
    name: '电音重击',
    hint: '双振荡器失谐下扫的合成器撞击，比「星际冲击」更电子',
    duration: 0.72,
    schedule(ctx, at, gain) {
      // 两个锯齿失谐 ±14 音分叠一起 —— 合成器厚度的经典做法
      const lp = ctx.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.setValueAtTime(3200, at)
      lp.frequency.exponentialRampToValueAtTime(320, at + 0.4)
      // Q=6 时谐振把两个失谐锯齿推到峰值 1.28（削波），降到 4 并压电平
      lp.Q.value = 4
      const g = envGain(ctx, at, gain * 0.38, 0.004, 0.55)
      lp.connect(g).connect(ctx.destination)
      for (const detune of [-14, 14]) {
        const osc = ctx.createOscillator()
        osc.type = 'sawtooth'
        osc.detune.value = detune
        osc.frequency.setValueAtTime(420, at)
        osc.frequency.exponentialRampToValueAtTime(78, at + 0.36)
        osc.connect(lp)
        osc.start(at)
        osc.stop(at + 0.6)
      }
      // 顶部一层金属泛音，让撞击有"电"的亮边
      const hi = ctx.createOscillator()
      hi.type = 'sine'
      hi.frequency.setValueAtTime(3100, at)
      hi.frequency.exponentialRampToValueAtTime(2400, at + 0.12)
      const hg = envGain(ctx, at, gain * 0.26, 0.003, 0.13)
      hi.connect(hg).connect(ctx.destination)
      hi.start(at)
      hi.stop(at + 0.16)
    },
  },
  /* ─────────────── 科技感采样（免费可商用，文件在 public/sfx/）───────────────
   * 全部峰值归一化过，schedule 不再加包络；电平差异用 level 对齐听感。 */
  {
    id: 'uiClick',
    name: '科技点击',
    hint: '真实的科幻 UI 点击声，干净利落',
    duration: 0.2,
    src: 'ui-click.mp3',
    level: 0.62,
    group: '科技感采样',
    schedule: fileSfxSchedule('ui-click.mp3', 0.62),
  },
  {
    id: 'robotClick',
    name: '机械按键',
    hint: '金属质感的设备按键声，配流程 / 步骤',
    duration: 0.42,
    src: 'robot-click.mp3',
    level: 0.62,
    group: '科技感采样',
    schedule: fileSfxSchedule('robot-click.mp3', 0.62),
  },
  {
    id: 'alienButton',
    name: '异星按钮',
    hint: '短促的外星设备按钮音',
    duration: 0.11,
    src: 'alien-button.mp3',
    level: 0.6,
    group: '科技感采样',
    schedule: fileSfxSchedule('alien-button.mp3', 0.6),
  },
  {
    id: 'interfaceHint',
    name: '界面提示',
    hint: '科幻界面提示音，配清单 / 要点出现',
    duration: 0.76,
    src: 'interface-hint.mp3',
    level: 0.6,
    group: '科技感采样',
    schedule: fileSfxSchedule('interface-hint.mp3', 0.6),
  },
  {
    id: 'interfaceZoom',
    name: '界面聚焦',
    hint: '界面聚焦的短促电子音',
    duration: 0.18,
    src: 'interface-zoom.mp3',
    level: 0.6,
    group: '科技感采样',
    schedule: fileSfxSchedule('interface-zoom.mp3', 0.6),
  },
  {
    id: 'interfaceExpand',
    name: '界面弹出',
    hint: '界面元素弹出 / 展开的空气感',
    duration: 0.28,
    src: 'interface-expand.mp3',
    level: 0.62,
    group: '科技感采样',
    schedule: fileSfxSchedule('interface-expand.mp3', 0.62),
  },
  {
    id: 'sciFiConfirm',
    name: '确认回执',
    hint: '科幻确认提示，配结论 / 收尾',
    duration: 0.79,
    src: 'sci-fi-confirm.mp3',
    level: 0.6,
    group: '科技感采样',
    schedule: fileSfxSchedule('sci-fi-confirm.mp3', 0.6),
  },
  {
    id: 'cyberConfirm',
    name: '赛博确认',
    hint: '赛博感的肯定提示音',
    duration: 0.53,
    src: 'cyber-confirm.mp3',
    level: 0.6,
    group: '科技感采样',
    schedule: fileSfxSchedule('cyber-confirm.mp3', 0.6),
  },
  {
    id: 'fastSweep',
    name: '快速扫频',
    hint: '一闪而过的转场扫频',
    duration: 0.32,
    src: 'fast-sweep.mp3',
    level: 0.68,
    group: '科技感采样',
    schedule: fileSfxSchedule('fast-sweep.mp3', 0.68),
  },
  {
    id: 'roboticSweep',
    name: '机械扫掠',
    hint: '机械感扫掠，配卡片滑入',
    duration: 0.7,
    src: 'robotic-sweep.mp3',
    level: 0.68,
    group: '科技感采样',
    schedule: fileSfxSchedule('robotic-sweep.mp3', 0.68),
  },
  {
    id: 'smallGlitch',
    name: '微型故障',
    hint: '短促的故障噪点（真实采样），适合切换 / 报错',
    duration: 1.11,
    src: 'small-glitch.mp3',
    level: 0.55,
    group: '科技感采样',
    schedule: fileSfxSchedule('small-glitch.mp3', 0.55),
  },
  {
    id: 'plasmaPowerUp',
    name: '等离子充能',
    hint: '充能上电的推进感，配开场 / 蓄力',
    duration: 1.64,
    src: 'plasma-powerup.mp3',
    level: 0.7,
    group: '科技感采样',
    schedule: fileSfxSchedule('plasma-powerup.mp3', 0.7),
  },
  {
    id: 'arcadeBling',
    name: '街机叮',
    hint: '街机得分叮，数据达成 / 排行榜',
    duration: 0.31,
    src: 'arcade-bling.mp3',
    level: 0.55,
    group: '科技感采样',
    schedule: fileSfxSchedule('arcade-bling.mp3', 0.55),
  },
  {
    id: 'fastBleep',
    name: '快速哔声',
    hint: '短促的信号哔声',
    duration: 0.39,
    src: 'fast-bleep.mp3',
    level: 0.6,
    group: '科技感采样',
    schedule: fileSfxSchedule('fast-bleep.mp3', 0.6),
  },
  {
    id: 'dataProcessing',
    name: '数据运算',
    hint: '电脑运算噪声底（无缝循环），长数据卡铺满整段',
    duration: 1.4,
    src: 'data-processing.mp3',
    level: 0.4,
    sustain: 'loop',
    group: '科技感采样',
    schedule: fileSfxSchedule('data-processing.mp3', 0.4),
  },
  {
    id: 'metalImpact',
    name: '金属撞击',
    hint: '真实金属撞击，强调关键数据',
    duration: 0.19,
    src: 'metal-impact.mp3',
    level: 0.75,
    group: '科技感采样',
    schedule: fileSfxSchedule('metal-impact.mp3', 0.75),
  },
  {
    id: 'forceField',
    name: '能量力场',
    hint: '力场展开的嗡鸣，长卡自动重复到卡尾',
    duration: 0.55,
    src: 'force-field.mp3',
    level: 0.6,
    sustain: 'repeat',
    group: '科技感采样',
    schedule: fileSfxSchedule('force-field.mp3', 0.6),
  },
  {
    id: 'deepImpact',
    name: '深频爆点',
    hint: '低频爆点（真实采样），重音强调',
    duration: 0.89,
    src: 'deep-impact.mp3',
    level: 0.8,
    group: '科技感采样',
    schedule: fileSfxSchedule('deep-impact.mp3', 0.8),
  },
  {
    id: 'electricChain',
    name: '电子电流',
    hint: '电流窜动的滋滋声',
    duration: 0.72,
    src: 'electric-chain.mp3',
    level: 0.55,
    group: '科技感采样',
    schedule: fileSfxSchedule('electric-chain.mp3', 0.55),
  },
  {
    id: 'beepSequence',
    name: '哔声序列',
    hint: '经典科幻哔哔声序列',
    duration: 1.2,
    src: 'beep-sequence.mp3',
    level: 0.6,
    group: '科技感采样',
    schedule: fileSfxSchedule('beep-sequence.mp3', 0.6),
  },
]

const SFX_BY_ID = new Map<string, SfxDef>(SFX_LIBRARY.map((s) => [s.id, s]))

/**
 * 运行时注册的音效（拓展包自带的那批）。
 *
 * 内置音效是编译期常量，改不了；拓展包的音效只能在页面上"现签入库"，所以单独一张表，
 * 查询时优先查它 —— 包里的音效 id 不会和内置的重名（注册时已跳重）。
 * 界面靠下面的"版本号"订阅知道名单变了，下拉框会立刻多出这些选项。
 */
const EXTRA_SFX: SfxDef[] = []
const EXTRA_BY_ID = new Map<string, SfxDef>()

let sfxVersion = 0
const sfxListeners = new Set<() => void>()

function emitSfxChange(): void {
  sfxVersion += 1
  sfxListeners.forEach((fn) => fn())
}

/** React 侧用 `useSyncExternalStore(subscribeSfx, getSfxVersion)` 感知音效名单变化 */
export function subscribeSfx(listener: () => void): () => void {
  sfxListeners.add(listener)
  return () => sfxListeners.delete(listener)
}

export function getSfxVersion(): number {
  return sfxVersion
}

/**
 * 注册拓展包带来的音效。同 id 已存在（不论内置还是已注册的包）就跳过，不会互相顶掉。
 * 返回真正入库的那几个，方便包面板显示"装进去了几个"。
 */
export function registerSfx(defs: SfxDef[]): SfxDef[] {
  const added: SfxDef[] = []
  for (const def of defs) {
    if (!def?.id || def.id === 'none') continue
    if (SFX_BY_ID.has(def.id) || EXTRA_BY_ID.has(def.id)) continue
    if (!def.src && typeof def.schedule !== 'function') continue // 既没文件也不会发声，拒收
    EXTRA_SFX.push(def)
    EXTRA_BY_ID.set(def.id, def)
    added.push(def)
  }
  if (added.length) emitSfxChange()
  return added
}

/** 卸载某个包注册的音效（停用拓展包时用） */
export function unregisterSfxByPack(packId: string): void {
  const stay: SfxDef[] = []
  const removed: SfxDef[] = []
  for (const def of EXTRA_SFX) {
    if (def.packId === packId) removed.push(def)
    else stay.push(def)
  }
  if (!removed.length) return
  EXTRA_SFX.length = 0
  EXTRA_SFX.push(...stay)
  removed.forEach((d) => EXTRA_BY_ID.delete(d.id))
  emitSfxChange()
}

/** 当前可用的全部音效（内置 + 已装载的拓展包） */
export function sfxLibrary(): SfxDef[] {
  return [...SFX_LIBRARY, ...EXTRA_SFX]
}

/** 面板下拉用的选项（含「无」）。音效名单会随拓展包变化，所以做成函数而不是常量 */
export function sfxOptions(): { id: SfxId; name: string; hint: string; group?: string }[] {
  return [
    { id: 'none', name: '无', hint: '这张卡不发音效' },
    ...sfxLibrary().map((s) => ({ id: s.id, name: s.name, hint: s.hint, group: s.group })),
  ]
}

/**
 * 纯 JSON 也能描述一个采样音效：给文件名即可，由这里补出播放函数。
 * 拓展包在 manifest 里写 `sounds: [{ id, name, hint, duration, src, level, group }]` 就够了。
 *
 * @param opts.packId 归属哪个拓展包（停用时要能整体卸载，所以必须记下来）
 * @param opts.fileUrl 文件的绝对地址（相对的是 public/sfx/，包的音效由调用方先拼绝对路径）
 */
export function fileSfxDef(opts: {
  id: string
  name: string
  hint: string
  duration: number
  src: string
  level?: number
  group?: string
  sustain?: 'repeat' | 'loop'
  packId?: string
}): SfxDef {
  const level = opts.level ?? 1
  return {
    id: opts.id as SfxId,
    name: opts.name,
    hint: opts.hint,
    duration: opts.duration,
    src: opts.src,
    level,
    group: opts.group,
    sustain: opts.sustain,
    packId: opts.packId,
    schedule: fileSfxSchedule(opts.src, level),
  }
}

export function sfxDef(id: SfxId | undefined): SfxDef | null {
  if (!id || id === 'none') return null
  return EXTRA_BY_ID.get(id) ?? SFX_BY_ID.get(id) ?? null
}

/**
 * 兜底：pad 到字符串即可，**不按"当前是否认识"裁掉**。
 *
 * 拓展包的音效只在包装载后才在名单里 —— 若这里把不认识的 id 一律改成 'none'，
 * 用户拿到没装那个包的电脑打开工程，卡片上的音效选择就被静默抹掉了，装上包也回不来。
 * 解算阶段 `sfxDef()` 查不到的 id 自然当作不响，两边都不会炸。
 */
export function normalizeSfxId(v: unknown): SfxId {
  return typeof v === 'string' && v.length > 0 ? v : 'none'
}

/** 参与音效解算的最少字段（用结构类型，避免 sfx.ts 反向依赖 types.ts 形成循环引用） */
type SfxHost = {
  start: number
  duration: number
  sfxOn?: boolean
  sfxId?: SfxId
  sfxVolume?: number
  sfxOffset?: number
  /** 用户手动指定的音效时长（秒）。未设置 = 自动（持续型跟到卡尾，其余一声） */
  sfxDuration?: number
}

/**
 * 卡片内部动画的「起音比例」：这张卡的主动作在第几成进度才真正开始。
 *
 * 卡片里的动画都是按 progress（0~1）推进的，很多卡会给主元素一个 delay，
 * 比如核心数字滚动的 CountUp delay=0.08 —— 意味着数字要到 8% 进度才开始涨。
 * 音效如果卡在卡片起点响，就会比"数字开始变"早一截，看着对不上。
 *
 * 这里存的是「比例」而不是秒：因为 delay 是 progress 的单位，换算成秒要乘卡片时长，
 * 同一张卡在不同时长下起音时刻本来就不同，存比例才对。
 *
 * 下面这些值都是从各卡源码里逐个读出来的（CountUp 的 delay / progress - x 的 x），
 * 量不准的宁可写 0 让它贴在卡起点响，也不要瞎猜一个导致反而更错位。
 */
export const SFX_ONSET_BY_EFFECT: Record<string, number> = {
  'core-number-roller': 0.08,
  'compare-bars': 0.12,
  'kpi-card': 0.08,
  'dual-number': 0.1,
  'progress-bar': 0.12,
  'ring-card': 0.1,
  'trend-card': 0.1,
  'data-grid': 0.08,
  'rank-card': 0.08,
  'stack-bar': 0.15,
  'bar-chart-race': 0.18,
  'bar-chart-3d': 0.18,
  // 这张卡的数字是从 progress=0 就开始涨的，显式写 0 挡掉下面的分类兜底
  'replica-number-stat': 0,
}

/** 没逐个量过的卡，按分类给个兜底起音比例（数据类普遍在 0.08~0.18 之间） */
export const SFX_ONSET_BY_CATEGORY: Partial<Record<EffectCategory, number>> = {
  数据: 0.08,
}

/** 算出某张卡"自动对齐"的起音偏移（秒）。没有可依据的数据时返回 0。 */
export function autoSfxOffset(
  effectId: string | null | undefined,
  category: EffectCategory | null | undefined,
  duration: number,
): number {
  const frac =
    (effectId != null ? SFX_ONSET_BY_EFFECT[effectId] : undefined) ??
    (category ? SFX_ONSET_BY_CATEGORY[category] : undefined)
  if (!frac || !Number.isFinite(duration)) return 0
  // 取到毫秒（与工程里时间字段的精度一致），避免 0.18*5 变成 0.8999999999999999
  return Math.round(frac * duration * 1000) / 1000
}
type SfxProject = {
  sfxEnabled?: boolean
  sfxVolume?: number
  sfxDefaultId?: SfxId
}

/**
 * 按「动效分类」给的默认音效。
 *
 * 默认音已整体升级为**真实采样**（免费可商用，见 public/sfx/CREDITS.md）：
 * 比合成音更有质感，分类语义不变 —— 数据配计数器、开场配充能、对比配撞击…
 * 没列进来的分类仍然跟随工程默认（project.sfxDefaultId）。
 */
export const SFX_DEFAULT_BY_CATEGORY: Partial<Record<EffectCategory, SfxId>> = {
  开场: 'plasmaPowerUp', // 点题立主题：等离子充能向上推进
  金句: 'deepImpact', // 一句话 / 一个词打重：低频爆点
  数据: 'digitRoll', // 数字、图表、进度：机械计数器嗒嗒声
  对比: 'metalImpact', // A vs B 反差：金属撞击
  流程: 'robotClick', // 步骤、时间线、链路：机械按键
  关系: 'forceField', // 概念图、矩阵、环形：能量力场
  列表: 'interfaceHint', // 清单、要点、表格：界面提示
  人物: 'roboticSweep', // 人像、分工、对话：机械扫掠滑入
  贴片: 'uiClick', // 角标、窗口等 UI 零件：科技点击
  结尾: 'sciFiConfirm', // 收尾、总结、CTA：确认回执
  // 字幕 / 装饰 / 大屏模板 不给分类默认，跟随工程默认
}

/**
 * 解算一张卡"该不该响、响什么、多大声、什么时候响"。
 *
 * 这是唯一的判定入口 —— 预览播放、导出混音、参数面板显示都调它，
 * 免得三处各写一套口径、出现"预览有声音但导出没有"这种对不上的情况。
 *
 * 音效来源优先级：卡上显式指定 > 动效分类默认 > 工程默认。
 *
 * 触发时机优先用卡上写的 sfxOffset（秒）；没写就自动对齐卡片动画起音
 * （见 SFX_ONSET_BY_EFFECT），这样数字卡不会在还没开始涨数字时就先响。
 *
 * @param isSubtitle 是否是口播字幕卡。字幕默认不发音效（一句一响会很吵），
 *                   但用户显式给某句指定了音效时仍然生效。
 * @param category   该卡所属动效分类（如「数据」），用来挑分类默认音效与兜底起音。
 * @param effectId   动效 id，用来查这张卡精确的起音比例。
 *
 * 返回值里的 sustain：卡片够长时 = 声音要连贯铺满的秒数（自动 = 到卡尾，也可被
 * 卡上的 sfxDuration 覆盖）——**对所有音效生效**，不限于标记过持续模式的几个；
 * 预览与导出都会按它把声音铺满整段。
 */
export function resolveSfx(
  inst: SfxHost,
  project: SfxProject,
  isSubtitle = false,
  category?: EffectCategory | null,
  effectId?: string | null,
): { at: number; id: SfxId; gain: number; sustain?: number } | null {
  // 总开关关着 → 整片静音
  if (project.sfxEnabled === false) return null
  // 该卡被单独静音
  if (inst.sfxOn === false) return null

  // 卡上只要写过 sfxId（哪怕是 'none'）就算"显式指定"，必须压过分类 / 工程默认。
  // 否则数据类卡选了「无」会被分类默认（数字滚动）顶回来，静音不掉。
  const hasExplicit = inst.sfxId != null
  if (hasExplicit && inst.sfxId === 'none') return null

  const byCategory = category ? SFX_DEFAULT_BY_CATEGORY[category] : undefined
  const id = hasExplicit ? inst.sfxId! : (byCategory ?? project.sfxDefaultId ?? DEFAULT_SFX_ID)
  // 字幕卡：没显式指定就别响
  if (!hasExplicit && isSubtitle) return null
  if (id === 'none' || !sfxDef(id)) return null

  const gain = clamp01(inst.sfxVolume ?? 1) * clamp01(project.sfxVolume ?? DEFAULT_SFX_VOLUME)
  if (gain <= 0.001) return null

  // 偏移优先用卡上显式写的（秒）；没写就按这张卡的动画起音比例自动算。
  // 注意这里的 0 与 undefined 是两种意思：写 0 = 就要贴在卡起点响，别再自动对齐。
  const offset = inst.sfxOffset ?? autoSfxOffset(effectId, category, inst.duration)
  const start = Number.isFinite(inst.start) ? inst.start : 0
  const at = Math.max(0, start + offset)
  // 长卡延续 / 手动时长：
  //  - 卡上写了 sfxDuration → 以它为准，任意音效都能按这个时长连续铺满
  //    （超出卡片范围按卡尾截断；不比一声长就退回一声）
  //  - 没写 → **任何音效**在长卡上都自动跟随数据动画连贯铺到卡尾 ——
  //    "自动"不能只对少数标记过的音效生效，否则换了音效就又变成一声，自动按钮形同虚设
  let sustain: number | undefined
  const def = sfxDef(id)!
  const cardRemain = Number.isFinite(inst.duration) ? start + inst.duration - at - 0.12 : null
  // Number() 兜底：老工程 / 手改 JSON 里可能存成字符串
  const manualDur = Number(inst.sfxDuration)
  if (Number.isFinite(manualDur) && manualDur > 0.05) {
    const want = manualDur
    const capped = cardRemain == null ? want : Math.min(want, Math.max(0.1, cardRemain))
    if (capped > def.duration * 1.1) sustain = Math.round(capped * 1000) / 1000
  } else if (cardRemain != null) {
    if (cardRemain > def.duration + 0.4) sustain = Math.round(cardRemain * 1000) / 1000
  }
  return { at, id, gain, sustain }
}

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0
  return Math.max(0, Math.min(1, v))
}

/* ─────────────── 预览 / 试听 ─────────────── */

let liveCtx: AudioContext | null = null

function liveContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  if (!liveCtx) liveCtx = new Ctor()
  // 浏览器策略：未经用户手势创建的上下文是 suspended，播不出声
  if (liveCtx.state === 'suspended') void liveCtx.resume()
  return liveCtx
}

/** 立即播一次（试听按钮 / 预览播放触发）。sustain = 需要延续的秒数（长卡跟随数据动画），试听不传就是干脆一声 */
export function playSfx(id: SfxId | undefined, volume = 1, sustain?: number): void {
  // 无音效版本：直接返回，连 AudioContext 都不创建
  if (SFX_MUTED) return
  const def = sfxDef(id)
  if (!def) return
  const ctx = liveContext()
  if (!ctx) return
  const v = Math.max(0, Math.min(1, volume))
  if (v <= 0.001) return
  scheduleSfxCue(def, ctx, ctx.currentTime + 0.02, v * 0.85, sustain)
}

/* ─────────────── 导出混音 ─────────────── */

export type SfxCue = {
  /** 触发时间（工程时间轴上的绝对秒） */
  at: number
  id: SfxId
  /** 线性增益 0~1（已算好单卡音量 × 全局音量） */
  gain: number
  /** 持续秒数：音效为持续型且卡片够长时存在，混音时铺满这一段 */
  sustain?: number
}

/**
 * 导出用的采样率。
 * 这些音效的高频内容基本在 8kHz 以内，22050Hz（奈奎斯特 11kHz）足够还原，
 * 而相比 44100Hz 能让烤进成片的 WAV 小一半 —— 5 分钟工程约 13MB，走 base64 也扛得住。
 */
export const SFX_MIX_SAMPLE_RATE = 22050

/**
 * 把所有音效按时间轴混成一条音轨（离线渲染，不发声）。
 * 返回 null 表示没有可混的内容，调用方应当跳过烤入。
 *
 * @param bed 用户另外上传的背景音频（选填）。会整段铺在时间轴 0 秒处，与音效叠加。
 *            采样率不一致没关系，AudioBufferSourceNode 会自动重采样。
 */
export async function renderSfxMix(
  cues: SfxCue[],
  duration: number,
  opts: { sampleRate?: number; bed?: AudioBuffer | null } = {},
): Promise<AudioBuffer | null> {
  // 无音效版本：不合成任何音轨（调用方拿到 null 会自动跳过烤入）。
  // 注意这里连 bed 也一并忽略 —— 否则会导出一条只有背景音的"空音轨"。
  if (SFX_MUTED) return null
  const sampleRate = opts.sampleRate ?? SFX_MIX_SAMPLE_RATE
  const bed = opts.bed ?? null
  const usable = cues.filter((c) => sfxDef(c.id) && c.gain > 0.001 && Number.isFinite(c.at) && c.at >= 0)
  // 没有音效也没有背景音 → 没必要生成空轨
  if (usable.length === 0 && !bed) return null
  if (typeof window === 'undefined') return null
  const Ctor =
    window.OfflineAudioContext ??
    (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext })
      .webkitOfflineAudioContext
  if (!Ctor) return null
  // 多留 1 秒尾巴，保证最后一个音效的尾音不被截断；
  // 背景音比工程长时也按它算，别把人家的音乐截了。
  const total = Math.max(0.2, duration + 1, bed ? bed.duration : 0)
  const ctx = new Ctor(1, Math.ceil(total * sampleRate), sampleRate)
  if (bed) {
    const src = ctx.createBufferSource()
    src.buffer = bed
    src.connect(ctx.destination)
    src.start(0)
  }
  // 采样音效先把文件解码进这个离线上下文（合成音无需此步），schedule 里才能取到缓存
  const fileSrcs = [
    ...new Set(usable.map((c) => sfxDef(c.id)!.src).filter((s): s is string => Boolean(s))),
  ]
  await Promise.all(fileSrcs.map((s) => loadSfxFile(s, ctx)))
  for (const c of usable) {
    if (c.at >= total) continue
    scheduleSfxCue(sfxDef(c.id)!, ctx, c.at, Math.min(1, c.gain), c.sustain)
  }
  return ctx.startRendering()
}

/** AudioBuffer → 16bit PCM WAV 的 base64（不含 data: 前缀） */
export function audioBufferToWavBase64(buf: AudioBuffer): string {
  const channels = Math.max(1, buf.numberOfChannels)
  const len = buf.length
  const dataBytes = len * channels * 2
  const ab = new ArrayBuffer(44 + dataBytes)
  const view = new DataView(ab)
  const str = (off: number, s: string) => {
    for (let i = 0; i < s.length; i += 1) view.setUint8(off + i, s.charCodeAt(i))
  }
  str(0, 'RIFF')
  view.setUint32(4, 36 + dataBytes, true)
  str(8, 'WAVE')
  str(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, channels, true)
  view.setUint32(24, buf.sampleRate, true)
  view.setUint32(28, buf.sampleRate * channels * 2, true)
  view.setUint16(32, channels * 2, true)
  view.setUint16(34, 16, true)
  str(36, 'data')
  view.setUint32(40, dataBytes, true)

  // 多声道交错写入；这里导出用的是单声道，但保持通用
  const data = new Float32Array(len * channels)
  for (let ch = 0; ch < channels; ch += 1) {
    const src = buf.getChannelData(ch)
    for (let i = 0; i < len; i += 1) data[i * channels + ch] = src[i]
  }
  let off = 44
  for (let i = 0; i < data.length; i += 1) {
    const s = Math.max(-1, Math.min(1, data[i]))
    view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    off += 2
  }

  const bytes = new Uint8Array(ab)
  let bin = ''
  const chunk = 0x8000 // 分块，避免 apply 爆调用栈
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(bin)
}

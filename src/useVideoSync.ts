import { useEffect, useRef, type RefObject } from 'react'

/** 偏差超过这个值就直接定位（硬 seek 会打断解码，只在偏得离谱时用） */
const HARD_SEEK = 0.5
/** 播放中允许的偏差（秒）：小于它交给视频自己跑，不做任何干预 */
const SOFT_TOLERANCE = 0.06
/** 播放头贴到视频结尾的判定余量，避免 seek 到末尾被 clamp 后反复触发 ended */
const END_EPS = 0.03
/** 追帧时播放速率的上下限 */
const RATE_MIN = 0.8
const RATE_MAX = 1.3

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

declare global {
  interface Window {
    /** 录屏导出倍速（导出端注入）；有值 = 正在倍速录屏，视频要按这个速率真播放 */
    __EXPORT_RATE?: number
  }
}

/** 读录屏导出倍速；非导出态返回 undefined */
export function exportRateOf(): number | undefined {
  const r = (globalThis as unknown as Record<string, unknown>).__EXPORT_RATE
  return typeof r === 'number' && r > 0 ? r : undefined
}

/**
 * 让一个 <video> 跟随播放头走。垫底视频和出镜视频共用这一份逻辑 ——
 * 之前两处各写了一遍，改一处漏一处就会只修好一半。
 *
 * 设计前提：**播放头是主时钟**（它由 requestAnimationFrame 精确推进），
 * 视频是跟随者。视频一旦自己停了，画面就冻在那一帧上，
 * 所以这里有两道保险：一道每帧校正偏差，一道每帧确认它真的在播。
 */
export function useVideoSync(
  ref: RefObject<HTMLVideoElement | null>,
  currentTime: number,
  playing: boolean,
  enabled: boolean,
  /**
   * 录屏导出倍速。设置时代表"正在以 speed 倍速录屏"：
   * 此时视频必须**真的按这个倍率播放**，而不是每帧硬 seek ——
   * 播放头以 speed 倍速推进，硬 seek 每次都要等解码，根本追不上，
   * 画面就会是黑的或者冻在旧帧上。
   */
  exportRate?: number,
) {
  // play() 是异步的：在它落地之前不要重复调用，否则后一次会把前一次 abort 掉
  const restoringRef = useRef(false)

  // ① 每帧校正：播放头走到哪，画面就得到哪
  useEffect(() => {
    const v = ref.current
    if (!v || !enabled || v.readyState < 1) return

    const dur = Number.isFinite(v.duration) ? v.duration : Infinity
    // 播放头已经越过视频结尾：此时 seek 会被浏览器 clamp 到末尾并反复触发 ended，
    // 越 seek 越死。干脆明确停住，别再徒劳。
    if (currentTime >= dur - END_EPS) {
      if (!v.paused) v.pause()
      return
    }

    const drift = currentTime - v.currentTime // 正数 = 视频落后于播放头

    // 录屏导出：按倍速持续播放，只在偏得离谱时硬定位一次
    if (exportRate != null) {
      if (v.paused) return // 交给下面那道「拉起来」的保险
      if (v.playbackRate !== exportRate) v.playbackRate = exportRate
      if (Math.abs(drift) > HARD_SEEK) v.currentTime = currentTime
      return
    }

    // 暂停时（逐帧编辑 / 逐帧导出）：必须精确落位，差一点都要对齐
    if (!playing) {
      if (Math.abs(drift) > 0.001) v.currentTime = currentTime
      if (v.playbackRate !== 1) v.playbackRate = 1
      return
    }

    // 该播但没在播（缓冲 / 解码压力 / 被节流 / 刚被 seek 打断）：
    // 此时 drift 必然持续变大，若在这里硬 seek，只会触发一轮新的缓冲把恢复时间拖得更长。
    // 交给下面那道「重新拉起来」的保险处理，等它真的播起来再校正。
    if (v.paused) return

    if (Math.abs(drift) > HARD_SEEK) {
      // 偏得太远，微调追不上了，直接定位
      v.currentTime = currentTime
      v.playbackRate = 1
    } else if (Math.abs(drift) > SOFT_TOLERANCE) {
      // 小偏差用播放速率追：硬 seek 会打断解码，画面反而顿一下
      const rate = clamp(1 + drift * 1.5, RATE_MIN, RATE_MAX)
      // 加一点死区，免得每帧都写 playbackRate 引起速率抖动
      if (Math.abs(v.playbackRate - rate) > 0.02) v.playbackRate = rate
    } else if (v.playbackRate !== 1) {
      v.playbackRate = 1
    }
  }, [ref, currentTime, playing, enabled, exportRate])

  // ② 每帧确认它真的在播
  // 缓冲、解码压力、浏览器节流、播到结尾……都会让视频悄悄停下。
  // 而 playing 这个状态并没变，只依赖 playing 的 effect 不会重跑，
  // 于是画面就一直冻在那一帧 —— 这正是「同一个画面重复播放」的来源。
  useEffect(() => {
    const v = ref.current
    if (!v || !enabled) return
    // 录屏导出属于「必须播放」：倍速录屏时视频停下就等于整段画面冻住
    const wantPlay = playing || exportRate != null
    if (!wantPlay) {
      if (!v.paused) v.pause()
      return
    }
    const dur = Number.isFinite(v.duration) ? v.duration : Infinity
    const pastEnd = currentTime >= dur - END_EPS
    // readyState >= 2 表示至少已有当前帧的数据，此时 play() 才不会空转
    if (v.paused && !v.ended && !pastEnd && v.readyState >= 2 && !restoringRef.current) {
      restoringRef.current = true
      v.play()
        .catch(() => undefined)
        .finally(() => {
          restoringRef.current = false
        })
    }
  }, [ref, currentTime, playing, enabled, exportRate])
}

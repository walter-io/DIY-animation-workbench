import { useEffect, useRef } from 'react'
import { useEditor, usePlayhead } from '../store'
import { isSubtitle } from '../subtitleTrack'
import { pauseSfx, playSfx, preloadSfxFiles, resolveSfx, resumeSfx, sfxDef } from '../sfx'

/**
 * 预览时触发音效（无渲染组件）。
 *
 * 只在**播放中**出声，拖播放头不出声 —— 否则每拖一格就叮一下，根本没法剪辑。
 *
 * 触发判定用「播放头是否跨过了触发点」而不是「当前时间是否等于触发点」：
 * rAF 是 ~16ms 一跳，几乎不可能正好落在触发点上，只有判断区间跨越才能稳定命中。
 */
export default function SfxPlayer() {
  const { state, effectFor } = useEditor()
  const currentTime = usePlayhead()
  const { playing, project } = state

  // 采样音效后台预热（fetch + decode）：不等第一次触发才加载，首响不空拍
  useEffect(() => {
    preloadSfxFiles()
  }, [])

  // 暂停 → 停掉预览里所有还在响的音效（含长卡铺满的持续声）；恢复播放 → 解除静音。
  // 已被停掉的声音不会"续播"：从卡前面重播会重新触发。
  useEffect(() => {
    if (playing) resumeSfx()
    else pauseSfx()
  }, [playing])

  /**
   * 起播补响：播放头停在卡片**内部**时按播放，触发点早已被越过 ——
   * 只靠"跨越触发点"判定的话，这张卡从头到尾都不会响，改时长 / 换音效 / 点自动
   * 看起来全都"没生效"。所以在播放开始的这一帧，把窗口还罩着播放头的卡补上：
   *  - 持续型音效（数字滚动这类）：按**剩余时长**接着铺到卡尾；
   *  - 一声音效：窗口还没走完就完整补一声。
   * 暂停恢复（wasPlaying=true）不补 —— 暂停时已把声音掐掉，续播不该再冒一声。
   */
  const wasPlayingRef = useRef(false)
  useEffect(() => {
    const starting = playing && !wasPlayingRef.current
    wasPlayingRef.current = playing
    if (!starting) return
    for (const inst of project.instances) {
      if (firedRef.current.has(inst.id)) continue
      const def = effectFor(inst.effectId)
      const cue = resolveSfx(inst, project, isSubtitle(inst), def?.category, inst.effectId)
      if (!cue) continue
      const dur = sfxDef(cue.id)?.duration ?? 0.3
      const end = cue.at + (cue.sustain ?? dur) + 0.2
      if (cue.at <= currentTime && currentTime < end) {
        firedRef.current.add(inst.id)
        playSfx(cue.id, cue.gain, cue.sustain != null ? Math.max(0.1, end - currentTime) : undefined)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing])

  /** 上一帧的播放头位置，用来判断"跨过" */
  const prevRef = useRef(currentTime)
  /** 已经响过的卡：同一张卡在一次播放里只响一次 */
  const firedRef = useRef(new Set<string>())

  useEffect(() => {
    const prev = prevRef.current
    // 必须在判定之后才更新，否则 prev 会等于 currentTime，永远命中不了区间
    prevRef.current = currentTime

    // 倒退 / 跳转：清空已触发记录，往回拖再播能重新听到
    if (currentTime < prev - 0.001) firedRef.current.clear()
    if (!playing) return
    if (project.sfxEnabled === false) return

    for (const inst of project.instances) {
      if (firedRef.current.has(inst.id)) continue
      // 传分类与动效 id：前者挑分类默认音，后者算"自动对齐动画起音"的偏移
      const def = effectFor(inst.effectId)
      const cue = resolveSfx(inst, project, isSubtitle(inst), def?.category, inst.effectId)
      if (!cue) continue
      // 触发点落在 (上一帧, 这一帧] 之间 = 这一帧跨过了它
      if (cue.at > prev && cue.at <= currentTime) {
        firedRef.current.add(inst.id)
        // sustain：长数据卡的持续型音效跟随动画响到卡尾（短卡没有这个字段，一声完事）
        playSfx(cue.id, cue.gain, cue.sustain)
      }
    }
  }, [currentTime, playing, project])

  // 停止播放 / 音效设置变化时清记录：下次重播从头响，改完设置立刻能听到效果
  useEffect(() => {
    if (!playing) firedRef.current.clear()
  }, [playing, project.sfxEnabled, project.sfxVolume, project.sfxDefaultId])

  return null
}

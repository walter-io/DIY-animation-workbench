import { Fragment, useRef, useState } from 'react'
import { MAX_TIMELINE, timelineEnd, useEditor, usePlayhead } from '../store'
import type { ImageClip, Instance } from '../types'
import { isSubtitle, subtitleTextOf, subtitleTrack } from '../subtitleTrack'
import { laneOf } from '../tracks'
import { findSplitTarget } from '../split'
import { sampleClipVisual, visualToKf } from '../mediaKeyframe'
import { sampleCardVisual, visualToCardKf, measureCardFrame } from '../cardKeyframe'

function fmt(t: number) {
  const m = Math.floor(t / 60)
  const s = (t % 60).toFixed(1).padStart(4, '0')
  return `${m}:${s}`
}

/** 轨道区默认高度（双击分隔条 / Home 键恢复）；上下限由 store 的 setTrackH 夹紧 */
const DEFAULT_TRACK_H = 200
/** 标尺 + 横向滚动条占掉的固定高度 */
const TRACK_CHROME_H = 34
/** 单条泳道行高范围 */
const MIN_ROW_H = 12
const MAX_ROW_H = 80

export default function Timeline() {
  const { state, dispatch } = useEditor()
  const currentTime = usePlayhead()
  const { project, selectedId, trackH } = state
  const trackRef = useRef<HTMLDivElement>(null)
  const [pxPerSec, setPxPerSec] = useState(36)
  const [hoverTime, setHoverTime] = useState<number | null>(null)
  const [resizing, setResizing] = useState(false)
  // 轨道长度 = 内容结尾 + 一段空白余量（见 timelineTail）。
  // 把卡往右拖 → 内容结尾变远 → 轨道跟着变长 → 余量又长出来，于是可以一直往右排。
  const span = timelineEnd(project)
  const contentWidth = Math.max(400, span * pxPerSec)
  // 时间轴右端的硬边界：只用于防止一次误拖甩到天荒地老
  const maxSpan = MAX_TIMELINE

  // 通用轨道数：至少用到的行数 与 用户手动添加的轨道数 取大，保证已排布的卡不被挤掉
  const usedTracks = project.instances.reduce((m, i) => {
    if (isSubtitle(i)) return m
    return Math.max(m, laneOf(i))
  }, 0)
  const genericN = Math.max(usedTracks, state.trackCount)
  // 行序：字幕轨(0) + 轨道1..N。出镜 / 机位两条专用泳道已取消：
  // 视频现在和图片一样是轨道上的普通片段，镜头切换靠片段自己的关键帧。
  const laneCount = genericN + 1
  const SUB_LANE = 0
  const rowH = Math.max(
    MIN_ROW_H,
    Math.min(MAX_ROW_H, Math.floor((trackH - TRACK_CHROME_H) / laneCount)),
  )
  const clipH = Math.max(10, rowH - 6)

  /** 片段显示名：素材名 + 类型标记（视频 / 图片） */
  const clipLabel = (clip: ImageClip) => {
    const asset = state.project.mediaAssets.find((a) => a.id === clip.assetId)
    const name = asset?.name ?? '素材'
    return asset?.kind === 'video' ? `▶ ${name}` : name
  }

  const startResizeTracks = (e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const startY = e.clientY
    const startH = trackH
    setResizing(true)
    const move = (ev: PointerEvent) => {
      dispatch({ type: 'setTrackH', height: Math.round(startH - (ev.clientY - startY)) })
    }
    const up = () => {
      setResizing(false)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      document.body.classList.remove('os-resizing')
    }
    document.body.classList.add('os-resizing')
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const onResizerKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 40 : 10
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      dispatch({ type: 'setTrackH', height: trackH + step })
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      dispatch({ type: 'setTrackH', height: trackH - step })
    } else if (e.key === 'Home') {
      e.preventDefault()
      dispatch({ type: 'setTrackH', height: DEFAULT_TRACK_H })
    }
  }

  const togglePlay = () => {
    if (state.playing) {
      dispatch({ type: 'pause' })
    } else {
      if (currentTime >= project.duration - 0.01) dispatch({ type: 'seek', time: 0 })
      dispatch({ type: 'play' })
    }
  }

  const onRulerClick = (e: React.MouseEvent) => {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect) return
    const ratio = (e.clientX - rect.left) / contentWidth
    dispatch({ type: 'seek', time: ratio * span })
  }

  /** 在标尺（含播放头）上按住拖动：连续 scrub，而不是一次只点一格 */
  const startScrub = (e: React.PointerEvent) => {
    e.preventDefault()
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect) return
    const seekTo = (clientX: number) => {
      const ratio = (clientX - rect.left) / contentWidth
      dispatch({
        type: 'seek',
        time: Math.max(0, Math.min(span, ratio * span)),
      })
    }
    seekTo(e.clientX)
    const move = (ev: PointerEvent) => seekTo(ev.clientX)
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }

  /**
   * 轨道区（不只标尺）按下也能移动播放头 —— 指针跟随鼠标，所见即所到。
   * 从卡片条 / 手柄 / 关键帧菱形上按下时跳过：那几处是"选中或拖动对象"的操作，
   * 让 seek 抢走会变成"想拖卡结果播放头乱跳"。
   */
  const onRowsPointerDown = (e: React.PointerEvent) => {
    const t = e.target as HTMLElement
    if (t.closest('.os-clip, .os-clip-handle, .os-kf-marker')) return
    startScrub(e)
  }

  const onTracksMove = (e: React.MouseEvent) => {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect) return
    const time = ((e.clientX - rect.left) / contentWidth) * span
    setHoverTime(Math.max(0, Math.min(span, time)))
  }

  /**
   * 拖到可视区左右边缘时自动横向滚动 —— 不然"往右拖多远都行"会被屏幕宽度卡住，
   * 每次最多只能拖到当前这一屏的右边。
   */
  const autoScrollX = (clientX: number) => {
    const el = trackRef.current?.parentElement
    if (!el) return
    const r = el.getBoundingClientRect()
    const EDGE = 56
    if (clientX > r.right - EDGE) {
      el.scrollLeft += Math.min(30, (clientX - (r.right - EDGE)) / 3 + 6)
    } else if (clientX < r.left + EDGE) {
      el.scrollLeft -= Math.min(30, (r.left + EDGE - clientX) / 3 + 6)
    }
  }

  const startDrag = (e: React.PointerEvent, inst: Instance) => {
    e.stopPropagation()
    dispatch({ type: 'select', id: inst.id })
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect) return
    const startX = e.clientX
    const startY = e.clientY
    const origStart = inst.start
    const origLane = laneOf(inst)
    const laneLocked = isSubtitle(inst)
    const secPerPx = span / contentWidth
    let lastLane = origLane
    const move = (ev: PointerEvent) => {
      autoScrollX(ev.clientX)
      // 位移按"实时位置"算：自动滚动时视口在动，鼠标停住也该继续往右走
      const live = trackRef.current?.getBoundingClientRect()
      if (!live) return
      const dx = (ev.clientX - live.left) - (startX - rect.left)
      let ns = origStart + dx * secPerPx
      // 只夹 0 和硬上限，不夹工程时长 —— 往右拖多远，片子就多长
      ns = Math.max(0, Math.min(maxSpan - inst.duration, ns))
      dispatch({ type: 'updateMeta', id: inst.id, patch: { start: Math.round(ns * 100) / 100 } })

      // 上下拖动换轨道（改 track 行号，不动画布上的 slot 位置）；字幕锁定在字幕轨
      if (laneLocked || rowH < 4) return
      const lane = Math.max(1, Math.min(genericN, origLane + Math.round((ev.clientY - startY) / rowH)))
      if (lane === lastLane) return
      lastLane = lane
      if (lane !== laneOf(inst)) {
        dispatch({ type: 'updateMeta', id: inst.id, patch: { track: lane } })
      }
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const startResize = (e: React.PointerEvent, inst: Instance, edge: 'left' | 'right') => {
    e.stopPropagation()
    e.preventDefault()
    dispatch({ type: 'select', id: inst.id })
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect) return
    const startX = e.clientX
    const origStart = inst.start
    const origDuration = inst.duration
    const secPerPx = span / contentWidth
    const move = (ev: PointerEvent) => {
      autoScrollX(ev.clientX)
      const live = trackRef.current?.getBoundingClientRect()
      if (!live) return
      const dx = (ev.clientX - live.left) - (startX - rect.left)
      if (edge === 'left') {
        let ns = origStart + dx * secPerPx
        ns = Math.max(0, Math.min(maxSpan - 0.1, ns))
        let nd = origDuration - (ns - origStart)
        nd = Math.max(0.1, nd)
        if (ns + nd > maxSpan) nd = maxSpan - ns
        dispatch({
          type: 'updateMeta',
          id: inst.id,
          patch: { start: Math.round(ns * 100) / 100, duration: Math.round(nd * 100) / 100 },
        })
      } else {
        let nd = origDuration + dx * secPerPx
        nd = Math.max(0.1, Math.min(maxSpan - origStart, nd))
        dispatch({
          type: 'updateMeta',
          id: inst.id,
          patch: { duration: Math.round(nd * 100) / 100 },
        })
      }
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  /** 图片素材片段：拖整体 = 改出现时刻 + 所在轨道 */
  const startImgDrag = (e: React.PointerEvent, clip: ImageClip) => {
    e.stopPropagation()
    dispatch({ type: 'selectImageClip', id: clip.id })
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect) return
    const startX = e.clientX
    const startY = e.clientY
    const origStart = clip.start
    const origTrack = clip.track
    const secPerPx = span / contentWidth
    let lastLane = origTrack
    const move = (ev: PointerEvent) => {
      autoScrollX(ev.clientX)
      const live = trackRef.current?.getBoundingClientRect()
      if (!live) return
      const dx = (ev.clientX - live.left) - (startX - rect.left)
      const ns = Math.max(0, Math.min(maxSpan - clip.duration, origStart + dx * secPerPx))
      dispatch({ type: 'updateImageClip', id: clip.id, patch: { start: Math.round(ns * 100) / 100 } })
      const lane = Math.max(1, Math.min(genericN, origTrack + Math.round((ev.clientY - startY) / rowH)))
      if (lane !== lastLane) {
        lastLane = lane
        dispatch({ type: 'updateImageClip', id: clip.id, patch: { track: lane } })
      }
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  /** 图片素材片段：拖两端改时长 */
  const startImgTrim = (e: React.PointerEvent, clip: ImageClip, edge: 'left' | 'right') => {
    e.stopPropagation()
    e.preventDefault()
    dispatch({ type: 'selectImageClip', id: clip.id })
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect) return
    const startX = e.clientX
    const origStart = clip.start
    const origDuration = clip.duration
    const secPerPx = span / contentWidth
    const move = (ev: PointerEvent) => {
      autoScrollX(ev.clientX)
      const live = trackRef.current?.getBoundingClientRect()
      if (!live) return
      const dx = ((ev.clientX - live.left) - (startX - rect.left)) * secPerPx
      if (edge === 'left') {
        const ns = Math.max(0, Math.min(origStart + origDuration - 0.2, origStart + dx))
        dispatch({
          type: 'updateImageClip',
          id: clip.id,
          patch: {
            start: Math.round(ns * 100) / 100,
            duration: Math.round((origStart + origDuration - ns) * 100) / 100,
          },
        })
      } else {
        const nd = Math.max(0.2, Math.min(maxSpan - origStart, origDuration + dx))
        dispatch({ type: 'updateImageClip', id: clip.id, patch: { duration: Math.round(nd * 100) / 100 } })
      }
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  /** 素材库拖拽落点：算出落在第几秒、第几行，再决定生成视频素材条还是图片片段 */
  const onTracksDrop = (e: React.DragEvent) => {
    const raw = e.dataTransfer.getData('application/x-os-asset')
    if (!raw) return
    e.preventDefault()
    let parsed: { id: string; kind: 'video' | 'image' }
    try {
      parsed = JSON.parse(raw)
    } catch {
      return
    }
    const asset = state.project.mediaAssets.find((a) => a.id === parsed.id)
    if (!asset) return
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect) return
    const time = Math.max(0, Math.min(span, ((e.clientX - rect.left) / contentWidth) * span))
    const lane0 = Math.max(
      0,
      Math.min(laneCount - 1, Math.floor((e.clientY - rect.top - TRACK_CHROME_H) / rowH)),
    )
    // 图片和视频一视同仁：都生成一段普通素材片段，落在拖到的那条轨道上。
    // 视频不再单独占一条「出镜」泳道 —— 这样它才能和别的片段一样上下拖动换轨道。
    const lane = Math.max(1, Math.min(genericN, lane0))
    dispatch({ type: 'addMediaClipFromAsset', assetId: asset.id, start: time, track: lane })
  }

  const onTracksDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('application/x-os-asset')) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
    }
  }

  // 刻度一直画到轨道右端（含空白余量）；太长时刻度变稀，避免一次渲染上千个标签
  const tickStep = span > 600 ? 10 : span > 240 ? 5 : 1
  const ticks: number[] = []
  for (let t = 0; t <= span; t += tickStep) ticks.push(t)
  const trackNames = [
    '字幕轨',
    ...Array.from({ length: genericN }, (_, i) => `轨道${i + 1}`),
  ]
  const subtitleNo = new Map<string, number>()
  subtitleTrack(project.instances).forEach((inst, i) => subtitleNo.set(inst.id, i + 1))
  const selectedInst = project.instances.find((i) => i.id === selectedId)
  const selectedIndex = selectedInst ? project.instances.indexOf(selectedInst) + 1 : 0

  const splitTarget = findSplitTarget(
    project,
    {
      selectedId,
      selectedHostClipId: state.selectedHostClipId,
      selectedHostTrackId: state.selectedHostTrackId,
    },
    currentTime,
  )
  const splitTargetName =
    splitTarget?.kind === 'instance'
      ? '选中的卡'
      : splitTarget?.kind === 'hostClip'
        ? '选中的机位段'
        : '选中的出镜素材'

  // ===== 关键帧（播放条）=====
  // 选中素材片段 → 打 / 删素材关键帧；选中动效卡 → 打 / 删卡关键帧。
  // 两者是同一套交互（播放头处固化外观、相邻帧自动补间），只是作用对象不同。
  const selectedClip = project.imageClips.find((c) => c.id === state.selectedImageClipId) ?? null
  // selectedInst 已在上面定义（供轨道徽标使用），这里直接复用

  const clipLocalTime = selectedClip
    ? Math.max(0, Math.min(selectedClip.duration, currentTime - selectedClip.start))
    : 0
  const instLocalTime = selectedInst
    ? Math.max(0, Math.min(selectedInst.duration, currentTime - selectedInst.start))
    : 0

  const clipAtHead =
    selectedClip != null &&
    currentTime >= selectedClip.start &&
    currentTime <= selectedClip.start + selectedClip.duration
  const instAtHead =
    selectedInst != null &&
    currentTime >= selectedInst.start &&
    currentTime <= selectedInst.start + selectedInst.duration

  // 素材片段优先（它被选中时卡不会被选中，两者互斥）
  const kfAtHead = selectedClip ? clipAtHead : instAtHead
  const kfLocal = selectedClip ? clipLocalTime : instLocalTime
  const kfTargetLabel = selectedClip ? '片段' : selectedInst ? '卡片' : ''
  const hasKeyAtHead = selectedClip
    ? (selectedClip.keyframes ?? []).some((k) => Math.abs(k.t - clipLocalTime) < 0.001)
    : selectedInst
      ? (selectedInst.keyframes ?? []).some((k) => Math.abs(k.t - instLocalTime) < 0.001)
      : false

  const toggleKeyframe = () => {
    if (!kfAtHead) return
    if (selectedClip) {
      if (hasKeyAtHead) {
        dispatch({ type: 'removeMediaKeyframe', id: selectedClip.id, t: clipLocalTime })
      } else {
        const visual = sampleClipVisual(selectedClip, clipLocalTime)
        dispatch({ type: 'addMediaKeyframe', id: selectedClip.id, kf: visualToKf(clipLocalTime, visual) })
      }
      return
    }
    if (selectedInst) {
      if (hasKeyAtHead) {
        dispatch({ type: 'removeCardKeyframe', id: selectedInst.id, t: instLocalTime })
      } else {
        // 打帧 = 把"此刻解算出来的外观"固化成一帧；之后挪播放头再改画面才会产生补间
        const anim = sampleCardVisual(selectedInst, instLocalTime)
        // 位置和尺寸一起记：铺满 / 自适应这些 fit 档的锚点规则不同，
        // 只记尺寸的话，另一帧会被挂到当前布局的锚点上、内容跑偏
        const portrait = state.canvasOrientation === 'portrait'
        const box = measureCardFrame(
          selectedInst.id,
          anim,
          portrait ? 1080 : 1920,
          portrait ? 1920 : 1080,
        )
        dispatch({
          type: 'addCardKeyframe',
          id: selectedInst.id,
          kf: visualToCardKf(instLocalTime, box ? { ...anim, ...box } : anim),
        })
      }
    }
  }

  return (
    <div className="os-timeline">
      <div
        className={`os-timeline-resizer ${resizing ? 'dragging' : ''}`}
        role="separator"
        aria-orientation="horizontal"
        aria-label="拖动调整轨道区高度"
        tabIndex={0}
        title="上下拖动调整轨道区高度 · 双击恢复默认 · 方向键微调"
        onPointerDown={startResizeTracks}
        onDoubleClick={() => dispatch({ type: 'setTrackH', height: DEFAULT_TRACK_H })}
        onKeyDown={onResizerKeyDown}
      >
        <span className="os-timeline-grip" aria-hidden>
          <i />
          <i />
          <i />
        </span>
        {resizing && <span className="os-timeline-resize-badge">轨道 {trackH} px</span>}
      </div>

      <div className="os-transport">
        <button
          className="os-btn os-btn-ghost"
          type="button"
          disabled={!state.history.length}
          onClick={() => dispatch({ type: 'undo' })}
          title="撤销 (Ctrl+Z)"
        >
          ↶ 撤销
        </button>
        <button
          className="os-btn os-btn-ghost"
          type="button"
          disabled={!state.future.length}
          onClick={() => dispatch({ type: 'redo' })}
          title="重做 (Ctrl+Shift+Z / Ctrl+Y)"
        >
          ↷ 重做
        </button>
        <button className="os-btn os-btn-ghost" type="button" onClick={() => dispatch({ type: 'seek', time: 0 })} title="回到开头">
          ⏮
        </button>
        <button className="os-btn" type="button" onClick={togglePlay}>
          {state.playing ? '暂停' : '播放'}
        </button>
        <button
          className="os-btn os-btn-split"
          type="button"
          onClick={() => dispatch({ type: 'splitAt' })}
          disabled={!splitTarget}
          title={
            splitTarget
              ? `在 ${currentTime.toFixed(1)}s 处把${splitTargetName}切成两段（前段结尾=切口，后段开始=切口）· 快捷键 S`
              : '先把播放头拖到选中素材的中间，再点这里切开（快捷键 S）'
          }
        >
          ✂️ 切开
        </button>
        <button
          className={`os-btn os-btn-kf ${hasKeyAtHead ? 'os-btn-kf-on' : ''}`}
          type="button"
          onClick={toggleKeyframe}
          disabled={!kfAtHead}
          title={
            kfAtHead
              ? hasKeyAtHead
                ? `${kfTargetLabel}内 ${kfLocal.toFixed(1)}s 处已有关键帧，点一下删除`
                : `在${kfTargetLabel}内 ${kfLocal.toFixed(1)}s 处打一个关键帧 · 挪动播放头再改画面打第二帧，两帧之间自动过渡`
              : '先选中一个素材片段或动效卡，把播放头拖到它内部再打关键帧'
          }
        >
          {hasKeyAtHead ? '🔑 删关键帧' : '🔑 关键帧'}
        </button>
        <button
          className="os-btn os-btn-ghost"
          type="button"
          onClick={() => dispatch({ type: 'seek', time: project.duration })}
          title="跳到结尾"
        >
          ⏭
        </button>
        <span className="os-time">
          {fmt(currentTime)} / {fmt(project.duration)}
        </span>
        {selectedInst && (
          <span className="os-selected-track-badge">
            已选 · {selectedInst.name.replace(/\s\d+$/, '')} · #{selectedIndex} 删除
          </span>
        )}
        <button
          className="os-btn os-btn-ghost os-btn-add-track"
          type="button"
          onClick={() => dispatch({ type: 'addTrack' })}
          title="在底部新增一条通用轨道"
        >
          ＋ 轨道
        </button>
        <label className="os-timeline-zoom">
          缩放
          <input
            type="range"
            min={20}
            max={120}
            step={5}
            value={pxPerSec}
            onChange={(e) => setPxPerSec(e.target.valueAsNumber)}
          />
        </label>
        <span className="os-fps">FPS {project.fps}</span>
      </div>

      <div className="os-tracks-layout" style={{ height: trackH }}>
        <div className="os-track-labels">
          <div className="os-track-label-spacer" />
          {trackNames.map((name, index) => (
            <div
              key={index}
              className={`os-track-label ${index === SUB_LANE ? 'os-track-sub' : index > genericN ? 'os-track-special' : 'os-track-generic'}`}
              style={{ height: rowH }}
            >
              {name}
              {index === SUB_LANE && <span className="os-track-tag">固定</span>}
            </div>
          ))}
          <button
            className="os-track-add-btn"
            type="button"
            onClick={() => dispatch({ type: 'addTrack' })}
            title="新增一条通用轨道"
          >
            ＋ 添加轨道
          </button>
        </div>
        <div
          className="os-tracks"
          ref={trackRef}
          style={{ width: contentWidth }}
          onClick={onRulerClick}
          onMouseMove={onTracksMove}
          onMouseLeave={() => setHoverTime(null)}
          onDragOver={onTracksDragOver}
          onDrop={onTracksDrop}
        >
          <div className="os-ruler" onPointerDown={startScrub}>
            {ticks.map((t) => (
              <span key={t} className="os-tick" style={{ left: t * pxPerSec }}>
                <i />
                <em>{t}s</em>
              </span>
            ))}
            <div className="os-playhead" style={{ left: currentTime * pxPerSec }} />
          </div>

          <div
            className="os-track-rows"
            onPointerDown={onRowsPointerDown}
            style={{
              backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${rowH - 1}px, var(--ui-border) ${rowH - 1}px, var(--ui-border) ${rowH}px)`,
            }}
          >
            {project.instances.map((inst) => (
              // 关键帧菱形要挂在片段条**外面**（.os-clip 是 overflow:hidden，
              // 贴在边缘的关键帧会被裁掉），所以与素材片段一样用 Fragment 包一层
              <Fragment key={inst.id}>
              <div
                data-inst-id={inst.id}
                className={`os-clip os-slot-${inst.slot} ${selectedId === inst.id ? 'selected' : ''} ${inst.seg ? 'os-in-seg' : ''} ${
                  // 字幕总开关关着时，轨道上的字幕条半透明 + 加删除线感，一眼看出"还在，只是不画"
                  isSubtitle(inst) && project.subtitlesVisible === false ? 'os-clip-muted' : ''
                }`}
                style={{
                  left: inst.start * pxPerSec,
                  // laneOf 就是"第几行"（0 = 字幕轨），直接乘行高即可。
                  // 早期版本这里写的是 (lane - 1)，那是字幕轨还不存在时的老口径，会整体偏上一行。
                  top: laneOf(inst) * rowH + 3,
                  width: inst.duration * pxPerSec,
                  height: clipH,
                }}
                onPointerDown={(e) => startDrag(e, inst)}
                onClick={(e) => {
                  e.stopPropagation()
                  dispatch({ type: 'select', id: inst.id })
                }}
              >
                <span className="os-clip-name" title={isSubtitle(inst) ? subtitleTextOf(inst) || '（空文案）' : undefined}>
                  {subtitleNo.has(inst.id)
                    ? `${subtitleNo.get(inst.id)}. ${subtitleTextOf(inst).slice(0, 12) || '（空文案）'}`
                    : inst.name}
                </span>
                {inst.seg && <span className="os-clip-seg">{inst.seg}</span>}
                {inst.dimAt != null && <span className="os-clip-dim" title={`渐隐@${inst.dimAt}s`}>◐</span>}
                <span className="os-clip-handle os-clip-handle-left" onPointerDown={(e) => startResize(e, inst, 'left')} />
                <span className="os-clip-handle os-clip-handle-right" onPointerDown={(e) => startResize(e, inst, 'right')} />
              </div>
              {/* 卡关键帧菱形：位置 = 卡起点 + 关键帧相对时间（相对轨道容器绝对定位） */}
              {(inst.keyframes ?? []).map((k) => {
                const kfSel = state.selectedCardKeyframe
                const isKfSelected =
                  kfSel != null && kfSel.cardId === inst.id && Math.abs(kfSel.t - k.t) < 0.001
                return (
                  <span
                    key={k.t}
                    className={`os-kf-marker ${isKfSelected ? 'selected' : ''}`}
                    style={{
                      left: (inst.start + k.t) * pxPerSec,
                      top: laneOf(inst) * rowH + 3 + clipH / 2,
                    }}
                    title={`卡关键帧 @ ${k.t.toFixed(2)}s · ${isKfSelected ? '已选中，按 Delete 删除' : '点一下选中，按 Delete 删除'}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      dispatch({ type: 'selectCardKeyframe', cardId: inst.id, t: k.t })
                      // 播放头同步跳到这一帧，选中即可看到它此刻的画面
                      dispatch({ type: 'seek', time: inst.start + k.t })
                    }}
                  />
                )
              })}
              </Fragment>
            ))}

            {/* ===== 图片素材片段：从素材库拖进来的图片，落在通用轨道上 ===== */}
            {project.imageClips.map((clip) => {
              const lane = Math.max(1, Math.min(genericN, clip.track))
              return (
                <Fragment key={clip.id}>
                  <div
                    className={`os-clip os-img-clip ${state.selectedImageClipId === clip.id ? 'selected' : ''}`}
                    style={{
                      left: clip.start * pxPerSec,
                      top: lane * rowH + 3,
                      width: clip.duration * pxPerSec,
                      height: clipH,
                    }}
                    title={
                      `素材片段：${clipLabel(clip)}\n` +
                      `放在项目 ${clip.start.toFixed(1)}s ~ ${(clip.start + clip.duration).toFixed(1)}s（轨道 ${lane}）\n` +
                      '拖中间 = 挪位置 / 换轨道，拖两端 = 改时长，点一下 = 选中\n' +
                      '轨道越靠上越优先显示（会盖住下面的轨道）'
                    }
                    onPointerDown={(e) => startImgDrag(e, clip)}
                    onClick={(e) => {
                      e.stopPropagation()
                      dispatch({ type: 'selectImageClip', id: clip.id })
                    }}
                  >
                    <span className="os-clip-name">{clipLabel(clip)}</span>
                    <span
                      className="os-clip-handle os-clip-handle-left"
                      onPointerDown={(e) => startImgTrim(e, clip, 'left')}
                    />
                    <span
                      className="os-clip-handle os-clip-handle-right"
                      onPointerDown={(e) => startImgTrim(e, clip, 'right')}
                    />
                  </div>
                  {/* 关键帧菱形标记：挂在片段条上，位置 = 片段起点 + 关键帧相对时间 */}
                  {(clip.keyframes ?? []).map((k) => {
                    const kfSel = state.selectedMediaKeyframe
                    const isKfSelected =
                      kfSel != null && kfSel.clipId === clip.id && Math.abs(kfSel.t - k.t) < 0.001
                    return (
                      <span
                        key={k.t}
                        className={`os-kf-marker ${isKfSelected ? 'selected' : ''}`}
                        style={{
                          left: (clip.start + k.t) * pxPerSec,
                          top: lane * rowH + 3 + clipH / 2,
                        }}
                        title={`关键帧 @ ${k.t.toFixed(2)}s · ${isKfSelected ? '已选中，按 Delete 删除' : '点一下选中，按 Delete 删除'}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          dispatch({ type: 'selectMediaKeyframe', clipId: clip.id, t: k.t })
                          // 播放头同步跳到这一帧
                          dispatch({ type: 'seek', time: clip.start + k.t })
                        }}
                      />
                    )
                  })}
                </Fragment>
              )
            })}

          </div>
        </div>
      </div>
      <div className="os-timeline-feedback">
        <span>十字 {hoverTime != null ? `${(hoverTime - currentTime).toFixed(1)}s` : '—'}</span>
        <span># {selectedId ? state.project.instances.findIndex((i) => i.id === selectedId) + 1 : '—'} 选中</span>
        <span>Delete 删除</span>
      </div>
    </div>
  )
}

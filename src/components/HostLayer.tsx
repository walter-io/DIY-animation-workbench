import { useRef } from 'react'
import { useEditor } from '../store'
import type { Rect } from '../hostLayouts'
import { useVideoSync, exportRateOf } from '../useVideoSync'

/**
 * 主持视频（出镜画面）图层。
 *
 * 和垫底视频一样跟随播放头 seek / 播放暂停同步，因此逐帧导出时每一帧都对得上。
 * 渲染在画布内部（不是浮在 UI 上），所以导出画面天然包含它。
 *
 * 这里只负责"画"：位置、大小、圆角、焦点、缩放、透明度全部由调用方（PreviewCanvas）
 * 用 hostTween 解算好传进来 —— 机位切换的补间是时间轴层面的事，不该混进渲染层。
 */
export default function HostLayer({
  frame,
  radius,
  focalX,
  focalY,
  zoom,
  opacity,
  layer,
  srcTime,
}: {
  /** 出镜画面矩形（画布像素，已含过渡插值） */
  frame: Rect
  /** 圆角（画布像素）：圆形 = min(w,h)/2，矩形 = 0，所以形状变化是连续渐变 */
  radius: number
  focalX: number
  focalY: number
  zoom: number
  opacity: number
  /** back = 当背景垫底（内容浮在上面）；front = 叠加在内容之上 */
  layer: 'back' | 'front'
  /**
   * 出镜视频该显示第几秒（上层按素材条的起点与入点换算过）。
   * 上层只在「播放头落在素材区间内」时才渲染本组件，所以这里一定是个有效时间。
   */
  srcTime: number
}) {
  const { state, dispatch } = useEditor()
  const { hostUrl, playing, project } = state
  const host = project.host
  const ref = useRef<HTMLVideoElement>(null)

  // 和垫底视频共用同一套同步逻辑：播放头是主时钟，视频停下要能被重新拉起来
  useVideoSync(ref, srcTime, playing, !!hostUrl, exportRateOf())

  const reportSize = (v: HTMLVideoElement) => {
    if (v.videoWidth > 0 && v.videoHeight > 0) {
      dispatch({ type: 'setHostVideoSize', w: v.videoWidth, h: v.videoHeight })
    }
    // 探测到时长后交给素材条：第一次导入会据此建一条"整段全用"的素材
    if (Number.isFinite(v.duration) && v.duration > 0) {
      dispatch({ type: 'setHostSourceDuration', seconds: v.duration })
    }
  }

  if (!hostUrl) return null
  if (frame.w < 8 || frame.h < 8) return null

  const isPip = layer === 'front'

  // 先把镜像做了，再按焦点缩放 —— 顺序反了会导致放大方向跑偏
  const transform = [host.mirror ? 'scaleX(-1)' : '', zoom > 1.001 ? `scale(${zoom})` : '']
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className="os-host"
      style={{
        position: 'absolute',
        left: frame.x,
        top: frame.y,
        width: frame.w,
        height: frame.h,
        zIndex: isPip ? 12 : 0,
        borderRadius: radius,
        overflow: 'hidden',
        background: '#000',
        opacity,
        border: host.borderWidth > 0 ? `${host.borderWidth}px solid ${host.borderColor}` : 'none',
        boxShadow: host.shadow && isPip ? '0 18px 48px rgba(0,0,0,0.45)' : 'none',
        boxSizing: 'border-box',
        pointerEvents: 'none',
      }}
    >
      <video
        ref={ref}
        src={hostUrl}
        muted
        playsInline
        onLoadedMetadata={(e) => reportSize(e.currentTarget)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
          // 焦点：决定保留原画面的哪一块（人不在正中间时靠这个）
          objectPosition: `${focalX}% ${focalY}%`,
          transform: transform || undefined,
          transformOrigin: `${focalX}% ${focalY}%`,
        }}
      />
    </div>
  )
}

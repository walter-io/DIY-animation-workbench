import { useEffect, useState } from 'react'
import { useEditor, usePlayhead } from '../store'
import PreviewCanvas from './PreviewCanvas'

declare global {
  interface Window {
    __EXPORT_PROJECT?: unknown
    __EXPORT_ALPHA?: boolean
    __render?: {
      ready: boolean
      seek: (t: number) => Promise<void>
      currentTime: () => number
    }
  }
}

/**
 * 等所有 <video> 追上目标时间。
 *
 * 视频 seek 是**异步**的：写下 `currentTime` 只是发起请求，浏览器还要解码出那一帧。
 * 导出逐帧截图如果不等它，截到的就是旧帧、甚至是还没画出来的黑帧 ——
 * 这正是"只要轨道有视频，导出画面就黑"的根源。
 *
 * 判定标准：`readyState >= 2`（已有当前帧数据）且不在 seeking 中。
 * 超时兜底是为了 src 有问题时不把整条导出链卡死。
 */
function waitForVideos(timeout = 3000): Promise<void> {
  const vids = Array.from(document.querySelectorAll('video'))
  if (vids.length === 0) return Promise.resolve()
  const waits = vids.map(
    (v) =>
      new Promise<void>((res) => {
        if (v.readyState >= 2 && !v.seeking) return res()
        let done = false
        const finish = () => {
          if (done) return
          done = true
          clearTimeout(timer)
          v.removeEventListener('seeked', finish)
          v.removeEventListener('loadeddata', finish)
          v.removeEventListener('canplay', finish)
          res()
        }
        const timer = setTimeout(finish, timeout)
        v.addEventListener('seeked', finish)
        v.addEventListener('loadeddata', finish)
        v.addEventListener('canplay', finish)
      }),
  )
  return Promise.all(waits).then(
    // 解码完成后再等一帧，确保新帧真的已经画上屏幕
    () => new Promise<void>((res) => requestAnimationFrame(() => res())),
  )
}

/** 无渲染 UI 的纯舞台：供导出中间件用无头浏览器逐帧驱动 */
export default function RenderStage() {
  const { dispatch } = useEditor()
  // 导出要逐帧等待播放头真正落位，所以这里必须订阅时间
  const currentTime = usePlayhead()
  const alpha = !!window.__EXPORT_ALPHA
  // 视频没加载完就 ready，导出首帧必然是黑的 —— 所以 ready 要等视频到位
  const [mediaReady, setMediaReady] = useState(false)

  useEffect(() => {
    if (window.__EXPORT_PROJECT) {
      dispatch({ type: 'loadProject', project: window.__EXPORT_PROJECT as never })
    }
  }, [dispatch])

  // 等所有视频至少能出帧，再把 ready 置真
  useEffect(() => {
    let alive = true
    const poll = () => {
      if (!alive) return
      const vids = Array.from(document.querySelectorAll('video'))
      const allReady = vids.every((v) => v.readyState >= 2)
      if (allReady) {
        setMediaReady(true)
        return
      }
      window.setTimeout(poll, 100)
    }
    poll()
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    window.__render = {
      ready: mediaReady,
      /**
       * 定位到 t 并把画面交出来。
       * 返回 Promise：调用方要 await 它才能真正拿到"这一时刻的画面"。
       * 先等一帧让 React 提交、useVideoSync 把 currentTime 写进 video，
       * 再等视频解码出目标帧。
       */
      seek: (t: number) =>
        new Promise<void>((resolve) => {
          dispatch({ type: 'setTime', time: t })
          /**
           * 等两帧再查视频：
           * 第 1 帧让 React 提交、useVideoSync 把 currentTime 写进 video；
           * 第 2 帧才能观察到 `v.seeking` 已被置位 —— 只等一帧会在
           * "刚写下 currentTime、浏览器还没开始 seek" 的瞬间误判为已就绪，
           * 于是截到上一帧的画面（首帧尤其明显）。
           */
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              waitForVideos().then(resolve)
            })
          })
        }),
      currentTime: () => currentTime,
    }
    return () => {
      window.__render = undefined
    }
  })

  // 透明导出：渲染根及其所有祖先必须透明，否则截图会把后方黑底透进透明画布，
  // 导致导出的 MOV 整屏不透明、遮住底层视频。
  useEffect(() => {
    const root = document.documentElement
    if (alpha) root.classList.add('os-render-alpha')
    return () => root.classList.remove('os-render-alpha')
  }, [alpha])

  return (
    <div className="os-render-root">
      <PreviewCanvas stage forceScale={1} alpha={!!window.__EXPORT_ALPHA} />
    </div>
  )
}

import { useEffect, useRef } from 'react'
import { useEditor, usePlayhead } from '../store'

/** 无渲染组件：用 requestAnimationFrame 推进播放头（时钟安全：无 setInterval） */
export default function PlayerDriver() {
  const { state, dispatch } = useEditor()
  const currentTime = usePlayhead()
  const timeRef = useRef(currentTime)

  useEffect(() => {
    timeRef.current = currentTime
  }, [currentTime])

  useEffect(() => {
    if (!state.playing) return
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = (now - last) / 1000
      last = now
      let next = timeRef.current + dt
      if (next >= state.project.duration) {
        next = state.project.duration
        dispatch({ type: 'setTime', time: next })
        dispatch({ type: 'pause' })
        return
      }
      timeRef.current = next
      dispatch({ type: 'setTime', time: next })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.playing, state.project.duration])

  return null
}

import { Component, type ReactNode } from 'react'

/**
 * 单卡错误边界。
 *
 * ⚠️ React 19 下，渲染期 / effect 里**未捕获**的错误会把整棵组件树卸载 ——
 * 用户看到的就是「整个编辑台突然白屏」（俗称闪退）。一张动效卡出问题，
 * 不该让整个工作台陪葬。这层边界把故障限制在单卡内：坏卡变成一块提示，
 * 其余面板、时间轴、其它卡片照常可用。
 *
 * 实例里出现的真实案例：hf（iframe）卡改参数 → srcDoc 换页 → effect 里
 * `doc.documentElement` 还是 null → TypeError → 整页白屏。
 *
 * 有意**不做**「参数一变就自动重试」：那会在确定性错误上反复触发
 * 异常 → 重置 → 异常，容易变成死循环。要恢复就点「重试」，或切走再切回来
 * （外层以 inst.id 为 key，换卡即重建，状态自然清空）。
 */
export default class CardErrorBoundary extends Component<
  { children: ReactNode; label?: string },
  { err: Error | null }
> {
  state: { err: Error | null } = { err: null }

  static getDerivedStateFromError(err: Error) {
    return { err }
  }

  componentDidCatch(err: Error) {
    console.error('[动效卡渲染出错]', this.props.label ?? '', err)
  }

  render() {
    const { err } = this.state
    if (!err) return this.props.children
    return (
      <div className="os-card-error" role="alert">
        <b>这张动效卡渲染出错</b>
        <span className="os-card-error-msg">{err.message}</span>
        <span className="os-card-error-tip">编辑台其余部分仍可正常使用</span>
        <button className="os-btn os-btn-ghost" type="button" onClick={() => this.setState({ err: null })}>
          重试
        </button>
      </div>
    )
  }
}

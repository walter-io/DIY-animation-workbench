import type { EffectDef } from '../types'
import { hyperframesTemplates } from './generated'
import { makeHyperframesEffect } from './HyperframesCard'
import { hyperframesMergeMap } from './merge'

const mergeByHfId = new Map(hyperframesMergeMap.map((m) => [m.hfId, m]))

/**
 * 由 hyperframes-motion-library 生成的动效卡注册表。
 *  - id 统一加 hf- 前缀，避免与本仓库 React 卡冲突
 *  - 与本仓库已有卡重复的，description 标注合并关系（两版并存，可互替）
 */
export const hyperframesRegistry: EffectDef[] = hyperframesTemplates.map((t) => {
  const merge = mergeByHfId.get(t.id)
  const mergedNote = merge
    ? merge.mergedWith
      ? `【已与本仓库「${merge.mergedWith}」合并优化】${merge.note}。两版并存：本版为 HyperFrames 全屏模板（1920×1080，GSAP 动画），适合独立镜头；切换时共享文案参数会自动迁移。`
      : `【新增模板】${merge.note}（HyperFrames 全屏模板，1920×1080）。`
    : ''

  return {
    id: `hf-${t.id}`,
    name: t.name,
    // 统一归到"大屏模板"：这 23 个都是 1920×1080 全屏 GSAP 独立镜头，
    // 和本仓库的叠加小卡用法不同，单独成类更好找（库里另有"大屏"角标区分）
    category: '大屏模板',
    description: `${t.description}。${mergedNote}`,
    component: makeHyperframesEffect(t.id),
    schema: t.schema,
    // 模板动画时长作为默认 duration（工作台 addInstance 会读取；不在 schema 中暴露以免重复编辑）
    // accent 置空 = 跟随工程主题色（画布渲染时把解析后的主题色回填进 params）
    defaultParams: { ...t.defaultParams, duration: t.duration, accent: '' },
    plugin: true,
  }
})

export { hyperframesTemplates }

import type { Project, Instance, SlotId } from './types'
import { registry } from './registry'
import { slotOkForMode } from './hyperframes/modes'

export type LintLevel = 'error' | 'warn' | 'info'
export type LintIssue = {
  level: LintLevel
  msg: string
  instanceId?: string
  instanceName?: string
}

const VALID_SLOTS: SlotId[] = ['left', 'right', 'center', 'bottom']

/** lint 体检器：纯函数，校验工程 JSON */
export function lintProject(project: Partial<Project> | null | undefined): LintIssue[] {
  const issues: LintIssue[] = []
  if (!project) {
    return [{ level: 'error', msg: '工程为空' }]
  }
  if (!project.name || !project.name.trim()) {
    issues.push({ level: 'error', msg: '工程名称为空' })
  }
  if (!project.skin || !['dark', 'light', 'mono'].includes(project.skin)) {
    issues.push({ level: 'error', msg: `皮肤非法：${project.skin}` })
  }
  if (!project.duration || project.duration <= 0) {
    issues.push({ level: 'error', msg: '总时长必须大于 0' })
  }
  const instances = project.instances ?? []
  if (instances.length === 0) {
    issues.push({ level: 'warn', msg: '时间轴为空，没有任何动效实例' })
  }

  const knownIds = new Set(registry.map((e) => e.id))

  for (const inst of instances) {
    const name = inst.name ?? inst.effectId
    // lintOff：跳过该实例的所有检查
    if (inst.lintOff) {
      issues.push({ level: 'info', msg: `已关闭 lint：${name}`, instanceId: inst.id, instanceName: name })
      continue
    }
    if (!knownIds.has(inst.effectId)) {
      issues.push({ level: 'error', msg: `未知动效 id：${inst.effectId}`, instanceId: inst.id, instanceName: name })
    }
    if (inst.start == null || inst.start < 0) {
      issues.push({ level: 'error', msg: `入点非法：${inst.start}`, instanceId: inst.id, instanceName: name })
    }
    if (!inst.duration || inst.duration <= 0) {
      issues.push({ level: 'error', msg: `时长非法：${inst.duration}`, instanceId: inst.id, instanceName: name })
    }
    if (project.duration && inst.start + (inst.duration ?? 0) > project.duration + 0.01) {
      issues.push({ level: 'warn', msg: `超出总时长：结束于 ${((inst.start ?? 0) + (inst.duration ?? 0)).toFixed(1)}s`, instanceId: inst.id, instanceName: name })
    }
    if (inst.slot && !VALID_SLOTS.includes(inst.slot)) {
      issues.push({ level: 'error', msg: `落位非法：${inst.slot}`, instanceId: inst.id, instanceName: name })
    }
    // 画面模式 × 槽位匹配（借鉴 director-rules：fullscreen 不该被半屏截断）
    if (inst.slot && knownIds.has(inst.effectId)) {
      const check = slotOkForMode(inst.effectId, inst.slot)
      if (!check.ok) {
        issues.push({
          level: 'warn',
          msg: `${check.hint ?? ''}（当前 ${inst.slot}）`,
          instanceId: inst.id,
          instanceName: name,
        })
      }
    }
    if (inst.dimAt != null && inst.dimAt < 0) {
      issues.push({ level: 'warn', msg: `dimAt 为负：${inst.dimAt}`, instanceId: inst.id, instanceName: name })
    }
    // 导演信息校验：卡内数字必须能在 sourceQuote（口播）中找到，禁止编造无来源数字
    if (inst.director && inst.director.sourceQuote) {
      const quoteNums = new Set(
        (inst.director.sourceQuote.match(/\d+(?:\.\d+)?/g) ?? []).map((s) => {
          const n = Number(s)
          return Number.isFinite(n) ? n : -1
        }),
      )
      for (const [key, val] of Object.entries(inst.params ?? {})) {
        if (typeof val !== 'number' || val <= 0) continue
        // 容差匹配（避免千分位/取整差异误报）
        const hit = [...quoteNums].some((q) => Math.abs(q - val) < 1)
        if (!hit) {
          issues.push({
            level: 'warn',
            msg: `字段「${key}」的数字 ${val} 未在口播中出现（导演信息要求不添加无来源数字）`,
            instanceId: inst.id,
            instanceName: name,
          })
        }
      }
    }
  }

  // 同段同槽时间重叠检查
  const overlapGroups = new Map<string, Instance[]>()
  for (const inst of instances) {
    if (inst.lintOff) continue
    const key = `${inst.seg ?? ''}::${inst.slot ?? 'none'}`
    if (!overlapGroups.has(key)) overlapGroups.set(key, [])
    overlapGroups.get(key)!.push(inst)
  }
  for (const [, group] of overlapGroups) {
    const sorted = [...group].sort((a, b) => (a.start ?? 0) - (b.start ?? 0))
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1]
      const cur = sorted[i]
      const prevEnd = (prev.start ?? 0) + (prev.duration ?? 0)
      if (cur.start < prevEnd - 0.01) {
        issues.push({
          level: 'warn',
          msg: `时间重叠：${prev.name} 与 ${cur.name} 在 ${(cur.start ?? 0).toFixed(1)}s 处重叠（同段同槽）`,
          instanceId: cur.id,
          instanceName: cur.name,
        })
      }
    }
  }

  return issues
}

export function lintSummary(issues: LintIssue[]) {
  const error = issues.filter((i) => i.level === 'error').length
  const warn = issues.filter((i) => i.level === 'warn').length
  const info = issues.filter((i) => i.level === 'info').length
  return { error, warn, info, ok: error === 0 }
}

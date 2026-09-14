import { useEffect, useMemo, useRef, useState } from 'react'

import type { EffectDef } from '../types'
import { categoryHint, categoryRank } from '../effectCategories'

type Props = {
  effects: EffectDef[]
  value: string
  onChange: (effectId: string) => void
  /** 弹出列表的最大高度（px） */
  maxHeight?: number
}

/**
 * 可搜索的特效下拉框。
 *
 * 原生 <select> 没法内嵌搜索框，动效一多就只能靠滚动硬翻，
 * 所以这里自己做了一个 combobox：搜索框固定在弹出层顶部，
 * 列表按动效库的分类顺序分组，支持上下键 / 回车 / Esc / 点击外部关闭。
 */
export default function EffectSelect({ effects, value, onChange, maxHeight = 320 }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const current = effects.find((e) => e.id === value)

  /** 分组结果里带上扁平索引，避免渲染时再去做 O(n²) 的 indexOf */
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const map = new Map<string, { def: EffectDef; index: number }[]>()
    let n = 0
    for (const e of effects) {
      if (
        q &&
        !`${e.name} ${e.description ?? ''} ${e.category ?? ''} ${e.id}`.toLowerCase().includes(q)
      ) {
        continue
      }
      const key = e.category ?? (e.plugin ? '插件' : '其他')
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push({ def: e, index: n++ })
    }
    return [...map.entries()].sort((a, b) => categoryRank(a[0]) - categoryRank(b[0]))
  }, [effects, query])

  const flat = useMemo(() => groups.flatMap(([, list]) => list), [groups])

  useEffect(() => {
    setCursor(0)
  }, [query])

  useEffect(() => {
    if (!open) return
    const onDocDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocDown)
    return () => document.removeEventListener('mousedown', onDocDown)
  }, [open])

  useEffect(() => {
    if (open) searchRef.current?.focus()
    else setQuery('')
  }, [open])

  // 键盘移动后把高亮项拉回可视区
  useEffect(() => {
    if (!open) return
    listRef.current
      ?.querySelector<HTMLElement>('.os-effsel-opt.is-cursor')
      ?.scrollIntoView({ block: 'nearest' })
  }, [cursor, open])

  const openPanel = () => {
    const i = flat.findIndex((x) => x.def.id === value)
    setCursor(i >= 0 ? i : 0)
    setOpen(true)
  }

  const commit = (id: string) => {
    onChange(id)
    setOpen(false)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCursor((c) => Math.min(flat.length - 1, c + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCursor((c) => Math.max(0, c - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const hit = flat[cursor]
      if (hit) commit(hit.def.id)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
    }
  }

  return (
    <div className="os-effsel" ref={wrapRef} onKeyDown={onKeyDown}>
      <button
        type="button"
        className={`os-effsel-btn ${open ? 'is-open' : ''}`}
        onClick={() => (open ? setOpen(false) : openPanel())}
        aria-haspopup="listbox"
        aria-expanded={open}
        title="点击展开，输入关键词即可筛选动效"
      >
        <span className="os-effsel-value">{current?.name ?? value}</span>
        <span className="os-effsel-caret">▾</span>
      </button>

      {open && (
        <div className="os-effsel-pop" style={{ maxHeight }}>
          <div className="os-effsel-search-wrap">
            <input
              ref={searchRef}
              className="os-effsel-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索动效名 / 分类"
              spellCheck={false}
            />
            {query && (
              <button
                type="button"
                className="os-effsel-clear"
                onClick={() => {
                  setQuery('')
                  searchRef.current?.focus()
                }}
                title="清空搜索"
              >
                ×
              </button>
            )}
          </div>
          <div className="os-effsel-list" ref={listRef} role="listbox">
            {flat.length === 0 && <div className="os-effsel-empty">没有匹配的动效</div>}
            {groups.map(([cat, list]) => (
              <div key={cat} className="os-effsel-group">
                <div className="os-effsel-cat">
                  {cat}
                  {categoryHint(cat) && <span className="os-effsel-cat-hint">{categoryHint(cat)}</span>}
                  <span className="os-effsel-cat-count">{list.length}</span>
                </div>
                {list.map(({ def, index }) => (
                  <div
                    key={def.id}
                    role="option"
                    data-effect-id={def.id}
                    aria-selected={def.id === value}
                    className={[
                      'os-effsel-opt',
                      def.id === value ? 'is-current' : '',
                      index === cursor ? 'is-cursor' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    title={def.description ?? def.name}
                    onMouseEnter={() => setCursor(index)}
                    onClick={() => commit(def.id)}
                  >
                    <span className="os-effsel-opt-name">{def.name}</span>
                    {def.description && (
                      <span className="os-effsel-opt-desc">{def.description}</span>
                    )}
                    {def.id === value && <span className="os-effsel-opt-tick">当前</span>}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

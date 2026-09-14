import { useState } from 'react'
import { useEditor } from '../store'
import { readEditHistory, saveEditHistory } from '../history'
import { clearPrefs, readPrefs, recordPrefsFromProject, type UserPrefs } from '../prefs'
import { serializeProject } from '../mediaPersistence'
import Modal from './Modal'

export default function HomePanel({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useEditor()
  const makeEntry = () => ({
    id: `h_${Date.now()}`,
    name: state.project.name,
    at: new Date().toLocaleString('zh-CN'),
    instances: state.project.instances.length,
    project: serializeProject(state.project),
  })
  const [entries, setEntries] = useState(() => {
    const entry = makeEntry()
    const list = readEditHistory()
    const last = list[0]
    if (last && JSON.stringify(last.project) === JSON.stringify(serializeProject(state.project))) return list
    saveEditHistory([entry, ...list])
    return readEditHistory()
  })

  const open = (project: (typeof entries)[number]['project']) => {
    dispatch({ type: 'loadProject', project })
    onClose()
  }

  const remove = (id: string) => {
    const next = readEditHistory().filter((e) => e.id !== id)
    saveEditHistory(next)
    setEntries(next)
  }

  const saveCurrent = () => {
    saveEditHistory([makeEntry(), ...readEditHistory()])
    setEntries(readEditHistory())
  }

  const clearAll = () => {
    saveEditHistory([])
    setEntries([])
  }

  // ── 个人偏好：把历史版本里的用卡 / 配色习惯沉淀下来 ──
  const [prefs, setPrefs] = useState<UserPrefs | null>(() => readPrefs())
  const [prefsNote, setPrefsNote] = useState('')
  const recordPrefs = () => {
    const next = recordPrefsFromProject(state.project)
    setPrefs(next)
    const kinds = Object.keys(next.effectCounts).length
    const top = Object.entries(next.effectCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id]) => id)
      .join('、')
    setPrefsNote(
      `已记录（第 ${next.sessions} 次）：用卡习惯 ${kinds} 种${top ? `，最常用 ${top}` : ''}；皮肤 / 配色 / 字体 / 尺寸档已保存 —— 重置编辑台和自动出卡会自动使用。`,
    )
  }
  const clearMyPrefs = () => {
    clearPrefs()
    setPrefs(null)
    setPrefsNote('个人偏好已清除。')
  }
  const prefsTop = prefs
    ? Object.entries(prefs.effectCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([id]) => id)
        .join('、')
    : ''

  return (
    <Modal title="历史版本" onClose={onClose}>
      <div className="os-home-actions">
        <span className="os-modal-hint">打开历史版本时会记录当前状态，也可手动保存；点击记录可进入编辑界面。</span>
        <div className="os-home-action-buttons">
          <button className="os-btn os-btn-ghost" type="button" onClick={saveCurrent}>
            保存当前
          </button>
          <button
            className="os-btn"
            type="button"
            title="把当前工程里的用卡习惯（哪些动效卡常用）和皮肤 / 配色 / 字体 / 尺寸档记进个人偏好：重置编辑台自动套用外观，自动出卡优先推荐常用卡型"
            onClick={recordPrefs}
          >
            记录我的偏好
          </button>
          {prefs && (
            <button className="os-btn os-btn-ghost" type="button" title="清空个人偏好（用卡习惯与外观记录）" onClick={clearMyPrefs}>
              清除偏好
            </button>
          )}
          <button className="os-btn os-btn-ghost" type="button" onClick={() => setEntries(readEditHistory())}>
            刷新
          </button>
          <button className="os-btn os-btn-ghost" type="button" onClick={clearAll}>
            清空全部
          </button>
        </div>
        {prefs && !prefsNote && (
          <div className="os-modal-hint">
            已有个人偏好：{prefs.sessions} 次记录 · 常用卡 {prefsTop || '—'} · 更新于 {prefs.updatedAt}
          </div>
        )}
        {prefsNote && <div className="os-modal-hint">{prefsNote}</div>}
      </div>
      <div className="os-home-list">
        {entries.length === 0 && <div className="os-empty">暂无历史记录</div>}
        {entries.map((entry) => (
          <div key={entry.id} className="os-home-item">
            <div className="os-home-info">
              <div className="os-home-name">{entry.name}</div>
              <div className="os-home-at">{entry.at} · {entry.instances} 个动效</div>
            </div>
            <div className="os-home-item-actions">
              <button className="os-btn" type="button" onClick={() => open(entry.project)}>
                打开
              </button>
              <button className="os-btn os-btn-ghost" type="button" onClick={() => remove(entry.id)}>
                删除
              </button>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  )
}

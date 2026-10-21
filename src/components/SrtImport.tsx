import { useMemo, useRef, useState } from 'react'
import { useEditor } from '../store'
import Modal from './Modal'
import { parseSrt } from '../srt'
import { chunkCues, suggestCardsForChunks, type AutoCardLib } from '../autoCards'
import { readPrefs } from '../prefs'

/** 两个卡库的说明文案：导入前让用户知道会生成什么 */
const LIB_OPTIONS: { id: AutoCardLib; label: string; hint: string }[] = [
  {
    id: 'regular',
    label: '常规动效卡',
    hint:
      '叠加型小卡，贴在人像口播画面上（左右交替、避开人物）。按口播语义分段，一段一卡，节奏轻快、卡型多变。',
  },
  {
    id: 'explain',
    label: '知识动效卡',
    hint:
      '整页幻灯片（PPT 式），一页就是一张画面。分段更粗、一页装更多同类信息：清单最多 6 条、步骤 5 格、标签 8 个、对比左右各 5 条。',
  },
]

/** 口播稿导入弹窗：粘贴 .srt 或选择本地文件 → 生成底部字幕轨 */
export default function SrtImport({ onClose }: { onClose: () => void }) {
  const { dispatch } = useEditor()
  const [srt, setSrt] = useState('')
  const [autoCards, setAutoCards] = useState(true)
  const [cardLib, setCardLib] = useState<AutoCardLib>('regular')
  const fileRef = useRef<HTMLInputElement>(null)

  const cues = useMemo(() => {
    try {
      return parseSrt(srt)
    } catch {
      return []
    }
  }, [srt])
  const total = cues.length ? Math.ceil(cues[cues.length - 1].end / 1000) : 0

  // 分段 / 选卡各算一次，卡片数量和预览共用同一份结果（保证预览和实际导入一致）
  const { chunks, suggestions } = useMemo(() => {
    const c = chunkCues(cues, cardLib)
    return { chunks: c, suggestions: autoCards ? suggestCardsForChunks(c, cardLib) : [] }
  }, [cues, cardLib, autoCards])

  const picked = suggestions
    .map((s, i) => (s ? { i, s } : null))
    .filter((x): x is { i: number; s: NonNullable<typeof x>['s'] } => x != null)
  const cardCount = picked.length
  // 预览前 4 张卡长什么样，导入前就能看到匹配质量
  const previewCards = picked.slice(0, 4)

  // 个人偏好：常用卡型排行（历史版本面板「记录我的偏好」积累），仅用于提示展示
  const prefsTop = useMemo(() => {
    // 解说库的卡型不在历史偏好统计口径里，提示会误导
    if (cardLib !== 'regular') return ''
    const ranking = readPrefs()
      ? Object.entries(readPrefs()!.effectCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([id]) => id)
      : []
    return ranking.length ? ranking.join('、') : ''
  }, [cardLib])

  const pickFile = (file: File | undefined) => {
    if (!file) return
    const r = new FileReader()
    r.onload = () => setSrt(String(r.result ?? ''))
    r.readAsText(file)
  }

  const doImport = () => {
    if (!cues.length) return
    dispatch({ type: 'addSrtInstance', srt, total, autoCards, cardLib })
    onClose()
  }

  const activeHint = LIB_OPTIONS.find((o) => o.id === cardLib)!.hint

  return (
    <Modal
      title="导入口播稿 (.srt)"
      onClose={onClose}
      footer={
        <button className="os-btn" type="button" disabled={!cues.length} onClick={doImport}>
          导入字幕与动效
        </button>
      }
    >
      <div className="os-srt-import">
        <p className="os-srt-hint">
          粘贴剪映导出的 .srt 字幕内容，或选择本地 .srt 文件。导入后按口播语义断句，
          <strong>每一句生成一张独立的字幕卡</strong>，全部排在字幕轨上（可单独选中、改文案、调时长、拖动、删除、插入）。
          开启自动动效卡后，再按语义分段生成整段动效卡。
        </p>
        <div className="os-srt-actions">
          <button className="os-btn os-btn-ghost" type="button" onClick={() => fileRef.current?.click()}>
            选择 .srt 文件
          </button>
          <button className="os-btn os-btn-ghost" type="button" onClick={() => setSrt('')}>
            清空
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".srt,text/plain"
            style={{ display: 'none' }}
            onChange={(e) => pickFile(e.target.files?.[0])}
          />
        </div>
        <textarea
          className="os-srt-textarea"
          value={srt}
          onChange={(e) => setSrt(e.target.value)}
          placeholder={'1\n00:00:01,000 --> 00:00:04,000\n欢迎来到本期节目\n\n2\n00:00:05,000 --> 00:00:08,500\n今天我们用数据讲增长'}
          spellCheck={false}
        />
        <label className="os-toggle">
          <input
            type="checkbox"
            checked={autoCards}
            onChange={(e) => setAutoCards(e.target.checked)}
          />
          <span>自动生成动效卡</span>
        </label>
        {autoCards && (
          <div className="os-srt-lib">
            <div className="os-srt-lib-label">生成类型</div>
            <div className="os-seg">
              {LIB_OPTIONS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className={`os-seg-btn ${cardLib === o.id ? 'active' : ''}`}
                  onClick={() => setCardLib(o.id)}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <div className="os-srt-hint">{activeHint}</div>
          </div>
        )}
        <div className={`os-srt-stat ${cues.length ? '' : 'empty'}`}>
          {cues.length
            ? `解析到 ${cues.length} 句 · 总时长 ${total}s · 将生成 ${cues.length} 张字幕卡（同一条字幕轨）${
                cardCount
                  ? ` + ${cardCount} 张${cardLib === 'explain' ? '知识' : '要点'}卡（共 ${chunks.length} 段）`
                  : ''
              }`
            : '等待粘贴 SRT 内容…'}
        </div>
        {autoCards && cardLib === 'regular' && prefsTop && (
          <div className="os-srt-hint">已参考个人偏好：常用卡型（{prefsTop}）会优先匹配。</div>
        )}
        {autoCards && cardLib === 'explain' && (
          <div className="os-srt-hint">
            知识卡自带整页排版，画布背景若还是默认深色，导入时会自动切到米白（可在「设置 → 画布背景」改）。
          </div>
        )}
        {previewCards.length > 0 && (
          <div className="os-srt-preview">
            <div className="os-srt-preview-title">匹配预览（前 {previewCards.length} 张）</div>
            {previewCards.map(({ i, s }) => (
              <div key={i} className="os-srt-preview-item">
                <span className={`os-srt-role os-srt-role-${s.role ?? 'body'}`}>
                  {s.role === 'open' ? '开场' : s.role === 'end' ? '收尾' : '论述'}
                </span>
                <span className="os-srt-preview-name">{s.name}</span>
                <span className="os-srt-preview-text">
                  {Object.values(s.params)
                    .filter((v): v is string => typeof v === 'string' && v.length > 0)
                    .slice(0, 2)
                    .map((v) => v.replace(/\n/g, ' / '))
                    .join(' · ')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}

import { useSyncExternalStore } from 'react'
import {
  contentFolderOf,
  packSummary,
  packsSnapshot,
  rescanPacks,
  setPackEnabled,
  subscribePacks,
  type PackKind,
  type PackState,
} from '../packRuntime'

const STATUS_TEXT: Record<PackState['status'], string> = {
  idle: '未启用',
  loading: '装载中',
  ready: '已启用',
  error: '装载失败',
}

const KIND_ICON: Record<PackKind, string> = { cards: '🎴', sounds: '🔊' }

function statusClass(p: PackState): string {
  if (p.status === 'error') return 'os-pack-badge bad'
  if (!p.enabled) return 'os-pack-badge off'
  if (p.status === 'ready') return 'os-pack-badge ok'
  return 'os-pack-badge wait'
}

/**
 * 左侧「拓展包」面板 —— 动效卡库 / 音效库 的管理界面。
 *
 * 这里只做展示与开关，真正的装载逻辑在 src/packRuntime.ts：
 * 停用 = 把它注册进来的卡与音效整体卸载（偏好记本机），工程文件不受影响，重新启用秒恢复。
 */
export default function PackPanel() {
  // packs 引用会在装载 / 启停 / 重扫时被 packRuntime 换掉，这里跟着更新
  const packs = useSyncExternalStore(subscribePacks, packsSnapshot, packsSnapshot)
  const sum = packSummary()
  const cardPacks = packs.filter((p) => p.kind === 'cards')
  const soundPacks = packs.filter((p) => p.kind === 'sounds')

  const renderPack = (p: PackState) => (
    <div key={p.key} className={`os-pack-card ${p.enabled ? '' : 'off'}`}>
      <div className="os-pack-head">
        <div className="os-pack-name">
          {KIND_ICON[p.kind]} {p.manifest.name || p.manifest.id}
        </div>
        <span className={statusClass(p)}>{STATUS_TEXT[p.status]}</span>
      </div>
      <div className="os-pack-meta">
        {p.manifest.vendor && <span>{p.manifest.vendor}</span>}
        {p.manifest.version && <span>v{p.manifest.version}</span>}
        <span>{p.manifest.dir ?? p.manifest.id}</span>
      </div>
      {p.manifest.description && <div className="os-pack-desc">{p.manifest.description}</div>}
      <div className="os-pack-counts">
        {p.kind === 'cards' ? (
          <span>🎴 {p.cardCount} 张卡</span>
        ) : (
          <span>🔊 {p.soundCount} 个音效</span>
        )}
      </div>
      {p.status === 'error' && p.error && <div className="os-pack-error">⚠ {p.error}</div>}
      {p.manifest.product?.contact && (
        <div className="os-pack-product">{p.manifest.product.contact}</div>
      )}
      <label className="os-pack-toggle">
        <input
          type="checkbox"
          checked={p.enabled}
          onChange={(e) => setPackEnabled(p.key, e.target.checked)}
        />
        <span>{p.enabled ? '停用' : '启用'}</span>
      </label>
    </div>
  )

  return (
    <aside className="os-panel os-panel-left">
      <div className="os-panel-header os-panel-header-lib">
        <span className="os-lib-header-title">拓展包 ({sum.ready}/{sum.total})</span>
        <div className="os-lib-header-actions">
          <button
            className="os-lib-cat-all"
            type="button"
            onClick={() => void rescanPacks()}
            title="重新扫描两个内容目录（增删文件夹后点一下，或直接刷新页面）"
          >
            ⟳ 重新扫描
          </button>
        </div>
      </div>
      <div className="os-panel-body os-pack-body">
        {packs.length === 0 ? (
          <div className="os-pack-empty">
            <div className="os-pack-empty-title">还没有任何拓展包</div>
            <p>
              把包文件夹拷进仓库根目录的 <code>动效卡库/</code>（一个子目录 = 一个卡包）
              或 <code>音效库/</code>（一个子目录 = 一个音效包），
              里面放一份 <code>manifest.json</code> 就行。
            </p>
            <p>拷完点上面的「重新扫描」或刷新页面即可；把文件夹删掉就彻底消失。</p>
          </div>
        ) : (
          <>
            <div className="os-pack-summary">
              🎴 卡 {sum.cardPacks} 包 / {sum.cards} 张 · 🔊 音效 {sum.soundPacks} 包 /{' '}
              {sum.sounds} 个
            </div>

            <div className="os-pack-group-title">
              🎴 动效卡包 · {contentFolderOf('cards')}/（{cardPacks.length}）
            </div>
            {cardPacks.length === 0 && <div className="os-pack-none">（目录里还没有卡包）</div>}
            {cardPacks.map(renderPack)}

            <div className="os-pack-group-title">
              🔊 音效包 · {contentFolderOf('sounds')}/（{soundPacks.length}）
            </div>
            {soundPacks.length === 0 && <div className="os-pack-none">（目录里还没有音效包）</div>}
            {soundPacks.map(renderPack)}

            <div className="os-pack-tip">
              停用只影响本机：工程里已排好的卡只是暂时不显示，重新启用即恢复，不会丢失。
              给别人装同一套，直接把这两个目录里的包文件夹拷过去即可。
            </div>
          </>
        )}
      </div>
    </aside>
  )
}

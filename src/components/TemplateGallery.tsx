import { useEditor } from '../store'
import { templates } from '../templates'
import Modal from './Modal'

export default function TemplateGallery({ onClose }: { onClose: () => void }) {
  const { dispatch } = useEditor()
  return (
    <Modal title="视频模板" onClose={onClose}>
      <p className="os-modal-hint">模板 = 轨道 + 参数 + 素材的打包。载入会替换当前时间轴。</p>
      <div className="os-tpl-grid">
        {templates.map((t) => (
          <div key={t.id} className="os-tpl-card">
            <div className="os-tpl-name">{t.name}</div>
            <div className="os-tpl-desc">{t.description}</div>
            <button
              className="os-btn"
              type="button"
              onClick={() => {
                dispatch({ type: 'loadInstances', instances: t.build() })
                onClose()
              }}
            >
              载入
            </button>
          </div>
        ))}
      </div>
    </Modal>
  )
}

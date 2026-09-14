import { useEditor } from '../store'
import { clearAssetBlobs } from '../mediaPersistence'
import Modal from './Modal'

export default function ResetConfirmModal({ onClose }: { onClose: () => void }) {
  const { dispatch } = useEditor()

  const reset = () => {
    // 素材像素文件存在 IndexedDB，重置时一并清掉，才能真正清空素材库
    void clearAssetBlobs()
    dispatch({ type: 'resetProject' })
    onClose()
  }

  return (
    <Modal
      title="确认重置编辑台"
      onClose={onClose}
      footer={
        <>
          <button className="os-btn os-btn-ghost" type="button" onClick={onClose}>取消</button>
          <button className="os-btn os-btn-danger" type="button" onClick={reset}>确认重置</button>
        </>
      }
    >
      <div className="os-reset-steps">
        <p>重置后将会：</p>
        <ol>
          <li>清空当前时间轴，恢复空白工程</li>
          <li>清除导入的视频</li>
          <li>清空撤销 / 重做历史</li>
        </ol>
        <p className="os-modal-hint">本地历史版本不会删除，仍可从历史版本中恢复。</p>
      </div>
    </Modal>
  )
}

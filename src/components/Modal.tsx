import type { ReactNode } from 'react'

export default function Modal({
  title,
  onClose,
  children,
  footer,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="os-modal-mask" onClick={onClose}>
      <div className="os-modal" onClick={(e) => e.stopPropagation()}>
        <div className="os-modal-head">
          <span>{title}</span>
          <button className="os-modal-close" type="button" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="os-modal-body">{children}</div>
        {footer && <div className="os-modal-foot">{footer}</div>}
      </div>
    </div>
  )
}

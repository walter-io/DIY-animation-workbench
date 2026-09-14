/**
 * 拨杆开关。
 *
 * 参数面板里"开 / 关"这类二值选项用拨杆比复选框清楚得多：
 * 复选框要读文字才知道当前状态，拨杆一眼能看出是开还是关。
 * 用 role="switch" + aria-checked，键盘和读屏都能用。
 */
export default function Switch({
  checked,
  onChange,
  label,
  hint,
  disabled = false,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  /** 标题；留空表示由外层容器统一给标题（避免同一个标题出现两次） */
  label?: string
  hint?: string
  disabled?: boolean
}) {
  return (
    <label
      className={`os-switch ${disabled ? 'disabled' : ''}`}
      title={hint}
    >
      {label ? <span className="os-switch-label">{label}</span> : null}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        className={`os-switch-track ${checked ? 'on' : ''}`}
        onClick={() => !disabled && onChange(!checked)}
      >
        <span className="os-switch-knob" />
      </button>
    </label>
  )
}

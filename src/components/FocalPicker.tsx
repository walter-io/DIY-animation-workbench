/**
 * 镜头焦点选择器：3×3 九宫格。
 *
 * object-fit: cover 默认取原画面正中裁切，
 * 但出镜的人常常站在画面一侧（比如右侧），这时正中被裁掉的是空气、人被切没了。
 * 点九宫格里对应的格子，就把小窗的取景中心挪过去。
 */
const POINTS: { x: number; y: number; name: string }[] = [
  { x: 0, y: 0, name: '左上' },
  { x: 50, y: 0, name: '上' },
  { x: 100, y: 0, name: '右上' },
  { x: 0, y: 50, name: '左' },
  { x: 50, y: 50, name: '正中' },
  { x: 100, y: 50, name: '右' },
  { x: 0, y: 100, name: '左下' },
  { x: 50, y: 100, name: '下' },
  { x: 100, y: 100, name: '右下' },
]

export default function FocalPicker({
  x,
  y,
  onPick,
}: {
  x: number
  y: number
  onPick: (x: number, y: number) => void
}) {
  return (
    <div className="os-focal-grid">
      {POINTS.map((p) => (
        <button
          key={p.name}
          type="button"
          className={`os-focal-cell ${Math.abs(x - p.x) < 1 && Math.abs(y - p.y) < 1 ? 'active' : ''}`}
          title={`取景中心：${p.name}`}
          onClick={() => onPick(p.x, p.y)}
        >
          <i />
        </button>
      ))}
    </div>
  )
}

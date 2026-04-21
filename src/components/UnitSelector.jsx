import { wordBank } from '../data/wordBank'

export default function UnitSelector({ completedUnits, onSelect }) {
  return (
    <div className="unit-selector">
      <div className="selector-header">
        <h1>字音字形練習</h1>
        <p>國中二年級 ｜ 每單元 10 題，共 5 個單元</p>
      </div>

      <div className="unit-grid">
        {wordBank.units.map((unit) => {
          const done = !!completedUnits[unit.id]
          return (
            <div
              key={unit.id}
              className={`unit-card ${done ? 'completed' : ''}`}
              onClick={() => onSelect(unit)}
            >
              <div className="unit-number">第 {unit.id} 單元</div>
              <div className="unit-name">{unit.name}</div>
              <div className="unit-theme">{unit.theme}</div>
              {done && <div className="badge">✓ 已完成</div>}
            </div>
          )
        })}
      </div>

      <p className="hint-text">完成單元後可直接傳送至老師的 Google Classroom</p>
    </div>
  )
}

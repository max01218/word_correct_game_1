export default function UnitSelector({ units, completedUnits, onSelect, onSeed, isTeacher }) {
  return (
    <div className="unit-selector">
      <div className="selector-header">
        <h1>字音字形練習</h1>
        <p>已匯入的單元題庫</p>
        {isTeacher && units.length === 0 && (
          <button className="btn-submit" onClick={onSeed}>這是一個全新的資料庫！請點此載入預設考題</button>
        )}
      </div>

      <div className="unit-grid">
        {units.map((unit) => {
          const idToUse = unit.docId || unit.id
          const done = !!completedUnits[idToUse]
          return (
            <div
              key={idToUse}
              className={`unit-card ${done ? 'completed' : ''}`}
              onClick={() => onSelect(unit)}
            >
              <div className="unit-number">單元 {unit.id}</div>
              <div className="unit-name">{unit.name}</div>
              <div className="unit-theme">{unit.theme}</div>
              <div style={{ fontSize: '0.8rem', color: '#999', marginTop: '6px' }}>
                共 {unit.words?.length || 0} 個詞彙
              </div>
              {done && <div className="badge">✓ 已完成</div>}
            </div>
          )
        })}
      </div>

      <p className="hint-text">完成單元後可直接傳送至老師的 Google Classroom</p>
    </div>
  )
}

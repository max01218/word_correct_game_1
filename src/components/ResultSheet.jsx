import React from 'react'
import RubyGridWord from './RubyGridWord'

export default function ResultSheet({ unit, results, onBack }) {
  function handlePrint() {
    window.print()
  }

  return (
    <div className="result-sheet">
      <div className="result-header">
        <h2>{results.length < unit.words.length ? '⏱️ 中途結算' : `🎉 ${unit.name} 完成！`}</h2>
        <p>{unit.theme}　｜　已挑戰 {results.length} / {unit.words.length} 個詞</p>
      </div>

      <div className="word-grid">
        {results.map((word, i) => (
          <div key={i} className="word-card-result">
            <RubyGridWord word={word} />
          </div>
        ))}
      </div>

      <div className="result-actions">
        <button className="btn-print" onClick={handlePrint}>
          列印完成單
        </button>

        <button className="btn-back-menu" onClick={onBack}>
          返回選單
        </button>

      </div>

    </div>
  )
}

import { useState } from 'react'
import { submitToClassroom, isConfigured } from '../services/classroomApi'

export default function ResultSheet({ unit, results, onBack }) {
  const [submitting,    setSubmitting]    = useState(false)
  const [submitMessage, setSubmitMessage] = useState(null)
  const [submitOk,      setSubmitOk]      = useState(false)

  async function handleSubmit() {
    setSubmitting(true)
    setSubmitMessage(null)
    const res = await submitToClassroom(unit, results)
    setSubmitting(false)
    setSubmitMessage(res.message)
    setSubmitOk(res.success)
  }

  function handlePrint() {
    window.print()
  }

  return (
    <div className="result-sheet">
      <div className="result-header">
        <h2>🎉 {unit.name} 完成！</h2>
        <p>{unit.theme}　｜　共 {results.length} 個詞</p>
      </div>

      <div className="word-grid">
        {results.map((word, i) => (
          <div key={i} className="word-card-result">
            <div className="result-zhuyin">
              {word.zhuyin.map((z, j) => (
                <span key={j} className="z">{z}</span>
              ))}
            </div>
            <div className="result-chars">{word.characters}</div>
          </div>
        ))}
      </div>

      <div className="result-actions">
        <button
          className="btn-classroom"
          onClick={handleSubmit}
          disabled={submitting || submitOk}
        >
          {submitting ? '傳送中…' : submitOk ? '已傳送 ✓' : '傳送至 Google Classroom'}
        </button>

        <button className="btn-print" onClick={handlePrint}>
          列印完成單
        </button>

        <button className="btn-back-menu" onClick={onBack}>
          返回選單
        </button>
      </div>

      {!isConfigured() && (
        <p className="classroom-note">
          ※ 尚未設定 Google Classroom 憑證（請填寫 .env），目前僅支援列印。
        </p>
      )}

      {submitMessage && (
        <div className={`submit-msg ${submitOk ? 'ok' : 'err'}`}>
          {submitMessage}
        </div>
      )}

      {/* 列印專用區域 */}
      <div className="print-only">
        <h2>字音字形練習完成單 ─ {unit.name}</h2>
        <p>主題：{unit.theme}</p>
        <table>
          <thead>
            <tr><th>詞彙</th><th>注音</th></tr>
          </thead>
          <tbody>
            {results.map((w, i) => (
              <tr key={i}>
                <td>{w.characters}</td>
                <td>{w.zhuyin.join('　')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

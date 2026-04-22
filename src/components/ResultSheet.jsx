import { useState } from 'react'
import { submitToClassroom, isConfigured } from '../services/classroomApi'
import RubyGridWord from './RubyGridWord'

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
            <RubyGridWord word={word} />
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

    </div>
  )
}

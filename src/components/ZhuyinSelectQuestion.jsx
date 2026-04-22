import { useState } from 'react'

const INITIALS = ['ㄅ','ㄆ','ㄇ','ㄈ','ㄉ','ㄊ','ㄋ','ㄌ','ㄍ','ㄎ','ㄏ','ㄐ','ㄑ','ㄒ','ㄓ','ㄔ','ㄕ','ㄖ','ㄗ','ㄘ','ㄙ']
const MEDIALS  = ['ㄧ','ㄨ','ㄩ']
const FINALS   = ['ㄚ','ㄛ','ㄜ','ㄝ','ㄞ','ㄟ','ㄠ','ㄡ','ㄢ','ㄣ','ㄤ','ㄥ','ㄦ']
const TONES    = [
  { label: '一聲', value: '' },
  { label: '二聲 ˊ', value: 'ˊ' },
  { label: '三聲 ˇ', value: 'ˇ' },
  { label: '四聲 ˋ', value: 'ˋ' },
  { label: '輕聲 ˙', value: '˙' },
]
const TONE_MARKS = new Set(['ˊ','ˇ','ˋ','˙'])
const HINT_AFTER = 2

// onAdvance(isCorrect: boolean)
export default function ZhuyinSelectQuestion({ word, charIndex, onAdvance }) {
  const [draft,    setDraft]    = useState('')
  const [result,   setResult]   = useState(null)   // 'correct' | 'wrong' | null
  const [attempts, setAttempts] = useState(0)

  const correct = word.zhuyin?.[charIndex] || ''
  const chars   = [...word.characters]
  const locked  = result !== null

  function append(sym) {
    if (locked) return
    setDraft(d => d + sym)
  }

  function removeLast() {
    if (locked) return
    setDraft(d => [...d].slice(0, -1).join(''))
  }

  function clear() {
    if (locked) return
    setDraft('')
  }

  function applyTone(tone) {
    if (locked) return
    const stripped = [...draft].filter(c => !TONE_MARKS.has(c)).join('')
    const answer   = stripped + tone

    if (answer === correct) {
      setResult('correct')
      setTimeout(() => {
        setDraft('')
        setResult(null)
        setAttempts(0)
        onAdvance(true)
      }, 700)
    } else {
      const newAttempts = attempts + 1
      setAttempts(newAttempts)
      setResult('wrong')
      setTimeout(() => {
        setDraft('')
        setResult(null)
      }, 1200)
    }
  }

  const showHint    = attempts >= HINT_AFTER
  const symBtnStyle = {
    padding: '7px 0',
    border: '1px solid #ddd',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '1.05rem',
    background: '#f9f9f9',
    transition: 'background 0.1s',
  }

  return (
    <div className="zy-select-wrapper">

      {/* Word display */}
      <div className="zy-word-row">
        {chars.map((char, i) => (
          <div key={i} className={`zy-char-box ${i === charIndex ? 'zy-active' : i < charIndex ? 'zy-done' : ''}`}>
            {char}
          </div>
        ))}
      </div>

      <p className="zy-prompt">
        「<strong>{chars[charIndex]}</strong>」的注音是？
      </p>

      {/* Draft preview */}
      <div className={`zy-draft ${result === 'correct' ? 'zy-draft-correct' : result === 'wrong' ? 'zy-draft-wrong' : ''}`}>
        <span className="zy-draft-text">{draft || <span style={{ color: '#bbb' }}>點選拼音…</span>}</span>
        <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto' }}>
          <button onClick={removeLast} disabled={locked || !draft} style={{ ...symBtnStyle, padding: '4px 10px', background: '#fff0f0' }}>⌫</button>
          <button onClick={clear}     disabled={locked || !draft} style={{ ...symBtnStyle, padding: '4px 10px', background: '#fff0f0' }}>清除</button>
        </div>
      </div>

      {result === 'correct' && <div className="zy-feedback zy-feedback-correct">✓ 正確！</div>}
      {result === 'wrong'   && <div className="zy-feedback zy-feedback-wrong">✗ 不對，再試一次！</div>}

      {showHint && !result && (
        <div className="zy-hint">提示：正確注音為「<strong>{correct}</strong>」</div>
      )}

      {/* Keyboard */}
      <div className="zy-keyboard">
        <div className="zy-kb-section-label">聲母</div>
        <div className="zy-kb-grid">
          {INITIALS.map(c => (
            <button key={c} onClick={() => append(c)} disabled={locked} style={symBtnStyle}>{c}</button>
          ))}
        </div>

        <div className="zy-kb-section-label">介母</div>
        <div className="zy-kb-grid">
          {MEDIALS.map(c => (
            <button key={c} onClick={() => append(c)} disabled={locked} style={symBtnStyle}>{c}</button>
          ))}
        </div>

        <div className="zy-kb-section-label">韻母</div>
        <div className="zy-kb-grid">
          {FINALS.map(c => (
            <button key={c} onClick={() => append(c)} disabled={locked} style={symBtnStyle}>{c}</button>
          ))}
        </div>

        <div className="zy-kb-section-label">聲調（點選後確認）</div>
        <div className="zy-tone-row">
          {TONES.map(t => (
            <button
              key={t.label}
              onClick={() => applyTone(t.value)}
              disabled={locked}
              className="zy-tone-btn"
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

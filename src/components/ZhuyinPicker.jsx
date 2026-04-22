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

const btnBase = {
  padding: '6px 10px',
  border: '1px solid #ddd',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '1.1rem',
  background: '#f9f9f9',
  transition: 'background 0.1s',
}

// Single-syllable picker popup
function SyllablePicker({ value, onChange, onClose }) {
  const [draft, setDraft] = useState(value || '')

  function append(sym) {
    setDraft(d => d + sym)
  }

  function removeLast() {
    setDraft(d => {
      // Tone marks are single chars at end; remove one unicode code point
      const arr = [...d]
      arr.pop()
      return arr.join('')
    })
  }

  function applyTone(tone) {
    // Strip any existing tone mark first
    const stripped = [...draft].filter(c => !['ˊ','ˇ','ˋ','˙'].includes(c)).join('')
    const final = stripped + tone
    onChange(final)
    onClose()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: '16px', padding: '20px',
        maxWidth: '400px', width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
      }} onClick={e => e.stopPropagation()}>

        {/* Preview */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <div style={{
            flex: 1, fontSize: '1.8rem', textAlign: 'center', letterSpacing: '4px',
            background: '#f0f4ff', padding: '8px', borderRadius: '8px', minHeight: '52px'
          }}>
            {draft || <span style={{ color: '#bbb', fontSize: '1rem' }}>點選拼音</span>}
          </div>
          <button onClick={removeLast} style={{ ...btnBase, fontSize: '1.4rem', padding: '8px 14px', background: '#fff0f0' }}>⌫</button>
          <button onClick={() => setDraft('')} style={{ ...btnBase, fontSize: '0.85rem', background: '#fff0f0' }}>清除</button>
        </div>

        {/* Initials */}
        <div style={{ marginBottom: '6px', fontSize: '0.8rem', color: '#888' }}>聲母</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '10px' }}>
          {INITIALS.map(c => (
            <button key={c} onClick={() => append(c)} style={btnBase}>{c}</button>
          ))}
        </div>

        {/* Medials */}
        <div style={{ marginBottom: '6px', fontSize: '0.8rem', color: '#888' }}>介母</div>
        <div style={{ display: 'flex', gap: '4px', marginBottom: '10px' }}>
          {MEDIALS.map(c => (
            <button key={c} onClick={() => append(c)} style={btnBase}>{c}</button>
          ))}
        </div>

        {/* Finals */}
        <div style={{ marginBottom: '6px', fontSize: '0.8rem', color: '#888' }}>韻母</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '14px' }}>
          {FINALS.map(c => (
            <button key={c} onClick={() => append(c)} style={btnBase}>{c}</button>
          ))}
        </div>

        {/* Tones — clicking confirms */}
        <div style={{ marginBottom: '6px', fontSize: '0.8rem', color: '#888' }}>聲調（點選後確認）</div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {TONES.map(t => (
            <button
              key={t.label}
              onClick={() => applyTone(t.value)}
              style={{ ...btnBase, background: '#e8eeff', color: '#3a5bd9', fontWeight: 600 }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          style={{ marginTop: '16px', width: '100%', padding: '10px', background: '#eee', borderRadius: '8px', cursor: 'pointer', border: 'none' }}
        >
          取消
        </button>
      </div>
    </div>
  )
}

// One row per character in the word
export default function ZhuyinPicker({ characters, zhuyin, onChange }) {
  const [openIndex, setOpenIndex] = useState(null)

  const len = characters ? [...characters].length : 0
  // Pad/trim zhuyin array to match character count
  const safeZhuyin = Array.from({ length: len }, (_, i) => zhuyin[i] || '')

  function handleChange(index, value) {
    const updated = [...safeZhuyin]
    updated[index] = value
    onChange(updated)
  }

  if (len === 0) {
    return <span style={{ color: '#bbb', fontSize: '0.9rem' }}>請先輸入漢字</span>
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
      {[...characters].map((char, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
          <span style={{ fontSize: '0.75rem', color: '#888' }}>{char}</span>
          <button
            onClick={() => setOpenIndex(i)}
            style={{
              ...btnBase,
              minWidth: '64px',
              color: safeZhuyin[i] ? '#3a5bd9' : '#bbb',
              border: safeZhuyin[i] ? '1px solid #3a5bd9' : '1px dashed #ccc',
              background: safeZhuyin[i] ? '#e8eeff' : '#fafafa',
              fontSize: '1rem',
            }}
          >
            {safeZhuyin[i] || '選取'}
          </button>
        </div>
      ))}

      {openIndex !== null && (
        <SyllablePicker
          value={safeZhuyin[openIndex]}
          onChange={(v) => { handleChange(openIndex, v); setOpenIndex(null) }}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </div>
  )
}

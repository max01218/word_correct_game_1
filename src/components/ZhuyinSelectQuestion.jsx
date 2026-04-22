import { useMemo, useState } from 'react'

const FALLBACK_ZHUYIN = [
  'ㄅ','ㄆ','ㄇ','ㄈ','ㄉ','ㄊ','ㄋ','ㄌ','ㄍ','ㄎ','ㄏ','ㄐ','ㄑ','ㄒ',
  'ㄓ','ㄔ','ㄕ','ㄖ','ㄗ','ㄘ','ㄙ','ㄚ','ㄛ','ㄜ','ㄞ','ㄟ','ㄠ','ㄡ',
]

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// onAdvance(isCorrect: boolean) — parent advances to next char/word
export default function ZhuyinSelectQuestion({ word, charIndex, allUnitZhuyin, onAdvance }) {
  const [selected, setSelected] = useState(null)
  const correct = word.zhuyin?.[charIndex] || ''
  const chars = [...word.characters]

  const options = useMemo(() => {
    const pool = [...new Set([
      ...allUnitZhuyin.filter(z => z !== correct),
      ...FALLBACK_ZHUYIN.filter(z => z !== correct),
    ])]
    return shuffle([correct, ...shuffle(pool).slice(0, 3)])
  }, [word.characters, charIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSelect(opt) {
    if (selected !== null) return
    setSelected(opt)
    const isCorrect = opt === correct
    setTimeout(() => {
      setSelected(null)
      onAdvance(isCorrect)
    }, isCorrect ? 700 : 1200)
  }

  return (
    <div className="zy-select-wrapper">
      {/* Word with active character highlighted */}
      <div className="zy-word-row">
        {chars.map((char, i) => (
          <div
            key={i}
            className={`zy-char-box ${i === charIndex ? 'zy-active' : i < charIndex ? 'zy-done' : ''}`}
          >
            {char}
          </div>
        ))}
      </div>

      <p className="zy-prompt">
        「<strong>{chars[charIndex]}</strong>」的注音是？
      </p>

      <div className="zy-options">
        {options.map((opt, i) => {
          let cls = 'zy-option'
          if (selected !== null) {
            if (opt === correct)        cls += ' zy-correct'
            else if (opt === selected)  cls += ' zy-wrong'
          }
          return (
            <button
              key={i}
              className={cls}
              onClick={() => handleSelect(opt)}
              disabled={selected !== null}
            >
              {opt}
            </button>
          )
        })}
      </div>
    </div>
  )
}

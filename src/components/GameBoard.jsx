import { useState, useRef, useEffect, useMemo } from 'react'
import QuestionDisplay from './QuestionDisplay'
import HandwritingCanvas from './HandwritingCanvas'
import ZhuyinSelectQuestion from './ZhuyinSelectQuestion'
import { initHanziLookup, recognizeFromStrokes, checkAnswerInCandidates } from '../services/visionApi'

export default function GameBoard({ unit, onBack, onComplete }) {
  const [wordIndex,        setWordIndex]        = useState(0)
  const [charIndex,        setCharIndex]        = useState(0)
  const [revealedChars,    setRevealedChars]    = useState([])
  const [status,           setStatus]           = useState('idle')
  const [feedback,         setFeedback]         = useState('')
  const [attempts,         setAttempts]         = useState(0)
  const [results,          setResults]          = useState([])
  const [wordStrokes,      setWordStrokes]      = useState([])
  const [wordZhuyinResult, setWordZhuyinResult] = useState([])
  const [lookupReady,      setLookupReady]      = useState(false)

  const canvasRef  = useRef(null)
  const lockRef    = useRef(false)   // prevents overlapping async submissions

  const word       = unit.words[wordIndex]
  const wordType   = word.type || 'handwriting'
  const totalWords = unit.words.length
  const isLastChar = charIndex === word.characters.length - 1
  const isLastWord = wordIndex === totalWords - 1

  const allUnitZhuyin = useMemo(
    () => unit.words.flatMap(w => w.zhuyin || []),
    [unit]
  )

  useEffect(() => {
    initHanziLookup()
      .then(() => setLookupReady(true))
      .catch((err) => setFeedback(`辨識引擎載入失敗：${err.message}`))
  }, [])

  // ── Shared: finish current word and advance ───────────────────────

  function finishWord(augmentedWord) {
    const newResults = [...results, augmentedWord]
    setResults(newResults)
    if (!isLastWord) {
      lockRef.current = false
      setWordIndex(i => i + 1)
      setCharIndex(0)
      setRevealedChars([])
      setAttempts(0)
      setWordStrokes([])
      setWordZhuyinResult([])
      setStatus('idle')
      setFeedback('')
    } else {
      onComplete(unit.id, newResults)
    }
  }

  // ── Handwriting handlers ──────────────────────────────────────────

  async function handleSubmit(strokes) {
    if (lockRef.current) return          // block overlapping calls
    if (!strokes || strokes.length === 0) {
      setFeedback('請先畫出字再送出')
      return
    }

    lockRef.current = true
    setStatus('checking')
    setFeedback('辨識中，請稍候…')

    try {
      const candidates = await recognizeFromStrokes(strokes, 320, 320)
      const expected   = word.characters[charIndex]

      if (checkAnswerInCandidates(candidates, expected, 3)) {
        handleCorrect(strokes)           // lock released inside handleCorrect timeout
      } else {
        const newAttempts = attempts + 1
        setAttempts(newAttempts)
        setStatus('wrong')

        if (newAttempts >= 3) {
          setFeedback('已達3次，自動跳過')
          setTimeout(() => {
            canvasRef.current?.clear()
            const newWordStrokes = [...wordStrokes, null]
            if (!isLastChar) {
              setWordStrokes(newWordStrokes)
              // do NOT add to revealedChars — skipped chars stay blank
              setCharIndex(i => i + 1)
              setAttempts(0)
              setStatus('idle')
              setFeedback('')
              lockRef.current = false    // release for next char
            } else {
              finishWord({ ...word, handwrittenStrokes: newWordStrokes })
              // finishWord releases lock internally
            }
          }, 1500)
        } else {
          const topDetected = candidates[0]
          setFeedback(
            topDetected
              ? `辨識為「${topDetected}」，不對喔，再試一次！`
              : '未能辨識，請把筆劃寫清楚一點'
          )
          setTimeout(() => {
            setStatus('idle')
            setFeedback('')
            lockRef.current = false      // release for retry
          }, 2500)
        }
      }
    } catch (err) {
      setStatus('wrong')
      setFeedback(err.message)
      setTimeout(() => {
        setStatus('idle')
        setFeedback('')
        lockRef.current = false
      }, 3000)
    }
  }

  function handleCorrect(currentStrokes) {
    setStatus('correct')
    setFeedback('正確！')
    const newRevealed    = [...revealedChars, charIndex]
    setRevealedChars(newRevealed)
    const newWordStrokes = [...wordStrokes, currentStrokes]
    setWordStrokes(newWordStrokes)

    setTimeout(() => {
      canvasRef.current?.clear()
      if (!isLastChar) {
        setCharIndex(i => i + 1)
        setAttempts(0)
        setStatus('idle')
        setFeedback('')
        lockRef.current = false          // release for next char
      } else {
        finishWord({ ...word, handwrittenStrokes: newWordStrokes })
      }
    }, 1200)
  }

  // ── Zhuyin-select handler ─────────────────────────────────────────

  function handleZhuyinAdvance(isCorrect) {
    const newResult = [...wordZhuyinResult, isCorrect]
    if (!isLastChar) {
      setWordZhuyinResult(newResult)
      setCharIndex(i => i + 1)
    } else {
      const resultZhuyin = (word.zhuyin || []).map((z, i) => newResult[i] ? z : '')
      finishWord({ ...word, zhuyin: resultZhuyin, handwrittenStrokes: [] })
    }
  }

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div className="game-board">
      <div className="game-header">
        <button className="btn-back" onClick={onBack}>← 返回</button>
        <span className="unit-label">{unit.name}</span>
        <span className="progress-label">{wordIndex + 1} / {totalWords}</span>
      </div>

      <div className="progress-bar-track">
        <div className="progress-bar-fill" style={{ width: `${(wordIndex / totalWords) * 100}%` }} />
      </div>

      <div className={`phase-badge ${wordType === 'handwriting' ? 'phase-badge-1' : 'phase-badge-2'}`}>
        {wordType === 'handwriting' ? '✍️ 看注音寫漢字' : '🔤 看漢字選注音'}
      </div>

      {wordType === 'handwriting' ? (
        <>
          <QuestionDisplay
            word={word}
            activeCharIndex={charIndex}
            revealedChars={revealedChars}
          />

          <div className="attempt-counter">
            {[0, 1, 2].map(i => (
              <span key={i} className={`attempt-dot ${i < attempts ? 'attempt-dot-used' : ''}`} />
            ))}
            <span className="attempt-label">
              {attempts > 0 ? `錯誤 ${attempts} / 3 次` : '0 / 3 次'}
            </span>
          </div>

          {feedback && (
            <div className={`feedback ${status}`}>{feedback}</div>
          )}

          <HandwritingCanvas
            ref={canvasRef}
            onSubmit={handleSubmit}
            disabled={status === 'checking' || status === 'correct'}
          />

          <p className="canvas-tip">在上方區域手寫漢字，完成後點「確認送出」</p>
        </>
      ) : (
        <ZhuyinSelectQuestion
          key={`${wordIndex}-${charIndex}`}
          word={word}
          charIndex={charIndex}
          allUnitZhuyin={allUnitZhuyin}
          onAdvance={handleZhuyinAdvance}
        />
      )}
    </div>
  )
}

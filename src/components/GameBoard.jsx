import { useState, useRef, useEffect, useMemo } from 'react'
import QuestionDisplay from './QuestionDisplay'
import HandwritingCanvas from './HandwritingCanvas'
import ZhuyinSelectQuestion from './ZhuyinSelectQuestion'
import { initHanziLookup, recognizeFromStrokes, checkAnswerInCandidates } from '../services/visionApi'

export default function GameBoard({ unit, onBack, onComplete }) {
  const [wordIndex,     setWordIndex]     = useState(0)
  const [charIndex,     setCharIndex]     = useState(0)
  const [revealedChars, setRevealedChars] = useState([])
  const [status,        setStatus]        = useState('idle')
  const [feedback,      setFeedback]      = useState('')
  const [attempts,      setAttempts]      = useState(0)
  const [results,       setResults]       = useState([])
  const [wordStrokes,   setWordStrokes]   = useState([])
  const [lookupReady,   setLookupReady]   = useState(false)

  // Phase 1: 看注音寫漢字 | Phase 2: 看漢字選注音
  const [phase,               setPhase]               = useState(1)
  const [showPhaseTransition, setShowPhaseTransition] = useState(false)
  const [phase1Results,       setPhase1Results]       = useState([])

  const canvasRef  = useRef(null)
  const word       = unit.words[wordIndex]
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

  // ── Phase 1: handwriting ──────────────────────────────────────────

  async function handleSubmit(strokes) {
    if (!strokes || strokes.length === 0) {
      setFeedback('請先畫出字再送出')
      return
    }
    setStatus('checking')
    setFeedback('辨識中，請稍候…')
    try {
      const candidates = await recognizeFromStrokes(strokes, 320, 320)
      const expected   = word.characters[charIndex]
      if (checkAnswerInCandidates(candidates, expected, 3)) {
        handleCorrect(strokes)
      } else {
        const newAttempts = attempts + 1
        setAttempts(newAttempts)
        setStatus('wrong')
        const topDetected = candidates[0]
        setFeedback(
          topDetected
            ? `辨識為「${topDetected}」，不對喔，再試一次！`
            : '未能辨識，請把筆劃寫清楚一點'
        )
        setTimeout(() => { setStatus('idle'); setFeedback('') }, 3000)
      }
    } catch (err) {
      setStatus('wrong')
      setFeedback(err.message)
      setTimeout(() => { setStatus('idle'); setFeedback('') }, 3000)
    }
  }

  function handleCorrect(currentStrokes) {
    setStatus('correct')
    setFeedback('正確！')
    const newRevealed   = [...revealedChars, charIndex]
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
      } else {
        const augmentedWord = { ...word, handwrittenStrokes: newWordStrokes }
        const newResults    = [...results, augmentedWord]
        setResults(newResults)
        if (!isLastWord) {
          setWordIndex(i => i + 1)
          setCharIndex(0)
          setRevealedChars([])
          setAttempts(0)
          setWordStrokes([])
          setStatus('idle')
          setFeedback('')
        } else {
          // Phase 1 done → show transition screen
          setPhase1Results(newResults)
          setShowPhaseTransition(true)
        }
      }
    }, 1200)
  }

  function skipChar() {
    canvasRef.current?.clear()
    const newWordStrokes = [...wordStrokes, []]
    setWordStrokes(newWordStrokes)
    const newRevealed = [...revealedChars, charIndex]
    setRevealedChars(newRevealed)

    if (!isLastChar) {
      setCharIndex(i => i + 1)
    } else {
      const augmentedWord = { ...word, handwrittenStrokes: newWordStrokes }
      const newResults    = [...results, augmentedWord]
      setResults(newResults)
      if (!isLastWord) {
        setWordIndex(i => i + 1)
        setCharIndex(0)
        setRevealedChars([])
        setWordStrokes([])
      } else {
        setPhase1Results(newResults)
        setShowPhaseTransition(true)
        return
      }
    }
    setAttempts(0)
    setStatus('idle')
    setFeedback('')
  }

  // ── Phase transition ──────────────────────────────────────────────

  function startPhase2() {
    setShowPhaseTransition(false)
    setPhase(2)
    setWordIndex(0)
    setCharIndex(0)
    setStatus('idle')
    setFeedback('')
  }

  // ── Phase 2: Zhuyin selection ─────────────────────────────────────

  function advancePhase2(isCorrect) {
    if (!isLastChar) {
      setCharIndex(i => i + 1)
    } else if (!isLastWord) {
      setWordIndex(i => i + 1)
      setCharIndex(0)
    } else {
      onComplete(unit.id, phase1Results)
    }
  }

  // ── Render ────────────────────────────────────────────────────────

  const disabled = status === 'checking' || status === 'correct'

  if (showPhaseTransition) {
    return (
      <div className="game-board">
        <div className="phase-transition-card">
          <div className="phase-done-icon">✍️</div>
          <h2>第一關完成！</h2>
          <p style={{ color: '#888' }}>接下來換第二關</p>
          <div className="phase-two-preview">
            <span>看漢字</span>
            <span className="phase-arrow">→</span>
            <span>選注音</span>
          </div>
          <button className="btn-submit phase-start-btn" onClick={startPhase2}>
            開始第二關 →
          </button>
          <button className="btn-back" style={{ width: '100%', textAlign: 'center' }} onClick={onBack}>
            ← 返回選單
          </button>
        </div>
      </div>
    )
  }

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

      <div className={`phase-badge phase-badge-${phase}`}>
        {phase === 1 ? '✍️ 第一關：看注音寫漢字' : '🔤 第二關：看漢字選注音'}
      </div>

      {phase === 1 ? (
        <>
          <QuestionDisplay
            word={word}
            activeCharIndex={charIndex}
            revealedChars={revealedChars}
          />

          {feedback && (
            <div className={`feedback ${status}`}>{feedback}</div>
          )}

          <HandwritingCanvas
            ref={canvasRef}
            onSubmit={handleSubmit}
            disabled={disabled}
          />

          <p className="canvas-tip">在上方區域手寫漢字，完成後點「確認送出」</p>
        </>
      ) : (
        <ZhuyinSelectQuestion
          key={`${wordIndex}-${charIndex}`}
          word={word}
          charIndex={charIndex}
          allUnitZhuyin={allUnitZhuyin}
          onAdvance={advancePhase2}
        />
      )}
    </div>
  )
}

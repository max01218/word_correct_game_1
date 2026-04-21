import { useState, useRef, useEffect } from 'react'
import QuestionDisplay from './QuestionDisplay'
import HandwritingCanvas from './HandwritingCanvas'
import { initHanziLookup, recognizeFromStrokes, checkAnswerInCandidates } from '../services/visionApi'

export default function GameBoard({ unit, onBack, onComplete }) {
  // ... 其他狀態維持不變
  const [wordIndex, setWordIndex] = useState(0)
  const [charIndex, setCharIndex] = useState(0)
  const [revealedChars, setRevealedChars] = useState([])
  const [status, setStatus] = useState('idle')
  const [feedback, setFeedback] = useState('')
  const [attempts, setAttempts] = useState(0)

  const [results, setResults] = useState([])
  const [wordStrokes, setWordStrokes] = useState([]) // 新增：蒐集當前詞彙每個字的筆跡
  const [lookupReady, setLookupReady] = useState(false)
  const canvasRef = useRef(null)

  const word = unit.words[wordIndex]
  const totalWords = unit.words.length
  const isLastChar = charIndex === word.characters.length - 1
  const isLastWord = wordIndex === totalWords - 1

  useEffect(() => {
    initHanziLookup()
      .then(() => setLookupReady(true))
      .catch((err) => setFeedback(`辨識引擎載入失敗：${err.message}`))
  }, [])

  async function handleSubmit(strokes) {
    if (!strokes || strokes.length === 0) {
      setFeedback('請先畫出字再送出')
      return
    }

    setStatus('checking')
    setFeedback('辨識中，請稍候…')

    try {
      // 等待 Google API 回傳 (傳入原始畫布尺寸 320x320)
      const candidates = await recognizeFromStrokes(strokes, 320, 320)
      const expected = word.characters[charIndex]

      // 使用 Top 3 匹配
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
    const newRevealed = [...revealedChars, charIndex]
    setRevealedChars(newRevealed)
    
    const newWordStrokes = [...wordStrokes, currentStrokes]
    setWordStrokes(newWordStrokes)

    setTimeout(() => {
      canvasRef.current?.clear()
      if (!isLastChar) {
        setCharIndex((i) => i + 1)
        setAttempts(0)

        setStatus('idle')
        setFeedback('')
      } else {
        const augmentedWord = { ...word, handwrittenStrokes: newWordStrokes }
        const newResults = [...results, augmentedWord]
        setResults(newResults)
        if (!isLastWord) {
          setWordIndex((i) => i + 1)
          setCharIndex(0)
          setRevealedChars([])
          setAttempts(0)
          setWordStrokes([])

          setStatus('idle')
          setFeedback('')
        } else {
          setStatus('complete')
          onComplete(unit.id, newResults)
        }
      }
    }, 1200)
  }

  function skipChar() {
    canvasRef.current?.clear()
    const newRevealed = [...revealedChars, charIndex]
    setRevealedChars(newRevealed)
    
    // 跳過的字塞入空的筆跡
    const newWordStrokes = [...wordStrokes, []]
    setWordStrokes(newWordStrokes)

    if (!isLastChar) {
      setCharIndex((i) => i + 1)
    } else {
      const augmentedWord = { ...word, handwrittenStrokes: newWordStrokes }
      const newResults = [...results, augmentedWord]
      setResults(newResults)
      if (!isLastWord) {
        setWordIndex((i) => i + 1)
        setCharIndex(0)
        setRevealedChars([])
        setWordStrokes([])
      } else {
        setStatus('complete')
        onComplete(unit.id, newResults)
        return
      }
    }
    setAttempts(0)

    setStatus('idle')
    setFeedback('')
  }

  if (status === 'complete') return null

  const disabled = status === 'checking' || status === 'correct'

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
    </div>
  )
}

import { useState, useRef, useEffect, useMemo } from 'react'
import QuestionDisplay from './QuestionDisplay'
import HandwritingCanvas from './HandwritingCanvas'
import ZhuyinSelectQuestion from './ZhuyinSelectQuestion'
import { initHanziLookup, recognizeFromStrokes, recognizeWithLocalEngine, checkAnswerInCandidates } from '../services/visionApi'
import { useAuth } from '../context/AuthContext'
import { addMistake, removeMistake, savePartialResults } from '../services/dbApi'

export default function GameBoard({ unit, initialResults = [], onBack, onComplete }) {
  const { currentUser } = useAuth()
  const [wordIndex,        setWordIndex]        = useState(initialResults.length)
  const [charIndex,        setCharIndex]        = useState(0)
  const [revealedChars,    setRevealedChars]    = useState([])
  const [status,           setStatus]           = useState('idle')
  const [feedback,         setFeedback]         = useState('')
  const [attempts,         setAttempts]         = useState(0)
  const [results,          setResults]          = useState(initialResults)
  const [wordStrokes,      setWordStrokes]      = useState([])
  const [wordZhuyinResult, setWordZhuyinResult] = useState([])
  const [lookupReady,      setLookupReady]      = useState(false)

  const canvasRef  = useRef(null)
  const lockRef    = useRef(false)   // prevents overlapping async submissions

  const word       = unit.words[wordIndex]
  const wordType   = word.type || 'handwriting'
  const totalWords = unit.words.length

  const quizIndices = useMemo(() => {
    if (word.quizIndices && word.quizIndices.length > 0) {
      return word.quizIndices;
    }
    return Array.from({ length: word.characters.length }, (_, i) => i);
  }, [word]);

  const activeCharIndex = quizIndices[charIndex];
  const isLastChar      = charIndex === quizIndices.length - 1;
  const isLastWord      = wordIndex === totalWords - 1;

  const allUnitZhuyin = useMemo(
    () => unit.words.flatMap(w => w.zhuyin || []),
    [unit]
  )

  // Initialize revealedChars when word changes
  useEffect(() => {
    const nonQuizIndices = [];
    for (let i = 0; i < word.characters.length; i++) {
      if (!quizIndices.includes(i)) {
        nonQuizIndices.push(i);
      }
    }
    setRevealedChars(nonQuizIndices);
    setWordStrokes(new Array(word.characters.length).fill(undefined));
    setWordZhuyinResult(new Array(word.characters.length).fill(undefined));
  }, [word, quizIndices]);


  useEffect(() => {
    initHanziLookup()
      .then(() => setLookupReady(true))
      .catch((err) => setFeedback(`辨識引擎載入失敗：${err.message}`))
  }, [])

  // ── Shared: finish current word and advance ───────────────────────

  async function finishWord(augmentedWord) {
    const newResults = [...results, augmentedWord]
    setResults(newResults)

    // 判斷是否為錯題
    const chars = Array.from(augmentedWord.characters || '')
    const strokes = augmentedWord.handwrittenStrokes || []
    const zhuyins = augmentedWord.zhuyin || []

    const isMistake = chars.some((_, i) => {
      if (!quizIndices.includes(i)) return false
      if (wordType === 'handwriting') {
        return strokes[i] === null
      } else {
        return zhuyins[i] === ''
      }
    })

    if (currentUser) {
      if (isMistake) {
        // 重要：儲存原始題目 (word) 而非作答結果 (augmentedWord)，
        // 否則錯題本裡面會變成空字串或空筆畫。
        await addMistake(currentUser.uid, { ...word, quizIndices })
      } else {
        await removeMistake(currentUser.uid, augmentedWord.characters)
      }
      // 儲存中途進度至 Firebase (簡化版：不儲存沉重的筆跡坐標)
      const simplifiedResults = newResults.map(r => ({
        ...r,
        handwrittenStrokes: [] // 清除座標資料，節存空間並規避巢狀陣列限制
      }));
      await savePartialResults(currentUser.uid, unit.docId || unit.id, simplifiedResults)
    }

    if (!isLastWord) {
      lockRef.current = false
      setWordIndex(i => i + 1)
      setCharIndex(0)
      // revealedChars will be handled by useEffect
      setAttempts(0)
      setWordStrokes([])
      setWordZhuyinResult([])
      setStatus('idle')
      setFeedback('')
    } else {
      const idToUse = unit.docId || unit.id
      onComplete(idToUse, newResults)
    }
  }

  // 中途退出
  function handleEndEarly() {
    if (results.length === 0) {
      onBack();
      return;
    }
    const idToUse = unit.docId || unit.id;
    onComplete(idToUse, results);
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
      
      const mainChar = word.characters[activeCharIndex]
      const altCharsStr = (word.altCharacters && word.altCharacters[activeCharIndex]) || ''
      const altChars = altCharsStr.split(/[ ,，]+/).filter(Boolean)
      const allowed = [mainChar, ...altChars]

      if (checkAnswerInCandidates(candidates, allowed, 1)) {
        handleCorrect(strokes)
      } else {
        const newAttempts = attempts + 1
        setAttempts(newAttempts)
        setStatus('wrong')

        if (newAttempts >= 3) {
          setFeedback('已達3次，自動跳過')
          setTimeout(() => {
            canvasRef.current?.clear()
            if (!isLastChar) {
              const newWordStrokes = [...wordStrokes]
              newWordStrokes[activeCharIndex] = null
              setWordStrokes(newWordStrokes)
              // do NOT add to revealedChars — skipped chars stay blank
              setCharIndex(i => i + 1)
              setAttempts(0)
              setStatus('idle')
              setFeedback('')
              lockRef.current = false    // release for next char
            } else {
              const newWordStrokesFinal = [...wordStrokes]
              newWordStrokesFinal[activeCharIndex] = null
              finishWord({ ...word, handwrittenStrokes: newWordStrokesFinal })
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
    const newRevealed    = [...revealedChars, activeCharIndex]
    setRevealedChars(newRevealed)
    const newWordStrokes = [...wordStrokes]
    newWordStrokes[activeCharIndex] = currentStrokes
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
        const finalWordStrokes = [...wordStrokes]
        finalWordStrokes[activeCharIndex] = currentStrokes
        finishWord({ ...word, handwrittenStrokes: finalWordStrokes })
      }
    }, 1200)
  }

  // ── Zhuyin-select handler ─────────────────────────────────────────

  function handleZhuyinAdvance(isCorrect) {
    const newResult = [...wordZhuyinResult]
    newResult[activeCharIndex] = isCorrect
    if (!isLastChar) {
      setWordZhuyinResult(newResult)
      setCharIndex(i => i + 1)
    } else {
      const resultZhuyin = (word.zhuyin || []).map((z, i) => {
        // If it was a quiz char, use result. If not, use original.
        if (!quizIndices.includes(i)) return z; 
        return newResult[i] ? z : ''; 
      })
      finishWord({ ...word, zhuyin: resultZhuyin, handwrittenStrokes: [] })
    }
  }

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div className="game-board">
      <div className="game-header">
        <button className="btn-back" onClick={onBack}>← 返回</button>
        <span className="unit-label">{unit.name}</span>
        <button 
          className="btn-end-early" 
          onClick={handleEndEarly}
          style={{ fontSize: '0.8rem', padding: '6px 12px', background: '#ffeef0', color: '#d93a49', border: '1px solid #ffccc7' }}
        >
          結束練習
        </button>
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
            quizIndices={quizIndices}
            activeCharIndex={activeCharIndex}
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
          charIndex={activeCharIndex}
          allUnitZhuyin={allUnitZhuyin}
          onAdvance={handleZhuyinAdvance}
        />
      )}
    </div>
  )
}

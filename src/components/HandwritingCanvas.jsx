import { useRef, useState, useEffect, useImperativeHandle, forwardRef } from 'react'

// 正規化：canvas 座標(0-320) → HanziLookup 座標(0-1024)
const CANVAS_SIZE = 320
const LOOKUP_SCALE = 1024 / CANVAS_SIZE

const HandwritingCanvas = forwardRef(function HandwritingCanvas({ onSubmit, disabled }, ref) {
  const canvasRef     = useRef(null)
  const strokesRef    = useRef([])   // 所有已完成筆劃
  const curStrokeRef  = useRef([])   // 目前正在畫的筆劃
  const [drawing,   setDrawing]   = useState(false)
  const [hasStroke, setHasStroke] = useState(false)

  useImperativeHandle(ref, () => ({ clear }))

  useEffect(() => { initCanvas() }, [])

  function initCanvas() {
    const canvas = canvasRef.current
    const ctx    = canvas.getContext('2d')
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#1a1a1a'
    ctx.lineWidth   = 5
    ctx.lineCap     = 'round'
    ctx.lineJoin    = 'round'
  }

  function getPoint(e) {
    const canvas = canvasRef.current
    const rect   = canvas.getBoundingClientRect()
    const scaleX = canvas.width  / rect.width
    const scaleY = canvas.height / rect.height
    const src    = e.touches ? e.touches[0] : e
    return {
      x: (src.clientX - rect.left) * scaleX,
      y: (src.clientY - rect.top)  * scaleY,
    }
  }

  function onStart(e) {
    e.preventDefault()
    if (disabled) return
    const { x, y } = getPoint(e)
    // 記錄筆劃起點
    curStrokeRef.current = [[x * LOOKUP_SCALE, y * LOOKUP_SCALE]]
    // 繪圖
    const ctx = canvasRef.current.getContext('2d')
    ctx.beginPath()
    ctx.moveTo(x, y)
    setDrawing(true)
    setHasStroke(true)
  }

  function onMove(e) {
    e.preventDefault()
    if (!drawing || disabled) return
    const { x, y } = getPoint(e)
    // 記錄筆劃點
    curStrokeRef.current.push([x * LOOKUP_SCALE, y * LOOKUP_SCALE])
    // 繪圖
    const ctx = canvasRef.current.getContext('2d')
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  function onEnd() {
    if (curStrokeRef.current.length > 0) {
      strokesRef.current.push([...curStrokeRef.current])
      curStrokeRef.current = []
    }
    setDrawing(false)
  }

  function clear() {
    strokesRef.current   = []
    curStrokeRef.current = []
    initCanvas()
    setHasStroke(false)
  }

  function submit() {
    onSubmit(strokesRef.current)  // 傳筆劃陣列
  }

  return (
    <div className="canvas-wrapper">
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        className="handwriting-canvas"
        onMouseDown={onStart}
        onMouseMove={onMove}
        onMouseUp={onEnd}
        onMouseLeave={onEnd}
        onTouchStart={onStart}
        onTouchMove={onMove}
        onTouchEnd={onEnd}
      />
      <div className="canvas-controls">
        <button className="btn-clear" onClick={clear} disabled={disabled}>
          清除
        </button>
        <button className="btn-submit" onClick={submit} disabled={disabled || !hasStroke}>
          確認送出
        </button>
      </div>
    </div>
  )
})

export default HandwritingCanvas

import { useRef, useState, useEffect, useImperativeHandle, forwardRef } from 'react'

// 正規化目標大小
const LOOKUP_TARGET_SIZE = 1024

const HandwritingCanvas = forwardRef(function HandwritingCanvas({ onSubmit, disabled }, ref) {
  const canvasRef     = useRef(null)
  const strokesRef    = useRef([])   // 所有已完成筆劃 (儲存原始畫布座標)
  const curStrokeRef  = useRef([])   // 目前正在畫的筆劃 (儲存原始畫布座標)
  const [drawing,   setDrawing]   = useState(false)
  const [hasStroke, setHasStroke] = useState(false)

  useImperativeHandle(ref, () => ({ clear }))

  useEffect(() => { initCanvas() }, [])

  function initCanvas() {
    const canvas = canvasRef.current
    if (!canvas) return
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
    curStrokeRef.current = [[x, y]]
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
    curStrokeRef.current.push([x, y])
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

  /**
   * 正規化與簡化筆劃：
   * 1. 找出所有筆劃的 Bounding Box
   * 2. 縮放並置中至 1024x1024 空間
   * 3. 去除過於接近重複的點 (雜訊過濾)
   */
  function normalizeAndSimplifyStrokes(rawStrokes) {
    if (!rawStrokes || rawStrokes.length === 0) return []

    // 1. 尋找 Bounding Box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    rawStrokes.forEach(stroke => {
      stroke.forEach(([x, y]) => {
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
      })
    })

    const width  = maxX - minX
    const height = maxY - minY
    const size   = Math.max(width, height, 1) // 避免除以 0
    
    // 計算縮放比例 (留一點 margins，縮放到 1024 的 90%)
    const margin = 50
    const scale  = (LOOKUP_TARGET_SIZE - margin * 2) / size
    
    // 計算置中位移
    const offsetX = (LOOKUP_TARGET_SIZE - width * scale) / 2
    const offsetY = (LOOKUP_TARGET_SIZE - height * scale) / 2

    // 2. 轉換坐標 + 3. 簡化點 (距離小於 2 則跳過)
    return rawStrokes.map(stroke => {
      const simplified = []
      stroke.forEach(([rawX, rawY]) => {
        const nx = (rawX - minX) * scale + offsetX
        const ny = (rawY - minY) * scale + offsetY
        
        if (simplified.length === 0) {
          simplified.push([nx, ny])
        } else {
          const [lastX, lastY] = simplified[simplified.length - 1]
          const dist = Math.sqrt(Math.pow(nx - lastX, 2) + Math.pow(ny - lastY, 2))
          if (dist > 2) { // 簡化門檻：2 單位 (在 1024 空間下)
            simplified.push([nx, ny])
          }
        }
      })
      return simplified
    }).filter(s => s.length > 0)
  }

  function submit() {
    const processed = normalizeAndSimplifyStrokes(strokesRef.current)
    onSubmit(processed)
  }

  return (
    <div className="canvas-wrapper">
      <canvas
        ref={canvasRef}
        width={320}
        height={320}
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

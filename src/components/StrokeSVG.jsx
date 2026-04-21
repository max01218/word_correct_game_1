import React from 'react'

export default function StrokeSVG({ strokes, size = 90 }) {
  if (!strokes || strokes.length === 0) return null

  // Google Handwriting API and our canvas use 320x320
  return (
    <svg 
      width="100%" 
      height="100%" 
      viewBox="0 0 320 320" 
      style={{ position: 'absolute', top: 0, left: 0, zIndex: 10, pointerEvents: 'none' }}
    >
      {strokes.map((stroke, i) => {
        if (!stroke || stroke.length === 0) return null
        
        const d = `M ${stroke[0][0]} ${stroke[0][1]} ` + 
                  stroke.slice(1).map(pt => `L ${pt[0]} ${pt[1]}`).join(' ')
                  
        return (
          <path
            key={i}
            d={d}
            stroke="#1a1a1a"
            strokeWidth="8"   // 調整適合縮小後的粗度
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        )
      })}
    </svg>
  )
}

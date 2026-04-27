export function initHanziLookup() {
  return Promise.resolve()
}

/**
 * 透過 Google Input Tools API 辨識手寫筆劃 (視覺特徵)
 */
export async function recognizeFromStrokes(strokes, width = 320, height = 320) {
  if (!strokes || strokes.length === 0) return []

  const googleStrokes = strokes.map(stroke => {
    const xs = []
    const ys = []
    stroke.forEach(([x, y]) => {
      xs.push(x); ys.push(y);
    })
    return [xs, ys]
  })

  const payload = {
    app_version: 0.4,
    api_level: '537.36',
    device: window.navigator.userAgent,
    input_type: 0,
    options: 'enable_pre_space',
    requests: [
      {
        writing_guide: { writing_area_width: width, writing_area_height: height },
        ink: googleStrokes,
        language: 'zh-TW'
      }
    ]
  }

  try {
    const response = await fetch('https://inputtools.google.com/request?ime=handwriting&app=mobilesearch&cs=1&oe=UTF-8', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const data = await response.json()
    if (data[0] === 'SUCCESS' && data[1] && data[1][0] && data[1][0][1]) {
      return data[1][0][1]
    }
    return []
  } catch (error) {
    console.error('Google API Error:', error)
    throw new Error('伺服器連線失敗')
  }
}


/**
 * 檢查預期文字是否在辨識結果中
 */
export function checkAnswerInCandidates(detectedList, expected, topN = 3) {
  if (!detectedList || !expected) return false
  const candidates = detectedList.slice(0, topN)
  
  if (Array.isArray(expected)) {
    return expected.some(e => candidates.includes(e))
  }
  return candidates.includes(expected)
}



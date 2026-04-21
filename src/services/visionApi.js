// 由於改用 API，不需要初始化，但保留空函數以相容原先的 App.jsx/GameBoard.jsx 呼叫
export function initHanziLookup() {
  return Promise.resolve()
}

/**
 * 透過 Google Input Tools API 辨識手寫筆劃 (非同步)
 * @param {number[][][]} strokes 原始畫布筆劃：[ [ [x,y], [x,y] ], ... ]
 * @param {number} width 畫布寬度 (預設 320)
 * @param {number} height 畫布高度 (預設 320)
 * @returns {Promise<string[]>} 回傳候選字陣列
 */
export async function recognizeFromStrokes(strokes, width = 320, height = 320) {
  if (!strokes || strokes.length === 0) return []

  // 轉換格式：Google API 需要的格式為 [ [ [x1, x2, x3...], [y1, y2, y3...] ], ... ]
  const googleStrokes = strokes.map(stroke => {
    const xs = []
    const ys = []
    stroke.forEach(([x, y]) => {
      xs.push(x)
      ys.push(y)
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
        writing_guide: {
          writing_area_width: width,
          writing_area_height: height
        },
        ink: googleStrokes,
        language: 'zh-TW'   // 指定繁體中文
      }
    ]
  }

  try {
    const response = await fetch('https://inputtools.google.com/request?ime=handwriting&app=mobilesearch&cs=1&oe=UTF-8', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
    
    const data = await response.json()
    // 解析回傳格式： [ "SUCCESS", [ [ "ID", [候選字陣列], ... ] ] ]
    if (data[0] === 'SUCCESS' && data[1] && data[1][0] && data[1][0][1]) {
      return data[1][0][1]
    }
    return []
  } catch (error) {
    console.error('Google Handwriting API Error:', error)
    throw new Error('辨識伺服器連線失敗，請檢查網路')
  }
}

/**
 * 檢查預期文字是否在辨識結果中
 * @param {string[]} detectedList 辨識出的候選字陣列
 * @param {string} expected 預期的正確字
 * @param {number} topN 只檢查前 N 個候選字 (預設 3)
 */
export function checkAnswerInCandidates(detectedList, expected, topN = 3) {
  if (!detectedList || !expected) return false
  const candidates = detectedList.slice(0, topN)
  return candidates.includes(expected)
}

export function checkAnswer(detected, expected) {
  return detected === expected
}



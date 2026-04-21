// 初始化 HanziLookup（App 啟動時呼叫一次）
export function initHanziLookup() {
  return new Promise((resolve, reject) => {
    if (!window.HanziLookup) {
      reject(new Error('HanziLookupJS 未載入，請確認 index.html 有引入 hanzilookup.min.js'))
      return
    }
    window.HanziLookup.init('mmah', '/mmah.json', (success) => {
      success ? resolve() : reject(new Error('mmah.json 載入失敗'))
    })
  })
}

// 由筆劃陣列辨識候選漢字陣列（同步）
// strokes: [ [[x,y],[x,y],...], ... ] (建議先經過正規化)
export function recognizeFromStrokes(strokes) {
  if (!window.HanziLookup) throw new Error('HanziLookupJS 未載入')
  if (!strokes || strokes.length === 0) return []

  const analyzed = new window.HanziLookup.AnalyzedCharacter(strokes)
  const matcher  = new window.HanziLookup.Matcher('mmah')
  const results  = []

  matcher.match(analyzed, 8, (matches) => {
    for (const m of matches) {
      if (m.character) results.push(m.character)
    }
  })

  return results
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


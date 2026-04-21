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

// 由筆劃陣列辨識最佳漢字（同步）
// strokes: [ [[x,y],[x,y],...], ... ]  已正規化至 0-1024
export function recognizeFromStrokes(strokes) {
  if (!window.HanziLookup) throw new Error('HanziLookupJS 未載入')
  if (!strokes || strokes.length === 0) return ''

  const analyzed = new window.HanziLookup.AnalyzedCharacter(strokes)
  const matcher  = new window.HanziLookup.Matcher('mmah')
  const results  = []

  matcher.match(analyzed, 8, (matches) => {
    for (const m of matches) results.push(m.character)
  })

  return results[0] || ''
}

export function checkAnswer(detected, expected) {
  return detected === expected
}

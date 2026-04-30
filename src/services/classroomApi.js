// Google Classroom 整合
// TODO: 填入 .env 後啟用
// 需要啟用的 Google API：
//   - Google Classroom API
//   - Google Drive API（用於附件上傳）
// OAuth 2.0 範圍：
//   - https://www.googleapis.com/auth/classroom.coursework.me
//   - https://www.googleapis.com/auth/drive.file

const CLIENT_ID   = import.meta.env.VITE_GOOGLE_CLIENT_ID
const COURSE_ID   = import.meta.env.VITE_CLASSROOM_COURSE_ID
const WORK_ID     = import.meta.env.VITE_CLASSROOM_COURSEWORK_ID
const SCOPE       = 'https://www.googleapis.com/auth/classroom.coursework.me https://www.googleapis.com/auth/classroom.coursework.students https://www.googleapis.com/auth/drive.file'

let accessToken = null

export function isConfigured() {
  return !!(
    CLIENT_ID && CLIENT_ID !== 'your_google_client_id_here' &&
    COURSE_ID && COURSE_ID !== 'your_course_id_here' &&
    WORK_ID   && WORK_ID   !== 'your_coursework_id_here'
  )
}

// 彈出 Google OAuth 視窗取得 access token
export function signIn() {
  return new Promise((resolve, reject) => {
    if (!window.google) {
      reject(new Error('Google API 尚未載入，請檢查網路連線'))
      return
    }
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: (res) => {
        if (res.error) { reject(new Error(res.error)); return }
        accessToken = res.access_token
        resolve(accessToken)
      },
    })
    client.requestAccessToken()
  })
}

// 將完成單（HTML 字串）上傳至 Drive，並做為附件提交到 Classroom
export async function submitToClassroom(unit, results) {
  if (!isConfigured()) {
    return { success: false, message: '尚未設定 Google Classroom 憑證，請先填寫 .env' }
  }

  try {
    if (!accessToken) await signIn()

    // Step 1: 渲染完成單為 PNG 並上傳至 Google Drive
    const canvas = generateSheetCanvas(unit, results)
    const blob   = await new Promise(r => canvas.toBlob(r, 'image/png'))
    const meta   = JSON.stringify({ name: `${unit.name}_完成單.png`, mimeType: 'image/png' })
    const form  = new FormData()
    form.append('metadata', new Blob([meta], { type: 'application/json' }))
    form.append('file', blob)

    const uploadRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` }, body: form }
    )
    const { id: fileId } = await uploadRes.json()

    // Step 2: 取得繳交 ID
    const subRes = await fetch(
      `https://classroom.googleapis.com/v1/courses/${COURSE_ID}/courseWork/${WORK_ID}/studentSubmissions?userId=me`,
      { method: 'GET', headers: { Authorization: `Bearer ${accessToken}` } }
    )
    if (!subRes.ok) throw new Error('無法取得繳交資料')
    const subData = await subRes.json()
    const submission = subData.studentSubmissions?.[0]
    if (!submission) return { success: false, message: '找不到對應的作業' }

    // 掛載附件（使用 modifyAttachments）
    const attachRes = await fetch(
      `https://classroom.googleapis.com/v1/courses/${COURSE_ID}/courseWork/${WORK_ID}/studentSubmissions/${submission.id}:modifyAttachments`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addAttachments: [{ driveFile: { id: fileId } }],
        }),
      }
    )
    if (!attachRes.ok) throw new Error('掛載附件失敗')

    // Step 3: 提交 (turnIn)
    const turnInRes = await fetch(
      `https://classroom.googleapis.com/v1/courses/${COURSE_ID}/courseWork/${WORK_ID}/studentSubmissions/${submission.id}:turnIn`,
      { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` } }
    )
    if (!turnInRes.ok) throw new Error('繳交作業失敗')

    return { success: true, message: '已成功傳送至 Google Classroom！' }
  } catch (err) {
    return { success: false, message: `傳送失敗：${err.message}` }
  }
}

export async function setupNewAssignment(unit) {
  try {
    if (!accessToken) await signIn()

    const appUrl = window.location.origin
    const response = await fetch(
      `https://classroom.googleapis.com/v1/courses/${COURSE_ID}/courseWork`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `字音字形練習 ─ ${unit?.name || '練習'}`,
          description: `請點擊以下連結完成練習，系統會自動幫你繳交完成單。\n\n${appUrl}`,
          workType: 'ASSIGNMENT',
          state: 'PUBLISHED',
          maxPoints: 100,
        }),
      }
    )

    if (!response.ok) {
      const err = await response.json()
      throw new Error(JSON.stringify(err))
    }

    const newWork = await response.json()

    // 自動更新 Vercel 環境變數並觸發 rebuild
    const updateRes = await fetch('/api/update-coursework', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseworkId: newWork.id })
    })

    if (updateRes.ok) {
      alert(`✅ 作業「${unit?.name}」已發布！\n系統正在自動重新部署（約 30-60 秒），完成後學生即可使用。`)
    } else {
      alert(`✅ 作業已建立，但自動部署失敗。\n請手動將此 ID 更新至 Vercel：\n${newWork.id}`)
    }

    console.log('新 Coursework ID:', newWork.id)
    return newWork.id
  } catch (err) {
    alert(`建立失敗：${err.message}`)
    console.error(err)
  }
}

function generateSheetCanvas(unit, results) {
  const FONT     = '"Microsoft JhengHei","PingFang TC",sans-serif'
  const CELL     = 140   // 每個字的格子大小
  const ZHUYIN   = 24    // 注音區高度
  const PAD      = 10    // 格子間距
  const CARD_PAD = 12    // 卡片內邊距
  const MARGIN   = 20    // 畫布邊距
  const HEADER   = 80    // 標題區高度
  const PER_ROW  = 4     // 每行最多幾個詞

  const maxChars = Math.max(...results.map(w => Array.from(w.characters).length), 1)
  const cardW = maxChars * (CELL + PAD) - PAD + CARD_PAD * 2
  const cardH = CELL + ZHUYIN + CARD_PAD * 2
  const cols  = Math.min(results.length, PER_ROW)
  const rows  = Math.ceil(results.length / PER_ROW)

  const canvasW = cols * cardW + (cols - 1) * MARGIN + MARGIN * 2
  const canvasH = HEADER + rows * cardH + (rows - 1) * MARGIN + MARGIN * 2

  const c = document.createElement('canvas')
  c.width = canvasW
  c.height = canvasH
  const ctx = c.getContext('2d')

  // 背景
  ctx.fillStyle = '#f5f5f5'
  ctx.fillRect(0, 0, canvasW, canvasH)

  // 標題
  ctx.fillStyle = '#333'
  ctx.font = `bold 26px ${FONT}`
  ctx.fillText(`字音字形練習 ― ${unit.name} 完成單`, MARGIN, MARGIN + 30)
  ctx.fillStyle = '#888'
  ctx.font = `16px ${FONT}`
  ctx.fillText(`主題：${unit.theme}　｜　完成 ${results.length} 詞`, MARGIN, MARGIN + 58)

  results.forEach((word, wi) => {
    const col   = wi % PER_ROW
    const row   = Math.floor(wi / PER_ROW)
    const cardX = MARGIN + col * (cardW + MARGIN)
    const cardY = HEADER + MARGIN + row * (cardH + MARGIN)

    // 卡片背景
    ctx.fillStyle = '#fff'
    ctx.strokeStyle = '#e0e0e0'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.roundRect(cardX, cardY, cardW, cardH, 8)
    ctx.fill()
    ctx.stroke()

    const chars       = Array.from(word.characters)
    const zhuyins     = word.zhuyin || []
    const strokesArr  = word.handwrittenStrokes || []
    const quizIndices = (word.quizIndices && word.quizIndices.length > 0)
      ? word.quizIndices
      : chars.map((_, i) => i)

    chars.forEach((char, ci) => {
      const cellX   = cardX + CARD_PAD + ci * (CELL + PAD)
      const cellY   = cardY + CARD_PAD
      const isQuiz  = quizIndices.includes(ci)
      const strokes = strokesArr[ci]

      // 格子背景 + 邊框
      ctx.fillStyle = '#fff'
      ctx.fillRect(cellX, cellY, CELL, CELL)
      ctx.strokeStyle = '#ddd'
      ctx.lineWidth = 1
      ctx.strokeRect(cellX, cellY, CELL, CELL)

      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      if (!isQuiz) {
        // 非考題：橘色文字
        ctx.fillStyle = '#f5a623'
        ctx.font = `${CELL * 0.55}px ${FONT}`
        ctx.fillText(char, cellX + CELL / 2, cellY + CELL / 2)
      } else if (strokes === null) {
        // 跳過：紅色 X
        ctx.fillStyle = '#cc0000'
        ctx.font = `${CELL * 0.55}px ${FONT}`
        ctx.fillText('✗', cellX + CELL / 2, cellY + CELL / 2)
      } else if (strokes && strokes.length > 0) {
        // 手寫筆劃
        ctx.save()
        ctx.translate(cellX, cellY)
        const scale = CELL / 320
        ctx.strokeStyle = '#1a1a1a'
        ctx.lineWidth = 3
        ctx.lineCap = ctx.lineJoin = 'round'
        for (const stroke of strokes) {
          if (!stroke || stroke.length < 2) continue
          ctx.beginPath()
          ctx.moveTo(stroke[0][0] * scale, stroke[0][1] * scale)
          for (let i = 1; i < stroke.length; i++) ctx.lineTo(stroke[i][0] * scale, stroke[i][1] * scale)
          ctx.stroke()
        }
        ctx.restore()
      }

      // 注音
      ctx.fillStyle = '#888'
      ctx.font = `13px ${FONT}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillText(zhuyins[ci] || '', cellX + CELL / 2, cellY + CELL + 4)
    })
  })

  return c
}

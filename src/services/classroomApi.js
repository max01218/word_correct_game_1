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

    // Step 1: 上傳 HTML 到 Google Drive
    const html  = await generateSheetHTML(unit, results)
    const blob  = new Blob([html], { type: 'text/html' })
    const meta  = JSON.stringify({ name: `${unit.name}_完成單`, mimeType: 'application/vnd.google-apps.document' })
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

export async function setupNewAssignment() {
  try {
    if (!accessToken) await signIn()

    const response = await fetch(
      `https://classroom.googleapis.com/v1/courses/${COURSE_ID}/courseWork`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '字音字形練習 - 完成單繳交',
          description: '請完成字音字形練習，系統會自動幫你繳交完成單。',
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
    alert(`✅ 作業建立成功！\n新的 Coursework ID：${newWork.id}\n\n請複製這串 ID 去更新 Vercel 的 VITE_CLASSROOM_COURSEWORK_ID`)
    console.log('新 Coursework ID:', newWork.id)
    return newWork.id
  } catch (err) {
    alert(`建立失敗：${err.message}`)
    console.error(err)
  }
}

function renderStrokesToDataURL(strokes) {
  if (!strokes || strokes.length === 0) return null
  const size = 160
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, size, size)
  ctx.strokeStyle = '#1a1a1a'
  ctx.lineWidth = 3
  ctx.lineCap = ctx.lineJoin = 'round'
  const scale = size / 320
  for (const stroke of strokes) {
    if (!stroke || stroke.length < 2) continue
    ctx.beginPath()
    ctx.moveTo(stroke[0][0] * scale, stroke[0][1] * scale)
    for (let i = 1; i < stroke.length; i++) ctx.lineTo(stroke[i][0] * scale, stroke[i][1] * scale)
    ctx.stroke()
  }
  return c.toDataURL('image/png')
}

async function generateSheetHTML(unit, results) {
  const cards = results.map((word) => {
    const chars = Array.from(word.characters)
    const zhuyins = word.zhuyin || []
    const strokesArr = word.handwrittenStrokes || []
    const quizIndices = word.quizIndices || chars.map((_, i) => i)

    const cells = chars.map((char, i) => {
      const isQuiz = quizIndices.includes(i)
      const strokes = strokesArr[i]

      let inner
      if (!isQuiz) {
        inner = `<div style="font-size:36px;color:#f5a623;line-height:1">${char}</div>`
      } else if (strokes === null) {
        inner = `<div style="font-size:36px;color:#cc0000;line-height:1">✗</div>`
      } else if (strokes && strokes.length > 0) {
        const img = renderStrokesToDataURL(strokes)
        inner = img
          ? `<img src="${img}" style="width:72px;height:72px;display:block;margin:auto"/>`
          : `<div style="font-size:36px;line-height:1">${char}</div>`
      } else {
        inner = `<div style="font-size:36px;line-height:1">${char}</div>`
      }

      return `<td style="border:1px solid #ddd;width:88px;height:88px;text-align:center;vertical-align:middle;padding:4px;">
        ${inner}
        <div style="font-size:12px;color:#888;margin-top:2px">${zhuyins[i] || ''}</div>
      </td>`
    }).join('')

    return `<div style="display:inline-block;margin:8px;border:2px solid #e0e0e0;border-radius:10px;padding:10px;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,0.08)">
      <table style="border-collapse:collapse"><tr>${cells}</tr></table>
    </div>`
  }).join('\n')

  return `<!DOCTYPE html>
<html lang="zh-TW"><head>
  <meta charset="UTF-8">
  <title>${unit.name} 完成單</title>
</head>
<body style="font-family:'Microsoft JhengHei','PingFang TC',sans-serif;padding:32px;background:#f5f5f5">
  <h2 style="color:#333;margin-bottom:4px">🎉 字音字形練習 ─ ${unit.name} 完成單</h2>
  <p style="color:#888;margin-top:0">主題：${unit.theme}　｜　完成 ${results.length} 詞</p>
  <div style="display:flex;flex-wrap:wrap;gap:4px">
    ${cards}
  </div>
</body></html>`
}

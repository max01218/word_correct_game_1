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
const SCOPE       = 'https://www.googleapis.com/auth/classroom.coursework.me https://www.googleapis.com/auth/drive.file'

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
    const html  = generateSheetHTML(unit, results)
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

    // Step 2: 提交到 Classroom
    const subRes = await fetch(
      `https://classroom.googleapis.com/v1/courses/${COURSE_ID}/courseWork/${WORK_ID}/studentSubmissions`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    )
    const subData = await subRes.json()
    const submission = subData.studentSubmissions?.[0]
    if (!submission) return { success: false, message: '找不到對應的作業，請確認課程 ID 與作業 ID' }

    // 修改提交內容（加入附件）
    await fetch(
      `https://classroom.googleapis.com/v1/courses/${COURSE_ID}/courseWork/${WORK_ID}/studentSubmissions/${submission.id}?updateMask=assignmentSubmission`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentSubmission: {
            attachments: [{ driveFile: { id: fileId } }],
          },
        }),
      }
    )

    // 提交
    await fetch(
      `https://classroom.googleapis.com/v1/courses/${COURSE_ID}/courseWork/${WORK_ID}/studentSubmissions/${submission.id}:turnIn`,
      { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` } }
    )

    return { success: true, message: '已成功傳送至 Google Classroom！老師將會收到通知。' }
  } catch (err) {
    return { success: false, message: `傳送失敗：${err.message}` }
  }
}

function generateSheetHTML(unit, results) {
  const rows = results
    .map(
      (w) =>
        `<tr>
          <td style="font-size:28px;padding:8px 16px">${w.characters}</td>
          <td style="font-size:18px;padding:8px 16px;color:#555">${w.zhuyin.join('　')}</td>
        </tr>`
    )
    .join('')

  return `<!DOCTYPE html>
<html lang="zh-TW">
<head><meta charset="UTF-8"><title>${unit.name} 完成單</title></head>
<body style="font-family:'Microsoft JhengHei',sans-serif;padding:32px">
  <h2 style="color:#333">字音字形練習 ─ ${unit.name} 完成單</h2>
  <p style="color:#888">主題：${unit.theme}</p>
  <table border="1" cellspacing="0" style="border-collapse:collapse;margin-top:16px">
    <thead>
      <tr style="background:#eee">
        <th style="padding:8px 16px">詞彙</th>
        <th style="padding:8px 16px">注音</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`
}

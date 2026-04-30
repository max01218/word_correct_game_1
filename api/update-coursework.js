export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { courseworkId } = req.body
  if (!courseworkId) return res.status(400).json({ error: 'Missing courseworkId' })

  const token      = process.env.VERCEL_TOKEN
  const projectId  = process.env.VERCEL_PROJECT_ID
  const deployHook = process.env.VERCEL_DEPLOY_HOOK

  if (!token || !projectId || !deployHook) {
    return res.status(500).json({ error: '尚未設定 Vercel 環境變數' })
  }

  // 1. 找出 VITE_CLASSROOM_COURSEWORK_ID 的 env var ID
  const listRes = await fetch(`https://api.vercel.com/v9/projects/${projectId}/env`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  const { envs } = await listRes.json()
  const envVar = envs?.find(e => e.key === 'VITE_CLASSROOM_COURSEWORK_ID')
  if (!envVar) return res.status(404).json({ error: '找不到 VITE_CLASSROOM_COURSEWORK_ID 環境變數' })

  // 2. 更新值
  const patchRes = await fetch(`https://api.vercel.com/v9/projects/${projectId}/env/${envVar.id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ value: courseworkId })
  })
  if (!patchRes.ok) return res.status(502).json({ error: '更新環境變數失敗' })

  // 3. 觸發重新部署
  await fetch(deployHook, { method: 'POST' })

  res.json({ success: true })
}

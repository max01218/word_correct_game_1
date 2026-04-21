import { useState, useEffect } from 'react'
import { useAuth } from './context/AuthContext'
import { getWordBanks, saveWordBank } from './services/dbApi'
import { wordBank as fallbackData } from './data/wordBank' // For initial seed
import UnitSelector from './components/UnitSelector'
import GameBoard    from './components/GameBoard'
import ResultSheet  from './components/ResultSheet'
import TeacherDashboard from './components/TeacherDashboard'

function loadCompleted() {
  try { return JSON.parse(localStorage.getItem('completedUnits') || '{}') }
  catch { return {} }
}

export default function App() {
  const { currentUser, isTeacher, loginWithGoogle, logout } = useAuth()
  
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(true)

  const [selectedUnit,  setSelectedUnit]  = useState(null)
  const [completedUnits, setCompletedUnits] = useState(loadCompleted)
  
  // view: 'select' | 'game' | 'result' | 'teacher_dashboard'
  const [view,    setView]    = useState('select')
  const [results, setResults] = useState([])

  useEffect(() => {
    async function loadData() {
      if (!currentUser) return; // Don't load until logged in
      try {
        setLoading(true)
        const dbUnits = await getWordBanks();
        setUnits(dbUnits);
      } catch (err) {
        console.error('Failed to load word banks from Firebase:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [currentUser]);

  // Provide an easy way to seed data if Firebase is completely empty
  const handleSeedData = async () => {
    setLoading(true)
    for (let u of fallbackData.units) {
      await saveWordBank(null, u)
    }
    const dbUnits = await getWordBanks();
    setUnits(dbUnits);
    setLoading(false)
  };

  const reloadUnits = async () => {
    const dbUnits = await getWordBanks();
    setUnits(dbUnits);
  };

  function handleSelectUnit(unit) {
    setSelectedUnit(unit)
    setResults([])
    setView('game')
  }

  function handleComplete(unitId, unitResults) {
    const next = { ...completedUnits, [unitId]: true }
    setCompletedUnits(next)
    localStorage.setItem('completedUnits', JSON.stringify(next))
    setResults(unitResults)
    setView('result')
  }

  function handleBack() {
    setSelectedUnit(null)
    setView('select')
  }

  if (!currentUser) {
    return (
      <div className="app-container" style={{ textAlign: 'center', marginTop: '100px' }}>
        <h1 style={{ color: '#3a5bd9' }}>字音字形小遊戲</h1>
        <p style={{ color: '#666', marginBottom: '30px' }}>使用 Google Classroom 帳號登入進入遊戲</p>
        <button className="btn-submit" onClick={loginWithGoogle}>
          使用 Google 登入
        </button>
      </div>
    );
  }

  if (loading) {
    return <div className="app-container" style={{ textAlign: 'center', marginTop: '100px' }}>載入資料庫中...</div>
  }

  return (
    <div className="app-container">
      {/* 頂部導覽 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
        <div style={{ fontSize: '0.8rem', color: '#666' }}>
          登入身分：{currentUser.email} {isTeacher ? '(教師)' : '(學生)'}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {isTeacher && view !== 'teacher_dashboard' && (
            <button style={{ padding: '6px 12px', background: '#faad14', color: '#fff' }} onClick={() => setView('teacher_dashboard')}>
              ⚙️ 教師專區
            </button>
          )}
          {view === 'teacher_dashboard' && (
            <button style={{ padding: '6px 12px', background: '#3a5bd9', color: '#fff' }} onClick={() => setView('select')}>
              🏠 回到遊戲首頁
            </button>
          )}
          <button style={{ padding: '6px 12px', background: '#eee', color: '#333' }} onClick={logout}>
            登出
          </button>
        </div>
      </div>

      {view === 'select' && (
        <UnitSelector
          units={units}
          completedUnits={completedUnits}
          onSelect={handleSelectUnit}
          onSeed={handleSeedData}
          isTeacher={isTeacher}
        />
      )}
      {view === 'game' && (
        <GameBoard
          unit={selectedUnit}
          onBack={handleBack}
          onComplete={handleComplete}
        />
      )}
      {view === 'result' && (
        <ResultSheet
          unit={selectedUnit}
          results={results}
          onBack={handleBack}
        />
      )}
      {view === 'teacher_dashboard' && isTeacher && (
        <TeacherDashboard 
          units={units} 
          onUpdate={reloadUnits} 
        />
      )}
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useAuth } from './context/AuthContext'
import { 
  getWordBanks, saveWordBank, getUserProgress, saveUserProgress, getUserMistakes, 
  getPartialResults, clearPartialResults 
} from './services/dbApi'
import { wordBank as fallbackData } from './data/wordBank' // For initial seed
import UnitSelector from './components/UnitSelector'
import GameBoard    from './components/GameBoard'
import ResultSheet  from './components/ResultSheet'
import TeacherDashboard from './components/TeacherDashboard'

// Deprecated: Moving to Firebase
function loadCompletedLocal() {
  try { return JSON.parse(localStorage.getItem('completedUnits') || '{}') }
  catch { return {} }
}

export default function App() {
  const { currentUser, isTeacher, loginWithGoogle, logout } = useAuth()
  
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(true)

  const [selectedUnit,  setSelectedUnit]  = useState(null)
  const [completedUnits, setCompletedUnits] = useState({})
  const [mistakeWords, setMistakeWords]   = useState([])
  
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
        
        // Also load user progress from Firebase
        const progress = await getUserProgress(currentUser.uid);
        setCompletedUnits(progress);
        
        // Load user mistakes
        const mistakes = await getUserMistakes(currentUser.uid);
        setMistakeWords(mistakes);
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
    if (currentUser) {
      const mistakes = await getUserMistakes(currentUser.uid);
      setMistakeWords(mistakes);
    }
  };

  async function handleSelectUnit(unit) {
    setSelectedUnit(unit)
    setLoading(true)
    try {
      let savedResults = await getPartialResults(currentUser.uid, unit.docId || unit.id);
      // 防呆：如果中途存檔已經包含所有題目，代表上次已經寫完了，不應算是「中途」
      if (savedResults && savedResults.length >= unit.words.length) {
        savedResults = [];
        await clearPartialResults(currentUser.uid, unit.docId || unit.id);
      }
      setResults(savedResults || []);
    } catch (err) {
      console.error('Failed to load partial results:', err);
      setResults([]);
    } finally {
      setLoading(false);
      setView('game')
    }
  }

  async function handleComplete(unitId, unitResults) {
    // Check if there are any mistakes in the results
    const hasErrors = unitResults.some(word => {
      const chars = Array.from(word.characters || '');
      const strokes = word.handwrittenStrokes || [];
      const zhuyins = word.zhuyin || [];
      const quizIndices = word.quizIndices || Array.from({length: chars.length}, (_, i) => i);
      
      return chars.some((_, i) => {
        if (!quizIndices.includes(i)) return false;
        if (word.type === 'handwriting') return strokes[i] === null;
        return zhuyins[i] === '';
      });
    });

    const isFullCompletion = unitResults.length === selectedUnit.words.length;

    // 不論是否全對，只要完整完成了整個單元，就清除該單元的「中途存檔」，讓下次進入能從頭開始
    if (isFullCompletion) {
      try {
        await clearPartialResults(currentUser.uid, unitId);
      } catch (err) {
        console.error('Failed to clear partial results:', err);
      }
    }

    if (!hasErrors && isFullCompletion) {
      const next = { ...completedUnits, [unitId]: true }
      setCompletedUnits(next)
      
      // Save to Firebase
      try {
        await saveUserProgress(currentUser.uid, unitId);
      } catch (err) {
        console.error('Failed to save progress to Firebase:', err);
      }
      
      // Also keep local as backup
      localStorage.setItem('completedUnits', JSON.stringify(next))
    }

    setResults(unitResults)
    setView('result')
  }

  async function handleBack() {
    setSelectedUnit(null)
    setResults([])
    setView('select')
    
    // Refresh mistakes bank when returning to menu so it appears immediately!
    if (currentUser) {
      const mistakes = await getUserMistakes(currentUser.uid);
      setMistakeWords(mistakes);
    }
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
          units={
            mistakeWords.length > 0 
              ? [{ id: 'mistakes', docId: 'mistakes_bank', name: '⭐ 我的錯題本', theme: '複習你曾經答錯的題目', words: mistakeWords }, ...units]
              : units
          }
          completedUnits={completedUnits}
          onSelect={handleSelectUnit}
          onSeed={handleSeedData}
          isTeacher={isTeacher}
        />
      )}
      {view === 'game' && (
        <GameBoard
          unit={selectedUnit}
          initialResults={results}
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

import { useState } from 'react'
import UnitSelector from './components/UnitSelector'
import GameBoard    from './components/GameBoard'
import ResultSheet  from './components/ResultSheet'

function loadCompleted() {
  try { return JSON.parse(localStorage.getItem('completedUnits') || '{}') }
  catch { return {} }
}

export default function App() {
  const [selectedUnit,  setSelectedUnit]  = useState(null)
  const [completedUnits, setCompletedUnits] = useState(loadCompleted)
  // view: 'select' | 'game' | 'result'
  const [view,    setView]    = useState('select')
  const [results, setResults] = useState([])

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

  return (
    <div className="app-container">
      {view === 'select' && (
        <UnitSelector
          completedUnits={completedUnits}
          onSelect={handleSelectUnit}
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
    </div>
  )
}

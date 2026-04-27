export default function QuestionDisplay({ word, quizIndices, activeCharIndex, revealedChars }) {
  return (
    <div className="question-display">
      <p className="question-prompt">根據注音，手寫出對應的字：</p>
      <div className="zhuyin-row">
        {word.zhuyin.map((z, i) => {
          const isActive   = i === activeCharIndex
          const isRevealed = revealedChars.includes(i)
          const isQuizChar = !quizIndices || quizIndices.length === 0 || quizIndices.includes(i)
          return (
            <div key={i} className={`zhuyin-box ${isActive ? 'active' : ''} ${isRevealed ? 'revealed' : ''} ${!isQuizChar ? 'is-context' : ''}`}>
              <div className="zhuyin-text">{z}</div>
              <div className="char-slot">
                {isRevealed ? word.characters[i] : isActive ? '？' : '　'}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

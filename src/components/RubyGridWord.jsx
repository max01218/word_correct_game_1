import React from 'react';

const TONES = ['ˊ', 'ˇ', 'ˋ', '˙'];

function RubyGridBox({ char, zhuyin }) {
  let symbols = [];
  let tone = '';
  
  if (zhuyin) {
    const chars = Array.from(zhuyin);
    for (let c of chars) {
      if (TONES.includes(c)) {
        tone = c;
      } else {
        // Some zhuyin may contain spaces, we can filter them out
        if (c.trim() !== '') {
          symbols.push(c);
        }
      }
    }
  }

  const isLightTone = tone === '˙';

  return (
    <div className="ruby-grid-box">
      <div className="ruby-char-col">
        {/* Background grid lines for the Chinese character */}
        <div className="char-grid-lines">
          <div className="grid-line-h"></div>
          <div className="grid-line-v"></div>
        </div>
        <div className="char-text">{char}</div>
      </div>
      
      <div className="ruby-zhuyin-col">
        {isLightTone && <div className="zhuyin-tone light-tone">˙</div>}
        <div className={`zhuyin-symbols ${symbols.length === 3 ? 'compact' : ''}`}>
          {symbols.map((sym, i) => (
            <span key={i} className="z-sym">{sym}</span>
          ))}
        </div>
        {!isLightTone && tone && <div className="zhuyin-tone normal-tone">{tone}</div>}
      </div>
    </div>
  );
}

export default function RubyGridWord({ word }) {
  const chars = Array.from(word.characters || '');
  
  return (
    <div className="ruby-word-stack">
      {chars.map((char, index) => (
        <RubyGridBox 
          key={index} 
          char={char} 
          zhuyin={word.zhuyin ? word.zhuyin[index] : ''} 
        />
      ))}
    </div>
  );
}

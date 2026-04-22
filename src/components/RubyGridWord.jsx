import React from 'react';
import StrokeSVG from './StrokeSVG';

const TONES = ['ˊ', 'ˇ', 'ˋ', '˙'];

function RubyGridBox({ char, zhuyin, strokes, isSkipped }) {
  let symbols = [];
  let tone = '';

  if (zhuyin) {
    for (const c of zhuyin) {
      if (TONES.includes(c))  tone = c;
      else if (c.trim() !== '') symbols.push(c);
    }
  }

  const isLightTone = tone === '˙';

  return (
    <div className={`ruby-grid-box${isSkipped ? ' skipped-box' : ''}`}>
      <div className="ruby-char-col">
        {strokes === null ? (
          null
        ) : strokes && strokes.length > 0 ? (
          <StrokeSVG strokes={strokes} />
        ) : (
          <div className="char-text">{char}</div>
        )}
      </div>

      <div className="ruby-zhuyin-col">
        {isLightTone && <div className="zhuyin-tone light-tone">˙</div>}
        <div className={`zhuyin-symbols ${symbols.length === 3 ? 'compact' : ''}`}>
          {symbols.map((sym, i) => <span key={i} className="z-sym">{sym}</span>)}
        </div>
        {!isLightTone && tone && <div className="zhuyin-tone normal-tone">{tone}</div>}
      </div>
    </div>
  );
}

export default function RubyGridWord({ word }) {
  const chars             = Array.from(word.characters || '');
  const handwrittenStrokes = word.handwrittenStrokes || [];

  const hasSkipped = chars.some((_, i) => {
    const strokes = handwrittenStrokes[i];
    const zhuyin  = word.zhuyin?.[i];
    return strokes === null || zhuyin === '';
  });

  return (
    <div className={`ruby-word-stack${hasSkipped ? ' has-skipped' : ''}`}>
      {chars.map((char, index) => {
        const strokes  = handwrittenStrokes[index];
        const zhuyin   = word.zhuyin?.[index] ?? '';
        const isSkipped = strokes === null || zhuyin === '';
        return (
          <RubyGridBox
            key={index}
            char={char}
            zhuyin={zhuyin}
            strokes={strokes}
            isSkipped={isSkipped}
          />
        );
      })}
    </div>
  );
}

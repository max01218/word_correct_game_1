import React, { useState } from 'react';
import { saveWordBank, deleteWordBank } from '../services/dbApi';
import ZhuyinPicker from './ZhuyinPicker';

const TYPE_LABELS = {
  handwriting:   { icon: '✍️', label: '手寫漢字' },
  zhuyin_select: { icon: '🔤', label: '選注音' },
}

function TypeToggle({ value, onChange }) {
  return (
    <div style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', border: '1px solid #ddd', flexShrink: 0 }}>
      {Object.entries(TYPE_LABELS).map(([key, { icon, label }]) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          style={{
            padding: '5px 10px',
            fontSize: '0.8rem',
            border: 'none',
            borderRadius: 0,
            cursor: 'pointer',
            background: value === key ? '#3a5bd9' : '#f5f5f5',
            color: value === key ? '#fff' : '#555',
            fontWeight: value === key ? 700 : 400,
            whiteSpace: 'nowrap',
          }}
        >
          {icon} {label}
        </button>
      ))}
    </div>
  )
}

export default function TeacherDashboard({ units, onUpdate }) {
  const [activeUnit, setActiveUnit] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleCreateNew = () => {
    setActiveUnit({ id: units.length + 1, name: '新單元', theme: '新主題', words: [] });
  };

  const handleSave = async () => {
    if (!activeUnit) return;
    setLoading(true);
    try {
      await saveWordBank(activeUnit.docId || null, activeUnit);
      alert('儲存成功！');
      await onUpdate();
      setActiveUnit(null);
    } catch (e) {
      alert('儲存失敗：' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (docId) => {
    if (!confirm('確定要刪除這個單元嗎？此操作無法復原。')) return;
    setLoading(true);
    try {
      await deleteWordBank(docId);
      await onUpdate();
      if (activeUnit?.docId === docId) setActiveUnit(null);
    } catch (e) {
      alert('刪除失敗：' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const updateWord = (index, field, value) => {
    const newWords = [...activeUnit.words];
    newWords[index] = { ...newWords[index], [field]: value };
    setActiveUnit({ ...activeUnit, words: newWords });
  };

  const addWord = () => {
    setActiveUnit({
      ...activeUnit,
      words: [...activeUnit.words, { characters: '', zhuyin: [], quizIndices: [], type: 'handwriting' }]
    });
  };

  const removeWord = (index) => {
    setActiveUnit({ ...activeUnit, words: activeUnit.words.filter((_, i) => i !== index) });
  };

  const moveWord = (index, direction) => {
    const newWords = [...activeUnit.words];
    const target = index + direction;
    if (target < 0 || target >= newWords.length) return;
    [newWords[index], newWords[target]] = [newWords[target], newWords[index]];
    setActiveUnit({ ...activeUnit, words: newWords });
  };

  const btnSmall = {
    padding: '4px 8px', fontSize: '0.8rem', border: '1px solid #ddd',
    borderRadius: '6px', background: '#f9f9f9', cursor: 'pointer',
  };

  return (
    <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.1)' }}>
      <h2 style={{ color: '#3a5bd9', marginBottom: '20px' }}>👨‍🏫 教師考題管理專區</h2>

      {!activeUnit ? (
        <div>
          <button className="btn-submit" onClick={handleCreateNew} style={{ marginBottom: '16px' }}>
            + 新增單元
          </button>
          <div className="unit-grid">
            {units.map((u) => (
              <div key={u.docId} className="unit-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontWeight: 'bold' }}>單元 {u.id}: {u.name}</div>
                <div style={{ fontSize: '0.9rem', color: '#666' }}>{u.theme} ({u.words?.length || 0} 題)</div>
                <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                  <button style={{ flex: 1, padding: '6px', background: '#e8eeff', color: '#3a5bd9' }} onClick={() => setActiveUnit(u)}>
                    編輯
                  </button>
                  <button style={{ flex: 1, padding: '6px', background: '#ffeef0', color: '#d93a49' }} onClick={() => handleDelete(u.docId)}>
                    刪除
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Unit meta */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <label style={{ flex: 1, minWidth: '80px' }}>
              單元編號
              <input type="number" value={activeUnit.id}
                onChange={e => setActiveUnit({ ...activeUnit, id: parseInt(e.target.value) })}
                style={{ display: 'block', width: '100%', padding: '8px', marginTop: '4px' }} />
            </label>
            <label style={{ flex: 2, minWidth: '120px' }}>
              單元名稱
              <input value={activeUnit.name}
                onChange={e => setActiveUnit({ ...activeUnit, name: e.target.value })}
                style={{ display: 'block', width: '100%', padding: '8px', marginTop: '4px' }} />
            </label>
            <label style={{ flex: 3, minWidth: '160px' }}>
              單元主題
              <input value={activeUnit.theme}
                onChange={e => setActiveUnit({ ...activeUnit, theme: e.target.value })}
                style={{ display: 'block', width: '100%', padding: '8px', marginTop: '4px' }} />
            </label>
          </div>

          <h3 style={{ borderBottom: '2px solid #eee', paddingBottom: '8px' }}>
            題目列表
            <span style={{ fontSize: '0.8rem', color: '#aaa', fontWeight: 400, marginLeft: '8px' }}>
              可自由混搭題型與順序
            </span>
          </h3>

          {activeUnit.words.map((w, index) => {
            const wordType = w.type || 'handwriting';
            const typeColor = wordType === 'handwriting' ? '#e8eeff' : '#fff7e6';
            const typeBorder = wordType === 'handwriting' ? '#c0cbf5' : '#ffd591';
            return (
              <div key={index} style={{
                background: typeColor, border: `1.5px solid ${typeBorder}`,
                borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px'
              }}>
                {/* Row 1: controls */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ color: '#888', fontSize: '0.9rem', minWidth: '24px' }}>{index + 1}.</span>

                  <TypeToggle value={wordType} onChange={v => updateWord(index, 'type', v)} />

                  <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
                    <button style={btnSmall} onClick={() => moveWord(index, -1)} disabled={index === 0} title="往上移">▲</button>
                    <button style={btnSmall} onClick={() => moveWord(index, 1)} disabled={index === activeUnit.words.length - 1} title="往下移">▼</button>
                    <button
                      onClick={() => removeWord(index)}
                      style={{ ...btnSmall, background: '#fff0f0', color: '#d93a49', border: '1px solid #ffccc7' }}
                    >
                      移除
                    </button>
                  </div>
                </div>

                {/* Row 2: character input & quiz selection */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <label style={{ flex: 1, minWidth: '150px' }}>
                    <span style={{ fontSize: '0.85rem', color: '#555' }}>漢字</span>
                    <input
                      value={w.characters}
                      onChange={e => {
                        const val = e.target.value;
                        updateWord(index, 'characters', val);
                      }}
                      placeholder="如：雄偉"
                      style={{ display: 'block', width: '100%', padding: '6px', marginTop: '4px' }}
                    />
                  </label>

                  <div style={{ flex: 2, minWidth: '200px' }}>
                    <span style={{ fontSize: '0.85rem', color: '#555' }}>點選測驗範圍 (藍色為考試，灰色為標示)</span>
                    <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                      {Array.from(w.characters || '').map((char, charIdx) => {
                        const isActive = !w.quizIndices || w.quizIndices.length === 0 || w.quizIndices.includes(charIdx);
                        return (
                          <div key={charIdx} style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                            <button
                              onClick={() => {
                                let newIndices = w.quizIndices ? [...w.quizIndices] : Array.from({ length: w.characters.length }, (_, i) => i);
                                if (newIndices.includes(charIdx)) {
                                  newIndices = newIndices.filter(i => i !== charIdx);
                                } else {
                                  newIndices.push(charIdx);
                                  newIndices.sort((a, b) => a - b);
                                }
                                updateWord(index, 'quizIndices', newIndices);
                              }}
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '4px',
                                border: isActive ? '2px solid #3a5bd9' : '1px solid #ddd',
                                background: isActive ? '#e8eeff' : '#f5f5f5',
                                color: isActive ? '#3a5bd9' : '#999',
                                fontWeight: isActive ? 700 : 400,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              {char || '?'}
                            </button>
                            {/* Alt characters input */}
                            <input 
                              placeholder="通同字"
                              value={(w.altCharacters || [])[charIdx] || ''}
                              onChange={e => {
                                const newAlts = w.altCharacters ? [...w.altCharacters] : new Array(w.characters.length).fill('');
                                newAlts[charIdx] = e.target.value;
                                updateWord(index, 'altCharacters', newAlts);
                              }}
                              style={{ width: '48px', fontSize: '0.65rem', padding: '2px', textAlign: 'center', border: '1px solid #ddd', borderRadius: '4px' }}
                              title="可填入多個答案，以逗號分隔"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Row 3: zhuyin picker */}
                <div>
                  <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '6px' }}>
                    注音（點選每個字的注音）：
                  </div>
                  <ZhuyinPicker
                    characters={w.characters}
                    zhuyin={w.zhuyin || []}
                    altZhuyin={w.altZhuyin || []}
                    onChange={v => updateWord(index, 'zhuyin', v)}
                    onAltChange={v => updateWord(index, 'altZhuyin', v)}
                  />
                </div>
              </div>
            );
          })}

          <button
            style={{ padding: '12px', background: '#f5f5f5', border: '1px dashed #ccc', color: '#666', borderRadius: '8px' }}
            onClick={addWord}
          >
            + 新增題目
          </button>

          <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
            <button className="btn-submit" style={{ flex: 2 }} onClick={handleSave} disabled={loading}>
              {loading ? '儲存中...' : '💾 儲存單元變更'}
            </button>
            <button className="btn-clear" style={{ flex: 1 }} onClick={() => setActiveUnit(null)}>
              取消並返回
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

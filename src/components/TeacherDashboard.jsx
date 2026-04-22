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
      words: [...activeUnit.words, { characters: '', zhuyin: [], type: 'handwriting' }]
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

                {/* Row 2: character input */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                  <label style={{ flex: 1 }}>
                    <span style={{ fontSize: '0.85rem', color: '#555' }}>漢字</span>
                    <input
                      value={w.characters}
                      onChange={e => updateWord(index, 'characters', e.target.value)}
                      placeholder="如：雄偉"
                      style={{ display: 'block', width: '100%', padding: '6px', marginTop: '4px' }}
                    />
                  </label>
                </div>

                {/* Row 3: zhuyin picker */}
                <div>
                  <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '6px' }}>
                    注音（點選每個字的注音）：
                  </div>
                  <ZhuyinPicker
                    characters={w.characters}
                    zhuyin={w.zhuyin || []}
                    onChange={v => updateWord(index, 'zhuyin', v)}
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

import React, { useState } from 'react';
import { saveWordBank, deleteWordBank } from '../services/dbApi';
import ZhuyinPicker from './ZhuyinPicker';

export default function TeacherDashboard({ units, onUpdate }) {
  const [activeUnit, setActiveUnit] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleCreateNew = () => {
    setActiveUnit({
      id: units.length + 1,
      name: '新單元',
      theme: '新主題',
      words: []
    });
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
    newWords[index][field] = value;
    setActiveUnit({ ...activeUnit, words: newWords });
  };

  const addWord = () => {
    const newWords = [...activeUnit.words, { characters: '', zhuyin: [] }];
    setActiveUnit({ ...activeUnit, words: newWords });
  };

  const removeWord = (index) => {
    const newWords = activeUnit.words.filter((_, i) => i !== index);
    setActiveUnit({ ...activeUnit, words: newWords });
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
                <div style={{ fontSize: '0.9rem', color: '#666' }}>{u.theme} ({u.words?.length || 0} 詞)</div>
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
          <div style={{ display: 'flex', gap: '12px' }}>
            <label style={{ flex: 1 }}>單元編號: <input type="number" value={activeUnit.id} onChange={e => setActiveUnit({...activeUnit, id: parseInt(e.target.value)})} style={{ width: '100%', padding: '8px' }}/></label>
            <label style={{ flex: 2 }}>單元名稱: <input value={activeUnit.name} onChange={e => setActiveUnit({...activeUnit, name: e.target.value})} style={{ width: '100%', padding: '8px' }}/></label>
            <label style={{ flex: 3 }}>單元主題: <input value={activeUnit.theme} onChange={e => setActiveUnit({...activeUnit, theme: e.target.value})} style={{ width: '100%', padding: '8px' }}/></label>
          </div>

          <h3 style={{ marginTop: '16px', borderBottom: '2px solid #eee', paddingBottom: '8px' }}>本單元詞彙列表</h3>
          {activeUnit.words.map((w, index) => (
            <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#f5f5f5', padding: '12px', borderRadius: '8px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                <span style={{ color: '#888', alignSelf: 'center' }}>{index + 1}.</span>
                <label style={{ flex: 1 }}>
                  漢字：
                  <input value={w.characters} onChange={e => updateWord(index, 'characters', e.target.value)} placeholder="如：雄偉" style={{ width: '100%', padding: '6px' }}/>
                </label>
                <button style={{ padding: '6px 12px', background: '#ff4d4f', color: '#fff', borderRadius: '6px', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => removeWord(index)}>
                  移除
                </button>
              </div>
              <div style={{ paddingLeft: '28px' }}>
                <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '4px' }}>注音（點選每個字的注音）：</div>
                <ZhuyinPicker
                  characters={w.characters}
                  zhuyin={w.zhuyin || []}
                  onChange={v => updateWord(index, 'zhuyin', v)}
                />
              </div>
            </div>
          ))}

          <button style={{ padding: '12px', background: '#f5f5f5', border: '1px dashed #ccc', color: '#666' }} onClick={addWord}>
            + 新增詞彙
          </button>

          <div style={{ display: 'flex', gap: '16px', marginTop: '24px' }}>
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

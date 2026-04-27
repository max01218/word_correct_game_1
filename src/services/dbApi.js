import { collection, getDocs, doc, setDoc, deleteDoc, addDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

const COLLECTION_NAME = 'wordBanks';

// 取得全部單元題庫
export const getWordBanks = async () => {
  const snapshot = await getDocs(collection(db, COLLECTION_NAME));
  const units = [];
  snapshot.forEach((doc) => {
    units.push({ docId: doc.id, ...doc.data() });
  });
  // Sort by id if available to keep original order
  return units.sort((a, b) => (a.id || 0) - (b.id || 0));
};

// 儲存/更新單元題庫
export const saveWordBank = async (unitId, unitData) => {
  if (unitId && typeof unitId === 'string' && unitId.length > 5) { // Assuming doc id
    const docRef = doc(db, COLLECTION_NAME, unitId);
    await updateDoc(docRef, unitData);
    return unitId;
  } else {
    // Add new document
    const docRef = await addDoc(collection(db, COLLECTION_NAME), unitData);
    return docRef.id;
  }
};

// 刪除單元題庫
export const deleteWordBank = async (unitId) => {
  const docRef = doc(db, COLLECTION_NAME, unitId);
  await deleteDoc(docRef);
};

// 取得使用者完成進度
export const getUserProgress = async (userId) => {
  if (!userId) return {};
  const dRef = doc(db, 'userProgress', userId);
  const dSnap = await getDoc(dRef);
  if (dSnap.exists()) {
    return dSnap.data().completedUnits || {};
  }
  return {};
};

// 儲存使用者完成進度
export const saveUserProgress = async (userId, unitId) => {
  if (!userId || !unitId) return;
  const dRef = doc(db, 'userProgress', userId);
  const dSnap = await getDoc(dRef);

  const currentProgress = dSnap.exists() ? dSnap.data().completedUnits || {} : {};
  const nextProgress = { ...currentProgress, [unitId]: true };

  await setDoc(dRef, { completedUnits: nextProgress }, { merge: true });
};

// 取得使用者中途存檔 (尚未完成的結果)
export const getPartialResults = async (userId, unitId) => {
  if (!userId || !unitId) return [];
  const dRef = doc(db, 'userProgress', userId);
  const dSnap = await getDoc(dRef);
  if (dSnap.exists()) {
    return (dSnap.data().partialResults || {})[unitId] || [];
  }
  return [];
};

// 儲存使用者中途存檔
export const savePartialResults = async (userId, unitId, results) => {
  if (!userId || !unitId) return;
  const dRef = doc(db, 'userProgress', userId);
  const partial = { [unitId]: results };
  await setDoc(dRef, { partialResults: partial }, { merge: true });
};

// 清除該單元的中途存檔
export const clearPartialResults = async (userId, unitId) => {
  if (!userId || !unitId) return;
  const dRef = doc(db, 'userProgress', userId);
  const dSnap = await getDoc(dRef);
  if (dSnap.exists()) {
    const partials = dSnap.data().partialResults || {};
    delete partials[unitId];
    await setDoc(dRef, { partialResults: partials }, { merge: true });
  }
};

// ======= 錯題本 (Mistakes Bank) API =======

// 取得使用者的錯題陣列
export const getUserMistakes = async (userId) => {
  if (!userId) return [];
  const dRef = doc(db, 'userMistakes', userId);
  const dSnap = await getDoc(dRef);
  if (dSnap.exists()) {
    return dSnap.data().words || [];
  }
  return [];
};

// 新增一個錯題
export const addMistake = async (userId, word) => {
  if (!userId || !word) return;
  const dRef = doc(db, 'userMistakes', userId);
  const dSnap = await getDoc(dRef);

  let words = dSnap.exists() ? dSnap.data().words || [] : [];

  if (!words.some(w => w.characters === word.characters)) {
    const cleanWord = {
      characters: word.characters,
      zhuyin: word.zhuyin,
      type: word.type || 'handwriting',
      quizIndices: word.quizIndices || Array.from({ length: word.characters.length }, (_, i) => i),
      altCharacters: word.altCharacters || [],
      altZhuyin: word.altZhuyin || []
    };
    words.push(cleanWord);
    await setDoc(dRef, { words }, { merge: true });
  }
};

// 移除一個已答對的錯題
export const removeMistake = async (userId, wordChars) => {
  if (!userId || !wordChars) return;
  const dRef = doc(db, 'userMistakes', userId);
  const dSnap = await getDoc(dRef);

  if (dSnap.exists()) {
    let words = dSnap.data().words || [];
    const newWords = words.filter(w => w.characters !== wordChars);
    if (newWords.length !== words.length) {
      await setDoc(dRef, { words: newWords }, { merge: true });
    }
  }
};

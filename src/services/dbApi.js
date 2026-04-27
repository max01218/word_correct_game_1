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

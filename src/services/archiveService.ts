import { collection, addDoc, getDocs, query, doc, setDoc, updateDoc, deleteDoc, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType, sanitizeForFirestore } from '../lib/firebase';
import { AnalysisOutput, ArchivedAnalysis, SettlementOutcome } from '../types';

export const archiveAnalysis = async (analysis: AnalysisOutput, matchInfo?: { homeTeam: string; awayTeam: string; league: string }) => {
  if (!auth.currentUser) return;

  try {
    const docId = analysis.matchId || `slip-${Date.now()}`;
    const docRef = doc(db, 'users', auth.currentUser.uid, 'slips', docId);
    
    const rawData = {
      ...analysis,
      match: matchInfo || { homeTeam: 'Unknown', awayTeam: 'Unknown', league: 'Unknown' },
      userId: auth.currentUser.uid,
      archivedAt: serverTimestamp(),
      outcome: SettlementOutcome.PENDING,
    };

    await setDoc(docRef, sanitizeForFirestore(rawData), { merge: true });
    
    return docId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `users/${auth.currentUser.uid}/slips`);
  }
};

export const getArchivedAnalyses = async () => {
  if (!auth.currentUser) return [];

  try {
    const q = query(
      collection(db, 'users', auth.currentUser.uid, 'slips'),
      orderBy('archivedAt', 'desc'),
      limit(50)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ArchivedAnalysis[];
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `users/${auth.currentUser.uid}/slips`);
    return [];
  }
};

export const settleAnalysis = async (analysisId: string, outcome: SettlementOutcome, finalScore?: string) => {
  if (!auth.currentUser) return;

  try {
    const docRef = doc(db, 'users', auth.currentUser.uid, 'slips', analysisId);
    await updateDoc(docRef, sanitizeForFirestore({
      outcome,
      finalScore,
      settledAt: serverTimestamp(),
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${auth.currentUser.uid}/slips/${analysisId}`);
  }
};

export const deleteAnalysis = async (analysisId: string) => {
  if (!auth.currentUser) return;

  try {
    const docRef = doc(db, 'users', auth.currentUser.uid, 'slips', analysisId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${auth.currentUser.uid}/slips/${analysisId}`);
  }
};

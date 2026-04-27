import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { Analysis } from "@/types";

const COLLECTION = "analyses";

export async function saveAnalysis(
  data: Omit<Analysis, "id" | "createdAt">
): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...data,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
}

export async function getAnalyses(): Promise<Analysis[]> {
  const q = query(collection(db, COLLECTION), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      domain: data.domain,
      jobDescriptionPreview: data.jobDescriptionPreview,
      score: data.score,
      review: data.review,
      matchedKeywords: data.matchedKeywords ?? [],
      missingKeywords: data.missingKeywords ?? [],
      extraKeywords: data.extraKeywords ?? [],
      suggestions: data.suggestions ?? [],
      createdAt: (data.createdAt as Timestamp).toDate(),
    } as Analysis;
  });
}

export async function deleteAnalysis(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}

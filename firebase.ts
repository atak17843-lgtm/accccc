
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy 
} from "firebase/firestore";
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from "firebase/storage";
import { Question } from "./types";

// LÜTFEN BU KISMI KENDİ YAPILANDIRMANIZLA DOLDURUN
const firebaseConfig = {
  apiKey: "AIzaSyBhXBhoPwJC_iP3gFDXB5h2qK5Ry2DKJAo",
  authDomain: "mistakes-548c3.firebaseapp.com",
  projectId: "mistakes-548c3",
  storageBucket: "mistakes-548c3.firebasestorage.app",
  messagingSenderId: "1044794187200",
  appId: "1:1044794187200:web:67c977441b184a5560bc25",
  measurementId: "G-M99FGPB7M5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics only in browser environments
let analytics: any = null;
if (typeof window !== 'undefined') {
  try {
    analytics = getAnalytics(app);
  } catch (err) {
    console.warn('Firebase Analytics not available:', err);
  }
}

export const db = getFirestore(app);
export const storage = getStorage(app);

const QUESTIONS_COLLECTION = "questions";

/**
 * Uploads an image to Firebase Storage and returns the download URL and storage path.
 */
export async function uploadQuestionImage(file: File): Promise<{ url: string; path: string }> {
  const filename = `${Date.now()}_${file.name}`;
  const storagePath = `questions/${filename}`;
  const storageRef = ref(storage, storagePath);
  const snapshot = await uploadBytes(storageRef, file);
  const url = await getDownloadURL(snapshot.ref);
  return { url, path: storagePath };
}

/**
 * Adds a new question to Firestore.
 */
export async function saveQuestion(questionData: Omit<Question, 'id' | 'createdAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, QUESTIONS_COLLECTION), {
    ...questionData,
    createdAt: new Date().toISOString()
  });
  return docRef.id;
}

/**
 * Fetches all questions from Firestore.
 */
export async function fetchQuestions(): Promise<Question[]> {
  const q = query(collection(db, QUESTIONS_COLLECTION), orderBy("createdAt", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Question));
}

/**
 * Updates an existing question (e.g., adding a solution).
 */
export async function updateQuestionInDb(id: string, updates: Partial<Question>): Promise<void> {
  const docRef = doc(db, QUESTIONS_COLLECTION, id);
  await updateDoc(docRef, updates);
}

/**
 * Deletes a question and its associated image from Storage.
 */
export async function removeQuestion(id: string, storagePath: string): Promise<void> {
  // Delete from Firestore
  await deleteDoc(doc(db, QUESTIONS_COLLECTION, id));
  // Delete from Storage
  try {
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);
  } catch (error) {
    console.error("Storage deletion failed or file already gone:", error);
  }
}

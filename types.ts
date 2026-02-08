
export interface Solution {
  draw: string; // Base64 or Storage URL for the drawing overlay
  isCorrect: boolean;
  selected: string;
  date: string;
}

export interface Question {
  id: string;
  imgUrl: string;
  storagePath: string;
  subject: string;
  topic: string;
  answer: string;
  level: number;
  solutions: Solution[];
  createdAt: string;
}

export type ViewMode = 'list' | 'add' | 'solve' | 'history' | 'exam' | 'examResult';

export interface ExamResult {
  question: Question;
  selected: string;
  isCorrect: boolean;
  draw: string;
}

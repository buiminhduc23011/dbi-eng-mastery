import axios from 'axios';

export const api = axios.create({ baseURL: '/api' });

// Session cookie expired or was removed: send the user back to the password gate.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url: string = error?.config?.url ?? '';
    if (status === 401 && !url.startsWith('/auth/') && !window.location.pathname.startsWith('/login')) {
      const next = window.location.pathname + window.location.search;
      window.location.replace('/login?next=' + encodeURIComponent(next));
    }
    return Promise.reject(error);
  },
);

export interface VocabCard {
  id: number;
  term: string;
  phonetic: string;
  partOfSpeech: string;
  meaningVi: string;
  definitionEn: string;
  exampleSentence: string;
  clozeSentence: string;
  clozeHint: string;
  category: string;
  repetition: number;
  intervalDays: number;
  easeFactor: number;
  nextReviewDate: string;
  mistakeCount: number;
  lastReviewedAt: string | null;
  status: string;
  consecutiveTypingPasses?: number;
}

export interface UpsertCard {
  term: string;
  phonetic: string;
  partOfSpeech: string;
  meaningVi: string;
  definitionEn: string;
  exampleSentence: string;
  clozeSentence: string;
  clozeHint: string;
  category: string;
}

export interface SentenceDrill {
  id: number;
  category: string;
  promptVi: string;
  targetEn: string;
  alternativesEn: string[];
  keywords: string[];
  grammarNote: string;
  practiceCount: number;
  lastScore: number;
  nextReviewDate: string;
}

export interface DrillResult {
  score: number;
  keywordsMatched: number;
  keywordsTotal: number;
  similarity: number;
  matchedWords: string[];
  missedWords: string[];
  targetEn: string;
  alternativesEn: string[];
  grammarNote: string;
}

export interface ForecastDay {
  date: string;
  count: number;
}

export interface Leech {
  id: number;
  term: string;
  meaningVi: string;
  mistakeCount: number;
  category: string;
}

export interface HeatmapDay {
  date: string;
  count: number;
}

export interface Dashboard {
  streak: number;
  cardsDue: number;
  drillsDue: number;
  masteredCount: number;
  totalCards: number;
  todayReviewed: number;
  dailyTarget: number;
  aiCallsToday: number;
  forecast: ForecastDay[];
  leeches: Leech[];
  heatmap: HeatmapDay[];
  totalReviewedLastYear: number;
}

export interface AiSentenceResult {
  corrected: string;
  grammarScore: number;
  naturalnessScore: number;
  feedback: string;
  casualVersions: string[];
  professionalVersions: string[];
  usedAi: boolean;
}

export interface AiPolishResult {
  businessEnglish: string;
  casualEnglish: string;
  vocabulary: { term: string; meaningVi: string; exampleSentence: string }[];
  usedAi: boolean;
}

export const emptyCard: UpsertCard = {
  term: '',
  phonetic: '',
  partOfSpeech: 'noun',
  meaningVi: '',
  definitionEn: '',
  exampleSentence: '',
  clozeSentence: '',
  clozeHint: '',
  category: 'Daily & Casual',
};

export function scoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-500';
  if (score >= 60) return 'text-amber-500';
  return 'text-red-500';
}

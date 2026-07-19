export type Page = 'home' | 'learn' | 'practice' | 'review' | 'stats' | 'settings'
export type Difficulty = '基礎' | '標準' | '応用' | '時事'
export type QuestionType = 'single' | 'multiple' | 'trueFalse' | 'fill' | 'matching'

export interface Chapter {
  id: number
  title: string
  shortTitle: string
  icon: string
  color: string
  summary: string
  keyPoints: string[]
}

export interface Choice {
  id: string
  text: string
  explanation: string
}

export interface MatchPair {
  left: string
  right: string
}

export interface Source {
  title: string
  url: string
  checkedAt: string
}

export interface Question {
  id: string
  chapterId: number
  type: QuestionType
  difficulty: Difficulty
  prompt: string
  choices?: Choice[]
  correctChoiceIds?: string[]
  acceptedAnswers?: string[]
  matchPairs?: MatchPair[]
  explanation: string
  relatedTerms: string[]
  memoryTip: string
  source: Source
  updatedAt: string
}

export interface Attempt {
  questionId: string
  attempts: number
  correct: number
  lastAnsweredAt: string
  dueAt: string
  intervalLevel: number
  bookmarked: boolean
}

export interface StudyState {
  attempts: Record<string, Attempt>
  studyDates: string[]
  currentStreak: number
  bestStreak: number
  dailyCount: number
}

export type Answer = string[] | string | Record<string, string>

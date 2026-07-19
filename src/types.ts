export type Page = 'home' | 'learn' | 'practice' | 'mock' | 'review' | 'stats' | 'settings' | 'admin'
export type Difficulty = '基礎' | '標準' | '応用' | '時事'
export type QuestionType = 'single' | 'multiple' | 'trueFalse' | 'fill' | 'matching'
export type Importance = '頻出' | '要暗記' | '補足'

export interface LessonCheck {
  prompt: string
  answer: boolean
  explanation: string
}

export interface LessonSection {
  id: string
  title: string
  lead: string
  body: string[]
  importance: Importance
  terms: string[]
  example: string
  examTip: string
  detail?: string
  check: LessonCheck
  source: Source
}

export interface Chapter {
  id: number
  title: string
  shortTitle: string
  icon: string
  color: string
  summary: string
  keyPoints: string[]
  lessonSections: LessonSection[]
  diagram: { label: string; detail: string }[]
  commonMistakes: string[]
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
  completedSections: string[]
  sectionChecks: Record<string, boolean>
  lessonBookmarks: string[]
  lessonHighlights: string[]
  lessonNotes: Record<string, string>
  termMastery: Record<string, 0 | 1 | 2>
  chapterScores: Record<string, number>
  reading: {
    fontSize: 'small' | 'medium' | 'large'
    lineSpacing: 'normal' | 'wide'
    furigana: boolean
  }
}

export type Answer = string[] | string | Record<string, string>

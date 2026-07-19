import type { Attempt, StudyState } from '../types'

const STORAGE_KEY = 'ecotore-study-state-v1'

export const defaultStudyState: StudyState = {
  attempts: {},
  studyDates: [],
  currentStreak: 0,
  bestStreak: 0,
  dailyCount: 10,
}

const localDate = (date = new Date()) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const dayDiff = (a: string, b: string) => {
  const one = new Date(`${a}T00:00:00`).getTime()
  const two = new Date(`${b}T00:00:00`).getTime()
  return Math.round((two - one) / 86_400_000)
}

export function loadStudyState(): StudyState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultStudyState
    const parsed = JSON.parse(raw) as StudyState
    return {
      ...defaultStudyState,
      ...parsed,
      attempts: parsed.attempts ?? {},
      studyDates: parsed.studyDates ?? [],
    }
  } catch {
    return defaultStudyState
  }
}

export function saveStudyState(state: StudyState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function recordAnswer(state: StudyState, questionId: string, isCorrect: boolean): StudyState {
  const now = new Date()
  const today = localDate(now)
  const previous = state.attempts[questionId]
  const nextLevel = isCorrect ? Math.min((previous?.intervalLevel ?? 0) + 1, 4) : 0
  const intervals = [1, 3, 7, 14, 30]
  const due = new Date(now)
  due.setDate(due.getDate() + intervals[nextLevel])

  const attempt: Attempt = {
    questionId,
    attempts: (previous?.attempts ?? 0) + 1,
    correct: (previous?.correct ?? 0) + (isCorrect ? 1 : 0),
    lastAnsweredAt: now.toISOString(),
    dueAt: due.toISOString(),
    intervalLevel: nextLevel,
    bookmarked: previous?.bookmarked ?? false,
  }

  const studyDates = state.studyDates.includes(today) ? state.studyDates : [...state.studyDates, today].sort()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const previousDate = state.studyDates.at(-1)
  let currentStreak = state.currentStreak
  if (!state.studyDates.includes(today)) {
    currentStreak = previousDate === localDate(yesterday) ? state.currentStreak + 1 : 1
  }

  return {
    ...state,
    attempts: { ...state.attempts, [questionId]: attempt },
    studyDates,
    currentStreak,
    bestStreak: Math.max(state.bestStreak, currentStreak),
  }
}

export function toggleBookmark(state: StudyState, questionId: string): StudyState {
  const previous = state.attempts[questionId]
  const attempt: Attempt = previous ?? {
    questionId,
    attempts: 0,
    correct: 0,
    lastAnsweredAt: '',
    dueAt: new Date().toISOString(),
    intervalLevel: 0,
    bookmarked: false,
  }
  return {
    ...state,
    attempts: {
      ...state.attempts,
      [questionId]: { ...attempt, bookmarked: !attempt.bookmarked },
    },
  }
}

export function calculateStreak(dates: string[]) {
  if (!dates.length) return 0
  const sorted = [...new Set(dates)].sort().reverse()
  const today = localDate()
  const startGap = dayDiff(sorted[0], today)
  if (startGap > 1) return 0
  let streak = 1
  for (let i = 0; i < sorted.length - 1; i += 1) {
    if (dayDiff(sorted[i + 1], sorted[i]) === 1) streak += 1
    else break
  }
  return streak
}

export function exportStudyState(state: StudyState) {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `ecotore-backup-${localDate()}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

export async function importStudyState(file: File): Promise<StudyState> {
  const parsed = JSON.parse(await file.text()) as StudyState
  if (!parsed || typeof parsed !== 'object' || !parsed.attempts || !Array.isArray(parsed.studyDates)) {
    throw new Error('エコトレのバックアップファイルではありません。')
  }
  return { ...defaultStudyState, ...parsed }
}

export function resetStudyState() {
  localStorage.removeItem(STORAGE_KEY)
}

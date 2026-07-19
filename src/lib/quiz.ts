import { chapters } from '../data/chapters'
import type { Answer, Question, StudyState } from '../types'

const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, '').normalize('NFKC')

export function isAnswerCorrect(question: Question, answer: Answer): boolean {
  if (question.type === 'fill') {
    const value = typeof answer === 'string' ? normalize(answer) : ''
    return Boolean(value && question.acceptedAnswers?.some((accepted) => normalize(accepted) === value))
  }

  if (question.type === 'matching') {
    if (Array.isArray(answer) || typeof answer === 'string') return false
    return Boolean(question.matchPairs?.every((pair) => answer[pair.left] === pair.right))
  }

  const selected = Array.isArray(answer) ? [...answer].sort() : []
  const correct = [...(question.correctChoiceIds ?? [])].sort()
  return selected.length === correct.length && selected.every((id, index) => id === correct[index])
}

export function chapterAccuracy(state: StudyState, chapterId: number, allQuestions: Question[]) {
  const ids = new Set(allQuestions.filter((q) => q.chapterId === chapterId).map((q) => q.id))
  const attempts = Object.values(state.attempts).filter((attempt) => ids.has(attempt.questionId))
  const total = attempts.reduce((sum, attempt) => sum + attempt.attempts, 0)
  const correct = attempts.reduce((sum, attempt) => sum + attempt.correct, 0)
  return total ? Math.round((correct / total) * 100) : null
}

export function overallStats(state: StudyState) {
  const attempts = Object.values(state.attempts)
  const total = attempts.reduce((sum, attempt) => sum + attempt.attempts, 0)
  const correct = attempts.reduce((sum, attempt) => sum + attempt.correct, 0)
  return {
    total,
    correct,
    accuracy: total ? Math.round((correct / total) * 100) : 0,
    answered: attempts.filter((attempt) => attempt.attempts > 0).length,
  }
}

export function dueQuestions(state: StudyState, allQuestions: Question[]) {
  const now = Date.now()
  return allQuestions.filter((question) => {
    const attempt = state.attempts[question.id]
    if (!attempt) return false
    return attempt.bookmarked || attempt.correct < attempt.attempts || new Date(attempt.dueAt).getTime() <= now
  })
}

export function weakChapterIds(state: StudyState, allQuestions: Question[]) {
  return chapters
    .map((chapter) => ({ id: chapter.id, accuracy: chapterAccuracy(state, chapter.id, allQuestions) }))
    .filter((item): item is { id: number; accuracy: number } => item.accuracy !== null)
    .sort((a, b) => a.accuracy - b.accuracy)
    .map((item) => item.id)
}

export function selectDailyQuestions(state: StudyState, allQuestions: Question[], count: number) {
  const due = dueQuestions(state, allQuestions)
  const weakIds = weakChapterIds(state, allQuestions)
  const unseen = allQuestions.filter((question) => !state.attempts[question.id])
  const remaining = allQuestions.filter((question) => !due.some((item) => item.id === question.id))
  const weighted = [...remaining].sort((a, b) => {
    const aUnseen = unseen.some((item) => item.id === a.id) ? 0 : 1
    const bUnseen = unseen.some((item) => item.id === b.id) ? 0 : 1
    if (aUnseen !== bUnseen) return aUnseen - bUnseen
    return weakIds.indexOf(a.chapterId) - weakIds.indexOf(b.chapterId)
  })
  return [...due, ...weighted].filter((q, index, array) => array.findIndex((item) => item.id === q.id) === index).slice(0, count)
}

export function shuffled<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5)
}

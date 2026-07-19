import type { Question } from '../types'

const headers = ['id', 'chapterId', 'type', 'difficulty', 'prompt', 'choices', 'correctChoiceIds', 'acceptedAnswers', 'matchPairs', 'explanation', 'relatedTerms', 'memoryTip', 'sourceTitle', 'sourceUrl', 'checkedAt', 'updatedAt'] as const

const escapeCell = (value: unknown) => {
  const text = typeof value === 'string' ? value : JSON.stringify(value ?? '')
  return `"${text.replace(/"/g, '""')}"`
}

export function questionsToCsv(questions: Question[]) {
  const rows = questions.map((question) => [
    question.id,
    question.chapterId,
    question.type,
    question.difficulty,
    question.prompt,
    question.choices ?? [],
    question.correctChoiceIds ?? [],
    question.acceptedAnswers ?? [],
    question.matchPairs ?? [],
    question.explanation,
    question.relatedTerms,
    question.memoryTip,
    question.source.title,
    question.source.url,
    question.source.checkedAt,
    question.updatedAt,
  ].map(escapeCell).join(','))
  return `\uFEFF${[headers.join(','), ...rows].join('\r\n')}`
}

function parseRows(text: string) {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    if (quoted && char === '"' && text[index + 1] === '"') {
      cell += '"'; index += 1
    } else if (char === '"') quoted = !quoted
    else if (char === ',' && !quoted) { row.push(cell); cell = '' }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[index + 1] === '\n') index += 1
      row.push(cell); rows.push(row); row = []; cell = ''
    } else cell += char
  }
  if (cell || row.length) { row.push(cell); rows.push(row) }
  return rows.filter((item) => item.some(Boolean))
}

const json = <T,>(value: string, fallback: T): T => {
  if (!value) return fallback
  try { return JSON.parse(value) as T } catch { return fallback }
}

export function csvToQuestions(text: string): Question[] {
  const rows = parseRows(text.replace(/^\uFEFF/, ''))
  const first = rows.shift()
  if (!first || headers.some((header) => !first.includes(header))) throw new Error('CSVのヘッダーが完成版の形式と一致しません。')
  const index = Object.fromEntries(first.map((header, position) => [header, position]))
  return rows.map((row) => ({
    id: row[index.id],
    chapterId: Number(row[index.chapterId]),
    type: row[index.type] as Question['type'],
    difficulty: row[index.difficulty] as Question['difficulty'],
    prompt: row[index.prompt],
    choices: json(row[index.choices], []),
    correctChoiceIds: json(row[index.correctChoiceIds], []),
    acceptedAnswers: json(row[index.acceptedAnswers], []),
    matchPairs: json(row[index.matchPairs], []),
    explanation: row[index.explanation],
    relatedTerms: json(row[index.relatedTerms], []),
    memoryTip: row[index.memoryTip],
    source: { title: row[index.sourceTitle], url: row[index.sourceUrl], checkedAt: row[index.checkedAt] },
    updatedAt: row[index.updatedAt],
  }))
}

export function validateQuestion(question: Question) {
  const errors: string[] = []
  if (!question.id.trim()) errors.push('IDが未入力')
  if (!question.prompt.trim()) errors.push('問題文が未入力')
  if (!question.explanation.trim()) errors.push('解説が未入力')
  if (!Number.isInteger(question.chapterId) || question.chapterId < 1 || question.chapterId > 10) errors.push('章番号が不正')
  if (!/^https:\/\//.test(question.source.url)) errors.push('出典URLはhttps://で入力')
  if (question.type === 'fill' && !question.acceptedAnswers?.length) errors.push('穴埋めの正答が未設定')
  if (question.type === 'matching' && !question.matchPairs?.length) errors.push('対応問題の組合せが未設定')
  if (!['fill', 'matching'].includes(question.type) && (!question.choices?.length || !question.correctChoiceIds?.length)) errors.push('選択肢または正答が未設定')
  return errors
}

export function downloadText(content: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const anchor = document.createElement('a')
  anchor.href = url; anchor.download = filename; anchor.click()
  URL.revokeObjectURL(url)
}

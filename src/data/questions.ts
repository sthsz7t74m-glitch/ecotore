import type { Choice, Difficulty, Question } from '../types'
import { knowledgeByChapter, sourceCatalog, type KnowledgeSeed } from './knowledge'

const updatedAt = '2026-07-19'
const prefixes: Record<number, string> = { 1: 'BAS', 2: 'CLI', 3: 'ENE', 4: 'BIO', 5: 'POL', 6: 'CIR', 7: 'LAW', 8: 'ESG', 9: 'LIF', 10: 'NOW' }
const defaultSources: Record<number, string> = { 1: 'basics', 2: 'climate', 3: 'energy', 4: 'biodiversity', 5: 'pollution', 6: 'circular', 7: 'law', 8: 'esg', 9: 'ethical', 10: 'ndc2025' }

const difficultyFor = (chapterId: number, variant: number, seedIndex: number): Difficulty => {
  if (chapterId === 10) return '時事'
  const levels: Difficulty[] = ['基礎', '標準', '基礎', '応用', '標準']
  if (seedIndex > Math.floor((knowledgeByChapter[chapterId].length * 2) / 3) && variant > 1) return '応用'
  return levels[variant]
}

const sourceFor = (chapterId: number, item: KnowledgeSeed) => sourceCatalog[item.sourceKey ?? defaultSources[chapterId]]
const choice = (id: string, text: string, explanation: string): Choice => ({ id, text, explanation })

function buildSeedQuestions(chapterId: number, item: KnowledgeSeed, seedIndex: number, chapterSeeds: KnowledgeSeed[]): Question[] {
  const get = (offset: number) => chapterSeeds[(seedIndex + offset) % chapterSeeds.length]
  const next = get(1)
  const third = get(2)
  const fourth = get(3)
  const fifth = get(4)
  const base = seedIndex * 5
  const makeId = (variant: number) => `${prefixes[chapterId]}-${String(base + variant + 1).padStart(3, '0')}`
  const source = sourceFor(chapterId, item)
  const common = {
    chapterId,
    relatedTerms: [item.term, next.term, third.term],
    memoryTip: item.tip,
    source,
    updatedAt,
  }

  const termChoices = [item, next, third, fourth].map((candidate, index) => choice(
    String.fromCharCode(97 + index),
    candidate.term,
    candidate.term === item.term ? `正しい。「${item.term}」は、${item.definition}を指します。` : `誤り。「${candidate.term}」は、${candidate.definition}を指します。`,
  ))

  const trueStatement = seedIndex % 2 === 0
  const statementTerm = trueStatement ? item.term : next.term
  const trueFalseChoices = [
    choice('true', '○', trueStatement ? `正しい。${item.term}の説明と一致します。` : `誤り。この説明は${item.term}であり、${next.term}ではありません。`),
    choice('false', '×', trueStatement ? `誤り。${item.term}の説明として正しい内容です。` : `正しい。説明と用語が一致していません。`),
  ]

  const pairChoices = [
    choice('a', `${item.term}：${item.definition}`, '正しい組合せです。'),
    choice('b', `${next.term}：${next.definition}`, '正しい組合せです。'),
    choice('c', `${third.term}：${fourth.definition}`, `誤り。${third.term}は「${third.definition}」です。`),
    choice('d', `${fourth.term}：${fifth.definition}`, `誤り。${fourth.term}は「${fourth.definition}」です。`),
  ]

  return [
    {
      ...common,
      id: makeId(0),
      type: 'single',
      difficulty: difficultyFor(chapterId, 0, seedIndex),
      prompt: `次の説明に最も当てはまる用語はどれですか。「${item.definition}」`,
      choices: termChoices,
      correctChoiceIds: ['a'],
      explanation: `正解は「${item.term}」です。${item.definition}を意味します。似た用語も、対象・目的・手段の違いで整理しましょう。`,
    },
    {
      ...common,
      id: makeId(1),
      type: 'trueFalse',
      difficulty: difficultyFor(chapterId, 1, seedIndex),
      prompt: `「${statementTerm}」とは、${item.definition}を指す。`,
      choices: trueFalseChoices,
      correctChoiceIds: [trueStatement ? 'true' : 'false'],
      explanation: `${item.term}とは、${item.definition}を指します。${trueStatement ? '問題文は用語と説明が一致しています。' : `問題文の説明に当てはまるのは「${item.term}」であり、「${next.term}」ではありません。`}`,
    },
    {
      ...common,
      id: makeId(2),
      type: 'fill',
      difficulty: difficultyFor(chapterId, 2, seedIndex),
      prompt: `「${item.definition}」に当てはまる用語を入力してください。`,
      acceptedAnswers: [item.term, item.term.replace(/[・＋]/g, '')],
      explanation: `答えは「${item.term}」です。定義は「${item.definition}」です。`,
    },
    {
      ...common,
      id: makeId(3),
      type: 'multiple',
      difficulty: difficultyFor(chapterId, 3, seedIndex),
      prompt: `用語と説明の組合せとして正しいものをすべて選んでください。テーマは「${item.term}」です。`,
      choices: pairChoices,
      correctChoiceIds: ['a', 'b'],
      explanation: `「${item.term}」と「${next.term}」の組合せが正解です。誤りの選択肢は、別の用語の説明が入れ替わっています。`,
    },
    {
      ...common,
      id: makeId(4),
      type: 'matching',
      difficulty: difficultyFor(chapterId, 4, seedIndex),
      prompt: `「${item.term}」と関連する3つの用語を、それぞれの説明に対応させてください。`,
      matchPairs: [item, next, third].map((candidate) => ({ left: candidate.term, right: candidate.definition })),
      explanation: `各用語の対象を整理すると、${item.term}・${next.term}・${third.term}を区別できます。`,
    },
  ]
}

export const questions: Question[] = Object.entries(knowledgeByChapter).flatMap(([chapter, seeds]) => {
  const chapterId = Number(chapter)
  return seeds.flatMap((item, index) => buildSeedQuestions(chapterId, item, index, seeds))
})

export const questionCountByChapter = Object.fromEntries(
  Object.keys(knowledgeByChapter).map((chapter) => [Number(chapter), questions.filter((question) => question.chapterId === Number(chapter)).length]),
)

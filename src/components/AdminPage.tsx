import { useMemo, useRef, useState } from 'react'
import { ChevronLeft, Copy, Download, FileJson, Plus, Search, Trash2, Upload } from 'lucide-react'
import { chapters } from '../data/chapters'
import { questions as publishedQuestions } from '../data/questions'
import { csvToQuestions, downloadText, questionsToCsv, validateQuestion } from '../lib/questionCsv'
import type { Difficulty, Question, QuestionType } from '../types'

const STORAGE_KEY = 'ecotore-admin-drafts-v1'
const today = () => new Date().toISOString().slice(0, 10)
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const blankQuestion = (): Question => ({
  id: `CUSTOM-${Date.now()}`,
  chapterId: 1,
  type: 'single',
  difficulty: '標準',
  prompt: '',
  choices: [
    { id: 'a', text: '', explanation: '' },
    { id: 'b', text: '', explanation: '' },
    { id: 'c', text: '', explanation: '' },
    { id: 'd', text: '', explanation: '' },
  ],
  correctChoiceIds: ['a'],
  acceptedAnswers: [],
  matchPairs: [],
  explanation: '',
  relatedTerms: [],
  memoryTip: '',
  source: { title: '', url: 'https://', checkedAt: today() },
  updatedAt: today(),
})

function loadDrafts() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) as Question[] : clone(publishedQuestions)
  } catch { return clone(publishedQuestions) }
}

export function AdminPage({ onBack }: { onBack: () => void }) {
  const [drafts, setDrafts] = useState<Question[]>(loadDrafts)
  const [selectedId, setSelectedId] = useState(drafts[0]?.id ?? '')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const selected = drafts.find((question) => question.id === selectedId)
  const filtered = useMemo(() => drafts.filter((question) => `${question.id} ${question.prompt}`.toLowerCase().includes(query.toLowerCase())), [drafts, query])
  const visible = filtered.slice(page * 30, page * 30 + 30)
  const invalidCount = useMemo(() => drafts.filter((question) => validateQuestion(question).length).length, [drafts])

  const save = (next: Question[]) => { setDrafts(next); localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) }
  const update = (patch: Partial<Question>) => {
    if (!selected) return
    save(drafts.map((question) => question.id === selected.id ? { ...question, ...patch, updatedAt: today() } : question))
  }
  const add = () => { const question = blankQuestion(); save([question, ...drafts]); setSelectedId(question.id); setPage(0) }
  const duplicate = () => {
    if (!selected) return
    const question = { ...clone(selected), id: `${selected.id}-COPY-${Date.now().toString().slice(-4)}`, updatedAt: today() }
    save([question, ...drafts]); setSelectedId(question.id)
  }
  const remove = () => {
    if (!selected || !confirm(`${selected.id} を削除しますか？`)) return
    const next = drafts.filter((question) => question.id !== selected.id); save(next); setSelectedId(next[0]?.id ?? '')
  }
  const importCsv = async (file?: File) => {
    if (!file) return
    try {
      const imported = csvToQuestions(await file.text())
      if (!confirm(`${imported.length}問を読み込み、現在の編集データを置き換えますか？`)) return
      save(imported); setSelectedId(imported[0]?.id ?? ''); setPage(0)
    } catch (error) { alert(error instanceof Error ? error.message : 'CSVを読み込めませんでした。') }
  }

  return (
    <div className="admin-page page-stack">
      <div className="admin-toolbar">
        <button className="back-button" onClick={onBack}><ChevronLeft /> 設定へ戻る</button>
        <div className="admin-actions">
          <button onClick={add}><Plus /> 新規</button>
          <button onClick={() => inputRef.current?.click()}><Upload /> CSV取込</button>
          <button onClick={() => downloadText(questionsToCsv(drafts), 'ecotore-questions.csv', 'text/csv;charset=utf-8')}><Download /> CSV出力</button>
          <button onClick={() => downloadText(JSON.stringify(drafts, null, 2), 'ecotore-questions.json', 'application/json')}><FileJson /> 公開JSON</button>
          <input ref={inputRef} type="file" accept=".csv,text/csv" hidden onChange={(event) => importCsv(event.target.files?.[0])} />
        </div>
      </div>
      <div className="admin-summary"><strong>{drafts.length}問</strong><span>{invalidCount ? `${invalidCount}問に入力エラー` : '全問題の必須項目を確認済み'}</span><small>編集内容はこのブラウザに保存されます</small></div>
      <div className="admin-layout">
        <aside className="admin-list">
          <label className="admin-search"><Search size={17} /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(0) }} placeholder="ID・問題文を検索" /></label>
          <div>{visible.map((question) => {
            const errors = validateQuestion(question)
            return <button key={question.id} className={question.id === selectedId ? 'selected' : ''} onClick={() => setSelectedId(question.id)}><strong>{question.id}</strong><span>{question.prompt || '問題文未入力'}</span><small>{chapters[question.chapterId - 1]?.shortTitle}・{errors.length ? `エラー${errors.length}` : question.difficulty}</small></button>
          })}</div>
          <div className="admin-pagination"><button disabled={page === 0} onClick={() => setPage((value) => value - 1)}>前へ</button><span>{page + 1}/{Math.max(1, Math.ceil(filtered.length / 30))}</span><button disabled={(page + 1) * 30 >= filtered.length} onClick={() => setPage((value) => value + 1)}>次へ</button></div>
        </aside>
        {selected ? <QuestionEditor question={selected} onUpdate={update} onDuplicate={duplicate} onDelete={remove} /> : <div className="empty-state"><span>📝</span><h2>問題を選択してください</h2></div>}
      </div>
    </div>
  )
}

function QuestionEditor({ question, onUpdate, onDuplicate, onDelete }: { question: Question; onUpdate: (patch: Partial<Question>) => void; onDuplicate: () => void; onDelete: () => void }) {
  const errors = validateQuestion(question)
  const jsonField = (key: 'choices' | 'matchPairs', value: string) => {
    try { onUpdate({ [key]: JSON.parse(value) } as Partial<Question>) } catch { alert('JSONの形式が正しくありません。') }
  }
  return (
    <section className="question-editor">
      <div className="editor-heading"><div><small>QUESTION EDITOR</small><h2>{question.id}</h2></div><div><button onClick={onDuplicate}><Copy />複製</button><button className="danger-action" onClick={onDelete}><Trash2 />削除</button></div></div>
      {errors.length > 0 && <div className="validation-box"><strong>入力を確認してください</strong>{errors.map((error) => <span key={error}>{error}</span>)}</div>}
      <div className="editor-grid">
        <label><span>問題ID（履歴維持のため変更不可）</span><input value={question.id} readOnly /></label>
        <label><span>章</span><select value={question.chapterId} onChange={(event) => onUpdate({ chapterId: Number(event.target.value) })}>{chapters.map((chapter) => <option value={chapter.id} key={chapter.id}>{chapter.id}. {chapter.shortTitle}</option>)}</select></label>
        <label><span>形式</span><select value={question.type} onChange={(event) => onUpdate({ type: event.target.value as QuestionType })}>{(['single', 'multiple', 'trueFalse', 'fill', 'matching'] as QuestionType[]).map((type) => <option key={type}>{type}</option>)}</select></label>
        <label><span>難易度</span><select value={question.difficulty} onChange={(event) => onUpdate({ difficulty: event.target.value as Difficulty })}>{(['基礎', '標準', '応用', '時事'] as Difficulty[]).map((level) => <option key={level}>{level}</option>)}</select></label>
      </div>
      <label><span>問題文</span><textarea value={question.prompt} onChange={(event) => onUpdate({ prompt: event.target.value })} /></label>
      <label><span>解説</span><textarea value={question.explanation} onChange={(event) => onUpdate({ explanation: event.target.value })} /></label>
      <label><span>選択肢JSON</span><textarea className="code-input" defaultValue={JSON.stringify(question.choices ?? [], null, 2)} key={`${question.id}-choices`} onBlur={(event) => jsonField('choices', event.target.value)} /></label>
      <div className="editor-grid">
        <label><span>正答ID（カンマ区切り）</span><input value={(question.correctChoiceIds ?? []).join(',')} onChange={(event) => onUpdate({ correctChoiceIds: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} /></label>
        <label><span>穴埋め正答（カンマ区切り）</span><input value={(question.acceptedAnswers ?? []).join(',')} onChange={(event) => onUpdate({ acceptedAnswers: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} /></label>
      </div>
      <label><span>対応問題JSON</span><textarea className="code-input" defaultValue={JSON.stringify(question.matchPairs ?? [], null, 2)} key={`${question.id}-pairs`} onBlur={(event) => jsonField('matchPairs', event.target.value)} /></label>
      <div className="editor-grid">
        <label><span>出典名</span><input value={question.source.title} onChange={(event) => onUpdate({ source: { ...question.source, title: event.target.value } })} /></label>
        <label><span>出典URL</span><input value={question.source.url} onChange={(event) => onUpdate({ source: { ...question.source, url: event.target.value } })} /></label>
        <label><span>確認日</span><input type="date" value={question.source.checkedAt} onChange={(event) => onUpdate({ source: { ...question.source, checkedAt: event.target.value } })} /></label>
        <label><span>関連用語（カンマ区切り）</span><input value={question.relatedTerms.join(',')} onChange={(event) => onUpdate({ relatedTerms: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} /></label>
      </div>
      <label><span>覚え方</span><input value={question.memoryTip} onChange={(event) => onUpdate({ memoryTip: event.target.value })} /></label>
      <div className="admin-preview"><small>プレビュー</small><strong>{question.prompt || '問題文がここに表示されます'}</strong><p>{question.explanation || '解説がここに表示されます'}</p></div>
    </section>
  )
}

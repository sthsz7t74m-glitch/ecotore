import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BarChart3,
  BookOpen,
  Bookmark,
  BookmarkCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  Database,
  Download,
  Flame,
  Home,
  Leaf,
  ListChecks,
  RefreshCcw,
  RotateCcw,
  Settings,
  Sparkles,
  Target,
  Upload,
  X,
} from 'lucide-react'
import { AdminPage } from './components/AdminPage'
import { chapters } from './data/chapters'
import { questions } from './data/questions'
import {
  chapterAccuracy,
  dueQuestions,
  isAnswerCorrect,
  overallStats,
  selectDailyQuestions,
  shuffled,
  weakChapterIds,
} from './lib/quiz'
import {
  calculateStreak,
  defaultStudyState,
  exportStudyState,
  importStudyState,
  loadStudyState,
  recordAnswer,
  resetStudyState,
  saveStudyState,
  toggleBookmark,
} from './lib/storage'
import type { Answer, Page, Question, StudyState } from './types'

type QuizMode = 'practice' | 'mock'

interface QuizConfig {
  title: string
  mode: QuizMode
  questions: Question[]
  timeLimitMinutes?: number
}

const APP_VERSION = 'v1.0.0'

const navItems: { id: Page; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'ホーム', icon: Home },
  { id: 'learn', label: '教材', icon: BookOpen },
  { id: 'practice', label: '演習', icon: ListChecks },
  { id: 'review', label: '復習', icon: RotateCcw },
  { id: 'stats', label: '成績', icon: BarChart3 },
]

const emptyAnswerFor = (question: Question): Answer => {
  if (question.type === 'fill') return ''
  if (question.type === 'matching') return {}
  return []
}

const hasAnswer = (question: Question, answer: Answer) => {
  if (question.type === 'fill') return typeof answer === 'string' && answer.trim().length > 0
  if (question.type === 'matching') {
    return !Array.isArray(answer) && typeof answer !== 'string' && Object.keys(answer).length === question.matchPairs?.length
  }
  return Array.isArray(answer) && answer.length > 0
}

function App() {
  const [page, setPage] = useState<Page>('home')
  const [studyState, setStudyState] = useState<StudyState>(() => loadStudyState())
  const [quiz, setQuiz] = useState<QuizConfig | null>(null)
  const [selectedChapterId, setSelectedChapterId] = useState<number | null>(null)

  useEffect(() => saveStudyState(studyState), [studyState])

  const stats = useMemo(() => overallStats(studyState), [studyState])
  const due = useMemo(() => dueQuestions(studyState, questions), [studyState])
  const weakIds = useMemo(() => weakChapterIds(studyState, questions), [studyState])

  const startQuiz = (list: Question[], mode: QuizMode, title: string, timeLimitMinutes?: number) => {
    if (!list.length) return
    setQuiz({ title, mode, questions: list, timeLimitMinutes })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const navigate = (next: Page) => {
    setQuiz(null)
    setSelectedChapterId(null)
    setPage(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleRecord = (questionId: string, correct: boolean) => {
    setStudyState((current) => recordAnswer(current, questionId, correct))
  }

  const handleBookmark = (questionId: string) => {
    setStudyState((current) => toggleBookmark(current, questionId))
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => navigate('home')} aria-label="ホームへ">
          <span className="brand-mark"><Leaf size={22} /></span>
          <span><strong>エコトレ</strong><small>環境社会を、楽しく。</small></span>
        </button>
        <div className="top-actions">
          <span className="prototype-badge">全520問・完成版</span>
          <span className="version-badge" title={`アプリバージョン ${APP_VERSION}`}>{APP_VERSION}</span>
          <button className="icon-button" onClick={() => navigate('settings')} aria-label="設定">
            <Settings size={21} />
          </button>
        </div>
      </header>

      <main className="main-content">
        {quiz ? (
          <QuizSession
            key={`${quiz.title}-${quiz.questions.map((q) => q.id).join('-')}`}
            config={quiz}
            studyState={studyState}
            onClose={() => setQuiz(null)}
            onRecord={handleRecord}
            onBookmark={handleBookmark}
          />
        ) : page === 'home' ? (
          <HomePage
            state={studyState}
            stats={stats}
            dueCount={due.length}
            weakIds={weakIds}
            onNavigate={navigate}
            onDaily={() => startQuiz(selectDailyQuestions(studyState, questions, studyState.dailyCount), 'practice', `今日の${studyState.dailyCount}問`)}
            onMock={() => navigate('mock')}
          />
        ) : page === 'learn' ? (
          <LearnPage
            state={studyState}
            selectedId={selectedChapterId}
            onSelect={setSelectedChapterId}
            onStart={(id) => startQuiz(questions.filter((q) => q.chapterId === id), 'practice', `${chapters.find((c) => c.id === id)?.shortTitle} 確認問題`)}
          />
        ) : page === 'practice' ? (
          <PracticePage onStart={startQuiz} />
        ) : page === 'mock' ? (
          <MockPage state={studyState} weakIds={weakIds} onStart={startQuiz} />
        ) : page === 'review' ? (
          <ReviewPage state={studyState} due={due} onStart={startQuiz} />
        ) : page === 'stats' ? (
          <StatsPage state={studyState} />
        ) : page === 'admin' ? (
          <AdminPage onBack={() => navigate('settings')} />
        ) : (
          <SettingsPage state={studyState} onChange={setStudyState} onAdmin={() => navigate('admin')} />
        )}
      </main>

      {!quiz && (
        <nav className="bottom-nav" aria-label="メインナビゲーション">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <button key={item.id} className={page === item.id ? 'active' : ''} onClick={() => navigate(item.id)}>
                <Icon size={21} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>
      )}
    </div>
  )
}

function HomePage({
  state,
  stats,
  dueCount,
  weakIds,
  onNavigate,
  onDaily,
  onMock,
}: {
  state: StudyState
  stats: ReturnType<typeof overallStats>
  dueCount: number
  weakIds: number[]
  onNavigate: (page: Page) => void
  onDaily: () => void
  onMock: () => void
}) {
  const weakChapter = chapters.find((chapter) => chapter.id === weakIds[0])
  return (
    <div className="page-stack">
      <section className="hero-card">
        <div className="hero-copy">
          <span className="eyebrow"><Sparkles size={16} /> 今日の学習</span>
          <h1>まずは{state.dailyCount}問、<br />気軽に始めよう。</h1>
          <p>{dueCount ? `復習したい問題が${dueCount}問あります。優先して出題します。` : '未回答の分野からバランスよく出題します。'}</p>
          <button className="primary-button hero-button" onClick={onDaily}>
            今日の{state.dailyCount}問を始める <ChevronRight size={20} />
          </button>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="planet">🌍</div>
          <span className="float-leaf leaf-one">🌿</span>
          <span className="float-leaf leaf-two">☀️</span>
          <span className="float-leaf leaf-three">💧</span>
        </div>
      </section>

      <section className="stat-grid" aria-label="学習状況">
        <StatCard icon={<Target />} label="総合正答率" value={`${stats.accuracy}%`} color="green" />
        <StatCard icon={<ListChecks />} label="解答数" value={`${stats.total}問`} color="blue" />
        <StatCard icon={<Flame />} label="連続学習" value={`${calculateStreak(state.studyDates)}日`} color="yellow" />
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div><span className="eyebrow">QUICK START</span><h2>学習メニュー</h2></div>
        </div>
        <div className="action-grid">
          <button className="action-card learn" onClick={() => onNavigate('learn')}>
            <span className="action-icon"><BookOpen /></span><span><strong>教材から学ぶ</strong><small>要点を読んで確認問題へ</small></span><ChevronRight />
          </button>
          <button className="action-card practice" onClick={() => onNavigate('practice')}>
            <span className="action-icon"><ListChecks /></span><span><strong>問題演習</strong><small>分野と問題数を選ぶ</small></span><ChevronRight />
          </button>
          <button className="action-card mock" onClick={onMock}>
            <span className="action-icon"><Target /></span><span><strong>模擬試験</strong><small>100問・90分／短縮模試</small></span><ChevronRight />
          </button>
          <button className="action-card review" onClick={() => onNavigate('review')}>
            <span className="action-icon"><RotateCcw /></span><span><strong>復習する</strong><small>{dueCount ? `${dueCount}問が復習待ち` : '復習待ちはありません'}</small></span><ChevronRight />
          </button>
        </div>
      </section>

      <section className="insight-card">
        <div className="insight-icon"><BarChart3 /></div>
        <div>
          <span className="eyebrow">LEARNING INSIGHT</span>
          <h3>{stats.total ? (weakChapter ? `${weakChapter.shortTitle}を復習すると伸びそうです` : 'バランスよく学習できています') : '最初の10問で得意・苦手を分析します'}</h3>
          <p>{stats.total ? '正答率と復習期限から、次に取り組む問題を自動で選びます。' : '回答データはこの端末の中だけに保存されます。'}</p>
        </div>
      </section>

      <p className="disclaimer">本サイトは独自作成の非公式学習アプリです。東京商工会議所その他の団体による公認・提携サービスではありません。</p>
    </div>
  )
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return <div className={`stat-card ${color}`}><span className="stat-icon">{icon}</span><span><small>{label}</small><strong>{value}</strong></span></div>
}

function LearnPage({ state, selectedId, onSelect, onStart }: { state: StudyState; selectedId: number | null; onSelect: (id: number | null) => void; onStart: (id: number) => void }) {
  const chapter = chapters.find((item) => item.id === selectedId)
  if (chapter) {
    const chapterQuestions = questions.filter((q) => q.chapterId === chapter.id)
    return (
      <div className="page-stack">
        <button className="back-button" onClick={() => onSelect(null)}><ChevronLeft /> 章一覧へ</button>
        <section className="chapter-detail" style={{ '--chapter-color': chapter.color } as React.CSSProperties}>
          <div className="chapter-detail-title"><span>{chapter.icon}</span><div><small>CHAPTER {chapter.id}</small><h1>{chapter.title}</h1></div></div>
          <p>{chapter.summary}</p>
          <div className="keypoint-box">
            <h3>この章のキーワード</h3>
            <div>{chapter.keyPoints.map((point) => <span key={point}>{point}</span>)}</div>
          </div>
          <div className="lesson-diagram" aria-label="この章の全体像">
            {chapter.diagram.map((item, index) => <div key={item.label}><span>{index + 1}</span><strong>{item.label}</strong><small>{item.detail}</small></div>)}
          </div>
          <div className="lesson-copy">
            {chapter.lessonSections.map((section) => <section key={section.title}><h2>{section.title}</h2><p>{section.body}</p></section>)}
          </div>
          <button className="primary-button full-button" onClick={() => onStart(chapter.id)}>確認問題{chapterQuestions.length}問を始める <ChevronRight /></button>
          <div className="question-preview-list">
            {chapterQuestions.slice(0, 5).map((q, i) => <div key={q.id}><span>{i + 1}</span><p>{q.prompt}</p><small>{q.difficulty}</small></div>)}
            <div className="question-more"><span>＋</span><p>ほか{Math.max(0, chapterQuestions.length - 5)}問を収録</p><small>全{chapterQuestions.length}問</small></div>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="page-stack">
      <PageTitle eyebrow="LEARN" title="分野別に学ぶ" description="10章の要点と図解を読み、全520問の確認問題へ進みます。" />
      <div className="chapter-grid">
        {chapters.map((item) => {
          const accuracy = chapterAccuracy(state, item.id, questions)
          return (
            <button key={item.id} className="chapter-card" onClick={() => onSelect(item.id)} style={{ '--chapter-color': item.color } as React.CSSProperties}>
              <span className="chapter-number">{String(item.id).padStart(2, '0')}</span>
              <span className="chapter-emoji">{item.icon}</span>
              <strong>{item.shortTitle}</strong>
              <small>{item.keyPoints.join('・')}</small>
              <div className="chapter-progress"><span style={{ width: `${accuracy ?? 0}%` }} /><em>{accuracy === null ? '未学習' : `正答率 ${accuracy}%`}</em></div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function PracticePage({ onStart }: { onStart: (list: Question[], mode: QuizMode, title: string) => void }) {
  const [chapterId, setChapterId] = useState('all')
  const [difficulty, setDifficulty] = useState('all')
  const [questionType, setQuestionType] = useState('all')
  const [count, setCount] = useState(10)
  const [mode, setMode] = useState<QuizMode>('practice')
  const available = questions.filter((question) => {
    if (chapterId !== 'all' && question.chapterId !== Number(chapterId)) return false
    if (difficulty !== 'all' && question.difficulty !== difficulty) return false
    if (questionType !== 'all' && question.type !== questionType) return false
    return true
  })
  const actualCount = Math.min(count, available.length)
  const selectedChapter = chapters.find((c) => c.id === Number(chapterId))
  return (
    <div className="page-stack">
      <PageTitle eyebrow="PRACTICE" title="問題演習" description="分野・問題数・学習方法を選んで始めます。" />
      <section className="form-card">
        <label><span>出題分野</span><select value={chapterId} onChange={(e) => setChapterId(e.target.value)}><option value="all">全10分野</option>{chapters.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select></label>
        <div className="filter-grid">
          <label><span>難易度</span><select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}><option value="all">すべて</option>{(['基礎', '標準', '応用', '時事'] as const).map((item) => <option key={item}>{item}</option>)}</select></label>
          <label><span>問題形式</span><select value={questionType} onChange={(e) => setQuestionType(e.target.value)}><option value="all">すべて</option><option value="single">単一選択</option><option value="multiple">複数選択</option><option value="trueFalse">○×</option><option value="fill">穴埋め</option><option value="matching">用語対応</option></select></label>
          <label><span>問題数</span><select value={count} onChange={(e) => setCount(Number(e.target.value))}>{[5, 10, 20, 30, 50, 100].map((n) => <option key={n} value={n}>{n}問</option>)}</select></label>
        </div>
        <fieldset><legend>回答後の表示</legend><button className={mode === 'practice' ? 'selected' : ''} onClick={() => setMode('practice')}><Check /> 1問ごとに解説</button><button className={mode === 'mock' ? 'selected' : ''} onClick={() => setMode('mock')}><Target /> 最後にまとめて採点</button></fieldset>
        <div className="start-summary"><span>{selectedChapter?.icon ?? '🌈'}</span><div><strong>{selectedChapter?.shortTitle ?? '全分野'}から{actualCount}問</strong><small>{mode === 'practice' ? '回答直後に詳しい解説を表示します' : 'すべて回答した後に採点します'}</small></div></div>
        <button className="primary-button full-button" disabled={!available.length} onClick={() => onStart(shuffled(available).slice(0, actualCount), mode, `${selectedChapter?.shortTitle ?? '全分野'} ${actualCount}問`)}>{available.length ? '演習を始める' : '条件に合う問題がありません'} <ChevronRight /></button>
      </section>
    </div>
  )
}

function MockPage({ state, weakIds, onStart }: { state: StudyState; weakIds: number[]; onStart: (list: Question[], mode: QuizMode, title: string, timeLimitMinutes?: number) => void }) {
  const mockEligible = questions.filter((question) => ['single', 'multiple', 'trueFalse'].includes(question.type))
  const weakQuestions = weakIds.length ? mockEligible.filter((question) => weakIds.slice(0, 3).includes(question.chapterId)) : mockEligible
  const currentQuestions = mockEligible.filter((question) => question.difficulty === '時事' || question.chapterId === 10)
  const answered = Object.keys(state.attempts).length
  const cards = [
    { icon: '🏁', title: '本番想定フル模試', text: '100問・90分・70点以上で合格', count: 100, minutes: 90, pool: mockEligible },
    { icon: '⚡', title: '10問ミニ模試', text: '短時間で全分野を確認', count: 10, minutes: 12, pool: mockEligible },
    { icon: '📝', title: '30問模試', text: '分野横断で実力を測定', count: 30, minutes: 30, pool: mockEligible },
    { icon: '🎯', title: '苦手分野模試', text: answered ? '正答率の低い3分野から出題' : '学習後に苦手分野へ最適化', count: 30, minutes: 30, pool: weakQuestions },
    { icon: '📰', title: '環境時事模試', text: '政策更新と分野横断問題', count: Math.min(30, currentQuestions.length), minutes: 30, pool: currentQuestions },
  ]
  return (
    <div className="page-stack">
      <PageTitle eyebrow="MOCK EXAM" title="模擬試験" description="模試中は正解を表示せず、終了後に採点と全問解説を確認できます。" />
      <div className="mock-grid">{cards.map((card) => <button key={card.title} className="mock-card" onClick={() => onStart(shuffled(card.pool).slice(0, card.count), 'mock', card.title, card.minutes)}><span>{card.icon}</span><div><strong>{card.title}</strong><p>{card.text}</p><small><Clock3 size={14} /> 制限時間 {card.minutes}分</small></div><ChevronRight /></button>)}</div>
      <div className="mock-note"><Target /><div><strong>採点基準</strong><p>100点満点換算で70点以上を合格表示します。実際の試験は多肢選択式・90分です。</p></div></div>
    </div>
  )
}

function ReviewPage({ state, due, onStart }: { state: StudyState; due: Question[]; onStart: (list: Question[], mode: QuizMode, title: string) => void }) {
  const bookmarked = questions.filter((q) => state.attempts[q.id]?.bookmarked)
  const wrong = questions.filter((q) => { const a = state.attempts[q.id]; return a && a.correct < a.attempts })
  return (
    <div className="page-stack">
      <PageTitle eyebrow="REVIEW" title="復習する" description="間違えた問題や、忘れかけた問題を優先して出題します。" />
      <div className="review-summary">
        <ReviewCard icon={<RefreshCcw />} label="今日の復習" count={due.length} color="green" onClick={() => onStart(due, 'practice', '今日の復習')} />
        <ReviewCard icon={<CircleAlert />} label="間違えた問題" count={wrong.length} color="orange" onClick={() => onStart(wrong, 'practice', '間違えた問題')} />
        <ReviewCard icon={<Bookmark />} label="要復習" count={bookmarked.length} color="blue" onClick={() => onStart(bookmarked, 'practice', '要復習問題')} />
      </div>
      {!due.length ? <EmptyState icon="🌱" title="復習待ちはありません" text="問題を解くと、正誤と経過日数から復習タイミングを決めます。" /> : <div className="review-list">{due.map((q) => <QuestionListItem key={q.id} question={q} state={state} />)}</div>}
    </div>
  )
}

function ReviewCard({ icon, label, count, color, onClick }: { icon: React.ReactNode; label: string; count: number; color: string; onClick: () => void }) {
  return <button className={`review-card ${color}`} onClick={onClick} disabled={!count}><span>{icon}</span><strong>{count}<small>問</small></strong><em>{label}</em><ChevronRight /></button>
}

function QuestionListItem({ question, state }: { question: Question; state: StudyState }) {
  const chapter = chapters.find((c) => c.id === question.chapterId)!
  const attempt = state.attempts[question.id]
  return <div className="question-list-item"><span>{chapter.icon}</span><div><small>{question.id}・{chapter.shortTitle}</small><p>{question.prompt}</p></div><strong>{attempt ? `${attempt.correct}/${attempt.attempts}` : '未回答'}</strong></div>
}

function StatsPage({ state }: { state: StudyState }) {
  const stats = overallStats(state)
  return (
    <div className="page-stack">
      <PageTitle eyebrow="RESULTS" title="学習成績" description="分野別の正答率から、次に復習する場所を見つけます。" />
      <section className="score-hero"><div className="score-ring" style={{ '--score': `${stats.accuracy * 3.6}deg` } as React.CSSProperties}><span><strong>{stats.accuracy}</strong><small>%</small></span></div><div><small>総合正答率</small><h2>{stats.total ? '学習データを分析中' : 'まだデータがありません'}</h2><p>累計 {stats.total}問中 {stats.correct}問正解・{stats.answered}種類に挑戦</p></div></section>
      <section className="section-block"><div className="section-heading"><div><span className="eyebrow">BY CATEGORY</span><h2>分野別正答率</h2></div></div><div className="accuracy-list">{chapters.map((chapter) => { const accuracy = chapterAccuracy(state, chapter.id, questions); return <div key={chapter.id}><span className="accuracy-icon">{chapter.icon}</span><div><p><strong>{chapter.shortTitle}</strong><em>{accuracy === null ? '未学習' : `${accuracy}%`}</em></p><div className="bar"><span style={{ width: `${accuracy ?? 0}%`, background: chapter.color }} /></div></div></div> })}</div></section>
      <section className="mini-stat-grid"><div><Flame /><strong>{calculateStreak(state.studyDates)}日</strong><small>現在の連続学習</small></div><div><Target /><strong>{state.bestStreak}日</strong><small>最長連続学習</small></div><div><BookOpen /><strong>{state.studyDates.length}日</strong><small>累計学習日</small></div></section>
    </div>
  )
}

function SettingsPage({ state, onChange, onAdmin }: { state: StudyState; onChange: (state: StudyState) => void; onAdmin: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const importFile = async (file?: File) => {
    if (!file) return
    try { const next = await importStudyState(file); onChange(next); alert('学習履歴を読み込みました。') }
    catch (error) { alert(error instanceof Error ? error.message : '読み込みに失敗しました。') }
  }
  const reset = () => {
    if (!confirm('この端末の学習履歴をすべて削除しますか？')) return
    resetStudyState(); onChange(defaultStudyState)
  }
  return (
    <div className="page-stack">
      <PageTitle eyebrow="SETTINGS" title="設定" description="今日の問題数と、この端末の学習データを管理します。" />
      <section className="settings-card"><h2>今日の問題</h2><label><span><strong>出題数</strong><small>ホーム画面から始める問題数</small></span><select value={state.dailyCount} onChange={(e) => onChange({ ...state, dailyCount: Number(e.target.value) })}>{[5, 10, 20, 30].map((n) => <option key={n} value={n}>{n}問</option>)}</select></label></section>
      <section className="settings-card"><h2>学習データ</h2><button onClick={() => exportStudyState(state)}><Download /> <span><strong>バックアップを書き出す</strong><small>JSONファイルとして保存</small></span><ChevronRight /></button><button onClick={() => inputRef.current?.click()}><Upload /> <span><strong>バックアップを読み込む</strong><small>別端末の履歴を取り込む</small></span><ChevronRight /></button><input ref={inputRef} type="file" accept="application/json" hidden onChange={(e) => importFile(e.target.files?.[0])} /><button className="danger-action" onClick={reset}><RefreshCcw /> <span><strong>学習履歴をリセット</strong><small>この操作は取り消せません</small></span><ChevronRight /></button></section>
      <section className="settings-card"><h2>問題管理</h2><button onClick={onAdmin}><Database /> <span><strong>問題エディターを開く</strong><small>CSV入出力・編集・複製・検証・公開JSON</small></span><ChevronRight /></button></section>
      <section className="about-card"><Leaf /><div><strong>エコトレ 完成版 {APP_VERSION}</strong><p>全520問を収録。学習履歴と編集データは外部へ送信されず、このブラウザ内に保存されます。</p></div></section>
    </div>
  )
}

function QuizSession({ config, studyState, onClose, onRecord, onBookmark }: { config: QuizConfig; studyState: StudyState; onClose: () => void; onRecord: (id: string, correct: boolean) => void; onBookmark: (id: string) => void }) {
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, Answer>>({})
  const [submitted, setSubmitted] = useState(false)
  const [finished, setFinished] = useState(false)
  const [recordedMock, setRecordedMock] = useState(false)
  const [reviewMode, setReviewMode] = useState(false)
  const [remainingSeconds, setRemainingSeconds] = useState(() => (config.timeLimitMinutes ?? 0) * 60)
  const question = config.questions[index]
  const answer = answers[question.id] ?? emptyAnswerFor(question)
  const correct = submitted ? isAnswerCorrect(question, answer) : false

  useEffect(() => {
    if (config.mode !== 'mock' || !config.timeLimitMinutes || finished || reviewMode) return
    const timer = window.setInterval(() => setRemainingSeconds((current) => {
      if (current <= 1) { window.clearInterval(timer); setFinished(true); return 0 }
      return current - 1
    }), 1000)
    return () => window.clearInterval(timer)
  }, [config.mode, config.timeLimitMinutes, finished, reviewMode])

  useEffect(() => {
    if (!finished || config.mode !== 'mock' || recordedMock) return
    config.questions.forEach((item) => onRecord(item.id, isAnswerCorrect(item, answers[item.id] ?? emptyAnswerFor(item))))
    setRecordedMock(true)
  }, [answers, config.mode, config.questions, finished, onRecord, recordedMock])

  const updateAnswer = (next: Answer) => setAnswers((current) => ({ ...current, [question.id]: next }))

  const submit = () => {
    if (!hasAnswer(question, answer)) return
    if (config.mode === 'practice') {
      const result = isAnswerCorrect(question, answer)
      onRecord(question.id, result)
      setSubmitted(true)
    } else {
      goNext()
    }
  }

  const goNext = () => {
    if (index < config.questions.length - 1) {
      setIndex((value) => value + 1)
      setSubmitted(reviewMode)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else setFinished(true)
  }

  const finishMock = () => {
    setFinished(true)
  }

  if (finished) {
    const results = config.questions.map((item) => ({ question: item, correct: isAnswerCorrect(item, answers[item.id] ?? emptyAnswerFor(item)) }))
    const score = results.filter((item) => item.correct).length
    const scorePercent = Math.round((score / results.length) * 100)
    return (
      <div className="quiz-results page-stack">
        <section className="result-hero"><span>{scorePercent >= 70 ? '🎉' : '🌱'}</span><small>{config.title}</small><h1>{scorePercent}<em> / 100点</em></h1><p>{score} / {results.length}問正解・{scorePercent >= 70 ? '合格ライン達成！' : '70点までの差を復習しましょう。'}</p></section>
        <div className="result-list">{results.map((item, i) => <div key={item.question.id} className={item.correct ? 'correct' : 'wrong'}><span>{item.correct ? <Check /> : <X />}</span><div><small>問題{i + 1}・{item.question.id}</small><p>{item.question.prompt}</p></div></div>)}</div>
        <div className="result-actions"><button className="secondary-button" onClick={() => { setReviewMode(true); setIndex(0); setFinished(false); setSubmitted(true) }}>解説を確認する</button><button className="primary-button" onClick={onClose}>ホームへ戻る</button></div>
      </div>
    )
  }

  const bookmarked = studyState.attempts[question.id]?.bookmarked
  const timerText = `${String(Math.floor(remainingSeconds / 60)).padStart(2, '0')}:${String(remainingSeconds % 60).padStart(2, '0')}`
  return (
    <div className="quiz-page">
      <div className="quiz-header"><button className="icon-button" onClick={onClose}><X /></button><div><strong>{config.title}</strong><span><i style={{ width: `${((index + 1) / config.questions.length) * 100}%` }} /></span></div><em>{config.timeLimitMinutes && !reviewMode ? <b className={remainingSeconds < 300 ? 'timer-warning' : ''}><Clock3 size={13} />{timerText}</b> : `${index + 1}/${config.questions.length}`}</em></div>
      <section className="question-card">
        <div className="question-meta"><span>CHAPTER {question.chapterId}</span><span>{question.difficulty}</span><span>{question.id}</span></div>
        <h1>{question.prompt}</h1>
        <AnswerField question={question} answer={answer} disabled={submitted} onChange={updateAnswer} />
        {submitted && <Explanation question={question} answer={answer} correct={correct} bookmarked={Boolean(bookmarked)} onBookmark={() => onBookmark(question.id)} />}
      </section>
      <div className="quiz-footer">
        {config.mode === 'mock' && index > 0 && <button className="secondary-button compact" onClick={() => { setIndex((v) => v - 1); setSubmitted(reviewMode) }}><ChevronLeft /> 前へ</button>}
        {!submitted ? <button className="primary-button grow" disabled={!hasAnswer(question, answer)} onClick={config.mode === 'mock' && index === config.questions.length - 1 ? finishMock : submit}>{config.mode === 'mock' ? (index === config.questions.length - 1 ? '採点する' : '次の問題へ') : '回答する'} <ChevronRight /></button> : <button className="primary-button grow" onClick={goNext}>{index === config.questions.length - 1 ? '結果を見る' : '次の問題へ'} <ChevronRight /></button>}
      </div>
    </div>
  )
}

function AnswerField({ question, answer, disabled, onChange }: { question: Question; answer: Answer; disabled: boolean; onChange: (answer: Answer) => void }) {
  if (question.type === 'fill') return <div className="fill-answer"><input autoFocus value={typeof answer === 'string' ? answer : ''} disabled={disabled} onChange={(e) => onChange(e.target.value)} placeholder="答えを入力" /><small>表記ゆれは一部許容されます</small></div>
  if (question.type === 'matching') {
    const current = !Array.isArray(answer) && typeof answer !== 'string' ? answer : {}
    const options = question.matchPairs?.map((pair) => pair.right) ?? []
    return <div className="matching-answer">{question.matchPairs?.map((pair) => <label key={pair.left}><strong>{pair.left}</strong><select value={current[pair.left] ?? ''} disabled={disabled} onChange={(e) => onChange({ ...current, [pair.left]: e.target.value })}><option value="">対応する説明を選ぶ</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>)}</div>
  }
  const selected = Array.isArray(answer) ? answer : []
  const multiple = question.type === 'multiple'
  return <div className="choice-list">{multiple && <p className="multi-note">当てはまるものをすべて選んでください</p>}{question.choices?.map((choice, choiceIndex) => { const active = selected.includes(choice.id); return <button key={choice.id} className={active ? 'selected' : ''} disabled={disabled} onClick={() => onChange(multiple ? (active ? selected.filter((id) => id !== choice.id) : [...selected, choice.id]) : [choice.id])}><span>{question.type === 'trueFalse' ? choice.text : String.fromCharCode(65 + choiceIndex)}</span><strong>{question.type === 'trueFalse' ? (choice.id === 'true' ? '正しい' : '誤り') : choice.text}</strong>{active && <Check />}</button> })}</div>
}

function Explanation({ question, answer, correct, bookmarked, onBookmark }: { question: Question; answer: Answer; correct: boolean; bookmarked: boolean; onBookmark: () => void }) {
  const report = async () => {
    const text = `エコトレ 問題の誤り報告\n問題ID: ${question.id}\n内容: `
    try { await navigator.clipboard.writeText(text); alert('報告用テンプレートをコピーしました。') } catch { alert(`問題ID: ${question.id}`) }
  }
  const correctTexts = question.type === 'fill' ? question.acceptedAnswers?.slice(0, 1) : question.type === 'matching' ? question.matchPairs?.map((pair) => `${pair.left} → ${pair.right}`) : question.choices?.filter((choice) => question.correctChoiceIds?.includes(choice.id)).map((choice) => choice.text)
  return (
    <div className={`explanation ${correct ? 'correct' : 'wrong'}`}>
      <div className="answer-result"><span>{correct ? <Check /> : <X />}</span><div><small>{correct ? '正解です！' : 'おしい！正解を確認しよう'}</small><strong>正解：{correctTexts?.join('／')}</strong></div></div>
      <div className="explanation-body"><h2>解説</h2><p>{question.explanation}</p>{question.choices && <div className="option-explanations">{question.choices.map((choice, i) => <div key={choice.id}><span>{String.fromCharCode(65 + i)}</span><p>{choice.explanation}</p></div>)}</div>}<div className="memory-box"><Sparkles /><div><strong>覚え方</strong><p>{question.memoryTip}</p></div></div><div className="related-terms"><strong>関連用語</strong>{question.relatedTerms.map((term) => <span key={term}>{term}</span>)}</div><div className="source-box"><small>出典・確認日 {question.source.checkedAt}</small><a href={question.source.url} target="_blank" rel="noreferrer">{question.source.title} ↗</a><em>問題更新日 {question.updatedAt}</em></div></div>
      <div className="explanation-actions"><button onClick={onBookmark}>{bookmarked ? <BookmarkCheck /> : <Bookmark />} {bookmarked ? '要復習に登録済み' : '要復習にする'}</button><button onClick={report}><CircleAlert /> 誤りを報告</button></div>
    </div>
  )
}

function PageTitle({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div className="page-title"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>
}

function EmptyState({ icon, title, text }: { icon: string; title: string; text: string }) {
  return <div className="empty-state"><span>{icon}</span><h2>{title}</h2><p>{text}</p></div>
}

export default App

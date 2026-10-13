import { useEffect, useRef, useState } from 'react'
import './App.css'

type Lesson = {
  id: string
  title: string
  setting: string
  level: string
  prompt: string
  phrase: string
  translation: string
  romanization: string
  note: string
  answers: string[]
  correctAnswer: string
}

type Section = 'today' | 'dialogue' | 'shadowing' | 'phrases'

const lessons: Lesson[] = [
  {
    id: 'cafe',
    title: '在咖啡店點餐',
    setting: 'CAFE / 03 句',
    level: '入門',
    prompt: '想禮貌地點一杯冰美式，怎麼說？',
    phrase: '아이스 아메리카노 한 잔 주세요.',
    translation: '請給我一杯冰美式。',
    romanization: 'Aiseu amerikano han jan juseyo.',
    note: '「주세요」是禮貌地請對方給你某樣東西。點餐時把品項放在前面就很自然。',
    answers: ['아이스 아메리카노 한 잔 주세요.', '아이스 아메리카노 한 잔 있어요?', '아이스 아메리카노 한 잔 먹어요.'],
    correctAnswer: '아이스 아메리카노 한 잔 주세요.',
  },
  {
    id: 'directions',
    title: '在街上問路',
    setting: 'AROUND TOWN / 04 句',
    level: '入門',
    prompt: '想問弘大入口站在哪裡，怎麼說？',
    phrase: '홍대역이 어디예요?',
    translation: '弘大入口站在哪裡呢？',
    romanization: 'Hongdae-yeogi eodiyeyo?',
    note: '「어디예요?」是詢問地點的自然說法。對不熟悉的人可以在句首加上「실례합니다」。',
    answers: ['홍대역이 어디예요?', '홍대역에 가고 싶어요.', '홍대역을 만났어요.'],
    correctAnswer: '홍대역이 어디예요?',
  },
  {
    id: 'friends',
    title: '和朋友聊近況',
    setting: 'CASUAL CHAT / 02 句',
    level: '初中級',
    prompt: '想問朋友「你最近過得怎麼樣？」怎麼說？',
    phrase: '요즘 어떻게 지내?',
    translation: '你最近過得怎麼樣？',
    romanization: 'Yojeum eotteoke jinae?',
    note: '這是對朋友使用的半語。和不熟的人或長輩交談時，改說「요즘 어떻게 지내세요?」更合適。',
    answers: ['요즘 어떻게 지내?', '오늘 뭐 먹을래?', '어디에서 왔어요?'],
    correctAnswer: '요즘 어떻게 지내?',
  },
]

const sections: { id: Section; label: string; number: string }[] = [
  { id: 'today', label: '今日練習', number: '01' },
  { id: 'dialogue', label: '情境對話', number: '02' },
  { id: 'shadowing', label: '跟讀練習', number: '03' },
  { id: 'phrases', label: '我的表達', number: '04' },
]

const todayLabel = new Intl.DateTimeFormat('zh-TW', { month: 'long', day: 'numeric', weekday: 'long' }).format(new Date())

function readSavedList(key: string): string[] {
  try {
    const saved = localStorage.getItem(key)
    return saved ? (JSON.parse(saved) as string[]) : []
  } catch {
    return []
  }
}

function App() {
  const [section, setSection] = useState<Section>('today')
  const [lessonId, setLessonId] = useState(lessons[0].id)
  const [slowPlayback, setSlowPlayback] = useState(false)
  const [voiceMessage, setVoiceMessage] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [recordingUrl, setRecordingUrl] = useState('')
  const [recordingMessage, setRecordingMessage] = useState('')
  const [favorites, setFavorites] = useState<string[]>(() => readSavedList('one-phrase-favorites'))
  const [completed, setCompleted] = useState<string[]>(() => readSavedList('one-phrase-completed'))
  const [answer, setAnswer] = useState('')
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recordingRef = useRef<HTMLAudioElement | null>(null)
  const lesson = lessons.find((item) => item.id === lessonId) ?? lessons[0]
  const isFavorite = favorites.includes(lesson.id)
  const isCompleted = completed.includes(lesson.id)

  useEffect(() => () => {
    window.speechSynthesis?.cancel()
    streamRef.current?.getTracks().forEach((track) => track.stop())
    if (recordingUrl) URL.revokeObjectURL(recordingUrl)
  }, [recordingUrl])

  function selectLesson(id: string) {
    setLessonId(id)
    setAnswer('')
    setVoiceMessage('')
    setRecordingMessage('')
  }

  function playPhrase(rate = slowPlayback ? 0.68 : 0.92) {
    if (!('speechSynthesis' in window)) {
      setVoiceMessage('這個瀏覽器不支援韓文語音播放。')
      return
    }

    const koreanVoice = window.speechSynthesis.getVoices().find((voice) => voice.lang.toLowerCase().startsWith('ko'))
    if (!koreanVoice) {
      setVoiceMessage('目前裝置沒有可用的韓文語音，仍可跟著文字練習。')
      return
    }

    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(lesson.phrase)
    utterance.lang = koreanVoice.lang
    utterance.voice = koreanVoice
    utterance.rate = rate
    utterance.onstart = () => setVoiceMessage('正在播放韓文發音')
    utterance.onend = () => setVoiceMessage('')
    utterance.onerror = () => setVoiceMessage('語音播放未能完成，請再試一次。')
    window.speechSynthesis.speak(utterance)
  }

  async function toggleRecording() {
    if (isRecording) {
      recorderRef.current?.stop()
      setIsRecording(false)
      return
    }

    if (!navigator.mediaDevices?.getUserMedia || !('MediaRecorder' in window)) {
      setRecordingMessage('這個瀏覽器不支援錄音；你仍可播放韓文並自行跟讀。')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const recorder = new MediaRecorder(stream)
      const chunks: BlobPart[] = []
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data)
      }
      recorder.onstop = () => {
        const audio = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' })
        setRecordingUrl((previousUrl) => {
          if (previousUrl) URL.revokeObjectURL(previousUrl)
          return URL.createObjectURL(audio)
        })
        stream.getTracks().forEach((track) => track.stop())
        streamRef.current = null
        setRecordingMessage('錄音只保存在這個頁面中。聽聽看自己的語調和節奏。')
      }
      recorderRef.current = recorder
      recorder.start()
      setIsRecording(true)
      setRecordingMessage('正在錄音，再按一次即可停止。')
    } catch {
      setRecordingMessage('無法使用麥克風。請檢查瀏覽器權限，或先直接跟讀練習。')
    }
  }

  function toggleFavorite() {
    const next = isFavorite ? favorites.filter((id) => id !== lesson.id) : [...favorites, lesson.id]
    setFavorites(next)
    localStorage.setItem('one-phrase-favorites', JSON.stringify(next))
  }

  function markComplete() {
    if (isCompleted) return
    const next = [...completed, lesson.id]
    setCompleted(next)
    localStorage.setItem('one-phrase-completed', JSON.stringify(next))
  }

  function renderPracticeTools() {
    return (
      <div className="practice-tools">
        <div className="audio-controls" aria-label="韓文發音控制">
          <button className="play-button" type="button" onClick={() => playPhrase()} aria-label="播放韓文發音">
            <span aria-hidden="true">▶</span>
          </button>
          <button className={`text-control ${slowPlayback ? 'selected' : ''}`} type="button" onClick={() => setSlowPlayback((value) => !value)}>
            {slowPlayback ? '慢速播放中' : '慢速'}
          </button>
          <button className="text-control" type="button" onClick={() => playPhrase()}>
            再聽一次
          </button>
        </div>
        <button className={`record-button ${isRecording ? 'recording' : ''}`} type="button" onClick={toggleRecording}>
          <span className="record-dot" aria-hidden="true" />
          {isRecording ? '停止錄音' : '開始跟讀'}
        </button>
      </div>
    )
  }

  function renderMainContent() {
    if (section === 'phrases') {
      const savedLessons = lessons.filter((item) => favorites.includes(item.id))
      return (
        <section className="content-section">
          <div className="section-heading">
            <div><span className="eyebrow">YOUR PHRASEBOOK</span><h1>我的表達</h1></div>
            <span className="count-label">{savedLessons.length} 個收藏</span>
          </div>
          {savedLessons.length ? savedLessons.map((item) => (
            <button className="saved-phrase" type="button" key={item.id} onClick={() => { selectLesson(item.id); setSection('today') }}>
              <span><strong lang="ko">{item.phrase}</strong><small>{item.translation}</small></span>
              <span className="saved-arrow" aria-hidden="true">↗</span>
            </button>
          )) : (
            <div className="empty-state"><span className="empty-mark" aria-hidden="true">한</span><h2>喜歡的說法，先收進來</h2><p>在練習中按下「收藏句子」，它們會出現在這裡。</p></div>
          )}
        </section>
      )
    }

    if (section === 'dialogue') {
      return (
        <section className="content-section">
          <div className="section-heading">
            <div><span className="eyebrow">SAY IT IN CONTEXT</span><h1>情境對話</h1></div>
            <span className="count-label">{lesson.level} · 約 2 分鐘</span>
          </div>
          <LessonPicker selectedId={lesson.id} onSelect={selectLesson} />
          <div className="dialogue-card">
            <div className="dialogue-speaker"><span className="speaker-avatar">說</span><span>換你開口 <small>YOUR TURN</small></span></div>
            <p className="dialogue-prompt">{lesson.prompt}</p>
            <p className="dialogue-translation">選出自然、符合情境的韓文說法。</p>
            <div className="answer-list" role="group" aria-label="選擇自然的回答">
              {lesson.answers.map((option, index) => (
                <button className={`answer-option ${answer === option ? option === lesson.correctAnswer ? 'correct' : 'incorrect' : ''}`} type="button" key={option} onClick={() => setAnswer(option)}>
                  <span className="option-key">{String.fromCharCode(65 + index)}</span><span lang="ko">{option}</span>
                </button>
              ))}
            </div>
            {answer && <div className={`answer-feedback ${answer === lesson.correctAnswer ? 'is-correct' : ''}`} role="status"><strong>{answer === lesson.correctAnswer ? '這樣說很自然。' : '再想想看。'}</strong><span>{lesson.note}</span></div>}
          </div>
        </section>
      )
    }

    return (
      <section className="content-section">
        <div className="section-heading">
          <div><span className="eyebrow">{section === 'shadowing' ? 'LISTEN · REPEAT · RECORD' : 'A LITTLE KOREAN, EVERY DAY'}</span><h1>{section === 'shadowing' ? '跟讀練習' : '今天，說一句韓文。'}</h1></div>
          <span className="count-label">{lesson.level} · {lesson.setting}</span>
        </div>

        <LessonPicker selectedId={lesson.id} onSelect={selectLesson} />

        <article className={`phrase-card ${section === 'shadowing' ? 'shadowing-card' : ''}`}>
          <div className="phrase-card-top"><span className="phrase-kicker">오늘의 한마디 <span>/</span> {lesson.setting}</span><button className={`favorite-button ${isFavorite ? 'is-favorite' : ''}`} type="button" onClick={toggleFavorite} aria-label={isFavorite ? '取消收藏' : '收藏句子'} title={isFavorite ? '取消收藏' : '收藏句子'}>{isFavorite ? '★' : '☆'}</button></div>
          <p className="korean-phrase" lang="ko">{lesson.phrase}</p>
          <p className="phrase-translation">{lesson.translation}</p>
          <p className="phrase-romanization">{lesson.romanization}</p>
          <div className="phrase-divider" />
          {renderPracticeTools()}
          {(voiceMessage || recordingMessage) && <p className="status-message" role="status">{voiceMessage || recordingMessage}</p>}
          {recordingUrl && <div className="recording-playback"><span>我的跟讀</span><audio ref={recordingRef} controls src={recordingUrl}>你的瀏覽器不支援音訊播放。</audio></div>}
          <div className="usage-note"><span className="note-label">使用小提醒</span><p>{lesson.note}</p></div>
          <button className={`complete-button ${isCompleted ? 'is-complete' : ''}`} type="button" onClick={markComplete}>{isCompleted ? '今天完成了 ✓' : '完成今天的練習'}<span aria-hidden="true">→</span></button>
        </article>

        <div className="below-practice"><div><span className="eyebrow">UP NEXT</span><h2>換個情境，再說一次</h2></div><button type="button" onClick={() => { selectLesson(lessons[(lessons.findIndex((item) => item.id === lesson.id) + 1) % lessons.length].id); setSection('shadowing') }}>下一句 <span aria-hidden="true">↗</span></button></div>
      </section>
    )
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand-lockup" type="button" onClick={() => setSection('today')} aria-label="回到 오늘 한마디 首頁"><span className="brand-symbol">ㅎ</span><span className="brand-name">오늘 한마디<small>ONE KOREAN PHRASE</small></span></button>
        <div className="sidebar-label">你的練習</div>
        <nav className="main-nav" aria-label="主要導覽">
          {sections.map((item) => <button className={`nav-item ${section === item.id ? 'active' : ''}`} type="button" key={item.id} onClick={() => setSection(item.id)}><span className="nav-number">{item.number}</span>{item.label}{item.id === 'phrases' && favorites.length > 0 && <span className="nav-count">{favorites.length}</span>}</button>)}
        </nav>
        <div className="sidebar-bottom"><div className="streak-mark" aria-hidden="true">{completed.length ? '✳' : '·'}</div><p><strong>{completed.length ? `${completed.length} 句已練習` : '慢慢來就好'}</strong><span>一天一句，也很不錯。</span></p></div>
        <span className="sidebar-edition">생활 한국어 · 2026</span>
      </aside>

      <main className="main-area">
        <header className="topbar"><span className="topbar-path">LEARNING JOURNAL <span>/</span> {sections.find((item) => item.id === section)?.label.toUpperCase()}</span><span className="topbar-date">{todayLabel}</span></header>
        {renderMainContent()}
        <footer className="page-footer"><span>오늘도 천천히, 한마디.</span><span>用自己的速度，慢慢學會。</span></footer>
      </main>

      <aside className="right-rail">
        <div className="rail-heading"><span className="eyebrow">YOUR RHYTHM</span><span className="rail-live"><i /> IN PRACTICE</span></div>
        <div className="progress-block"><div className="progress-number">{String(completed.length).padStart(2, '0')}<span> / 03</span></div><p>本週練過的句子</p><div className="progress-track"><span style={{ width: `${Math.min((completed.length / 3) * 100, 100)}%` }} /></div><div className="progress-days"><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span><span>日</span></div></div>
        <div className="rail-rule" />
        <div className="rail-heading"><span className="eyebrow">PICK A MOMENT</span></div>
        <LessonPicker selectedId={lesson.id} onSelect={selectLesson} compact />
        <div className="rail-note"><span className="note-stamp">오늘</span><p>把韓文放進日常裡，不必急著完美。</p><span>LESS IS A LITTLE MORE</span></div>
      </aside>
    </div>
  )
}

function LessonPicker({ selectedId, onSelect, compact = false }: { selectedId: string; onSelect: (id: string) => void; compact?: boolean }) {
  return <div className={`lesson-picker ${compact ? 'compact' : ''}`} aria-label="選擇生活情境">{lessons.map((item, index) => <button className={`lesson-choice ${selectedId === item.id ? 'selected' : ''}`} type="button" key={item.id} onClick={() => onSelect(item.id)}><span className="lesson-index">0{index + 1}</span><span className="lesson-copy"><strong>{item.title}</strong><small>{item.level} <i /> {item.setting.split(' / ')[0].replace('AROUND TOWN', '街頭').replace('CASUAL CHAT', '日常')}</small></span><span className="lesson-arrow" aria-hidden="true">↗</span></button>)}</div>
}

export default App

import { useState, useRef, useEffect, useCallback } from 'react'
import { useVoiceRecognition } from './useVoiceRecognition'
import type { TranscriptEntry } from './types'

const LANGUAGES = [
  { code: 'ja-JP', label: '日本語' },
  { code: 'en-US', label: 'English' },
  { code: 'zh-CN', label: '中文' },
  { code: 'ko-KR', label: '한국어' },
  { code: 'es-ES', label: 'Español' },
  { code: 'fr-FR', label: 'Français' },
  { code: 'de-DE', label: 'Deutsch' },
]

function App() {
  const {
    state,
    interimText,
    finalText,
    setFinalText,
    error,
    isSupported,
    start,
    stop,
    clear,
  } = useVoiceRecognition()

  const [language, setLanguage] = useState('ja-JP')
  const [autoClean, setAutoClean] = useState(true)
  const [continuousMode, setContinuousMode] = useState(true)
  const [history, setHistory] = useState<TranscriptEntry[]>(() => {
    try {
      const saved = localStorage.getItem('iq-voice-history')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  const [showSettings, setShowSettings] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [copied, setCopied] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const textAreaRef = useRef<HTMLTextAreaElement>(null)
  const displayRef = useRef<HTMLDivElement>(null)

  // Auto-scroll display
  useEffect(() => {
    if (displayRef.current) {
      displayRef.current.scrollTop = displayRef.current.scrollHeight
    }
  }, [finalText, interimText])

  // Save history to localStorage
  useEffect(() => {
    localStorage.setItem('iq-voice-history', JSON.stringify(history.slice(0, 50)))
  }, [history])

  const handleToggleRecording = useCallback(() => {
    if (state === 'recording') {
      stop()
      // Save to history if there's text
      if (finalText.trim()) {
        const entry: TranscriptEntry = {
          id: crypto.randomUUID(),
          text: finalText,
          editedText: finalText,
          timestamp: new Date(),
          lang: language,
        }
        setHistory(prev => [entry, ...prev])
      }
    } else {
      start(language, autoClean, continuousMode)
    }
  }, [state, stop, start, language, autoClean, continuousMode, finalText])

  const handleCopy = useCallback(async () => {
    const text = finalText.trim()
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [finalText])

  const handleCopyAndClear = useCallback(async () => {
    await handleCopy()
    setTimeout(() => {
      clear()
    }, 300)
  }, [handleCopy, clear])

  const handleEditToggle = useCallback(() => {
    if (editMode && textAreaRef.current) {
      setFinalText(textAreaRef.current.value)
    }
    setEditMode(!editMode)
  }, [editMode, setFinalText])

  const handleLoadFromHistory = useCallback((entry: TranscriptEntry) => {
    setFinalText(entry.editedText || entry.text)
    setShowHistory(false)
  }, [setFinalText])

  const handleClearHistory = useCallback(() => {
    setHistory([])
    localStorage.removeItem('iq-voice-history')
  }, [])

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'V') {
        e.preventDefault()
        handleToggleRecording()
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
        e.preventDefault()
        handleCopy()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleToggleRecording, handleCopy])

  if (!isSupported) {
    return (
      <div className="app">
        <div className="unsupported">
          <div className="unsupported-icon">🎤</div>
          <h2>音声認識非対応</h2>
          <p>お使いのブラウザはWeb Speech APIに対応していません。</p>
          <p>Chrome, Edge, またはSafariをお使いください。</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <h1 className="logo">
            <span className="logo-icon">◉</span>
            IQ Voice
          </h1>
        </div>
        <div className="header-right">
          <button
            className={`icon-btn ${showHistory ? 'active' : ''}`}
            onClick={() => { setShowHistory(!showHistory); setShowSettings(false) }}
            title="履歴"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </button>
          <button
            className={`icon-btn ${showSettings ? 'active' : ''}`}
            onClick={() => { setShowSettings(!showSettings); setShowHistory(false) }}
            title="設定"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Settings Panel */}
      {showSettings && (
        <div className="panel settings-panel">
          <h3>設定</h3>
          <div className="setting-row">
            <label>言語</label>
            <select value={language} onChange={e => setLanguage(e.target.value)}>
              {LANGUAGES.map(l => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
          </div>
          <div className="setting-row">
            <label>フィラー除去</label>
            <button
              className={`toggle ${autoClean ? 'on' : ''}`}
              onClick={() => setAutoClean(!autoClean)}
            >
              <span className="toggle-knob" />
            </button>
          </div>
          <div className="setting-row">
            <label>連続モード</label>
            <button
              className={`toggle ${continuousMode ? 'on' : ''}`}
              onClick={() => setContinuousMode(!continuousMode)}
            >
              <span className="toggle-knob" />
            </button>
          </div>
          <p className="setting-hint">
            ショートカット: Ctrl+Shift+V（録音）/ Ctrl+Shift+C（コピー）
          </p>
        </div>
      )}

      {/* History Panel */}
      {showHistory && (
        <div className="panel history-panel">
          <div className="panel-header">
            <h3>履歴</h3>
            {history.length > 0 && (
              <button className="text-btn danger" onClick={handleClearHistory}>すべて削除</button>
            )}
          </div>
          {history.length === 0 ? (
            <p className="empty-state">まだ履歴がありません</p>
          ) : (
            <div className="history-list">
              {history.map(entry => (
                <button
                  key={entry.id}
                  className="history-item"
                  onClick={() => handleLoadFromHistory(entry)}
                >
                  <div className="history-text">
                    {(entry.editedText || entry.text).slice(0, 80)}
                    {(entry.editedText || entry.text).length > 80 ? '...' : ''}
                  </div>
                  <div className="history-meta">
                    {new Date(entry.timestamp).toLocaleString('ja-JP')}
                    <span className="history-lang">{entry.lang}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main Content */}
      <main className="main">
        {/* Transcription Display */}
        <div className="transcript-area" ref={displayRef}>
          {!finalText && !interimText && state === 'idle' && (
            <div className="placeholder">
              <p>マイクボタンを押して話し始めてください</p>
              <p className="placeholder-sub">音声がリアルタイムでテキストに変換されます</p>
            </div>
          )}
          {editMode ? (
            <textarea
              ref={textAreaRef}
              className="edit-textarea"
              defaultValue={finalText}
              autoFocus
            />
          ) : (
            <>
              {finalText && <span className="final-text">{finalText}</span>}
              {interimText && <span className="interim-text">{interimText}</span>}
            </>
          )}
        </div>

        {/* Action Bar */}
        {finalText && (
          <div className="action-bar">
            <button className="action-btn" onClick={handleEditToggle} title={editMode ? '保存' : '編集'}>
              {editMode ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              )}
              <span>{editMode ? '保存' : '編集'}</span>
            </button>
            <button className="action-btn" onClick={handleCopy} title="コピー">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <span>{copied ? 'コピー済み!' : 'コピー'}</span>
            </button>
            <button className="action-btn primary" onClick={handleCopyAndClear} title="コピーしてクリア">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 2L11 13" />
                <path d="M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
              <span>送信</span>
            </button>
            <button className="action-btn danger-btn" onClick={clear} title="クリア">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              <span>クリア</span>
            </button>
          </div>
        )}
      </main>

      {/* Recording Button */}
      <div className="record-container">
        {state === 'recording' && (
          <div className="pulse-ring" />
        )}
        <button
          className={`record-btn ${state === 'recording' ? 'recording' : ''}`}
          onClick={handleToggleRecording}
          title={state === 'recording' ? '停止' : '録音開始'}
        >
          {state === 'recording' ? (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          )}
        </button>
        <div className="record-label">
          {state === 'recording' ? '録音中...' : 'タップして録音'}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="error-toast">
          {error}
        </div>
      )}

      {/* Status Bar */}
      <div className="status-bar">
        <span className="status-lang">{LANGUAGES.find(l => l.code === language)?.label}</span>
        {autoClean && <span className="status-tag">フィラー除去ON</span>}
        {finalText && (
          <span className="status-count">{finalText.length}文字</span>
        )}
      </div>
    </div>
  )
}

export default App

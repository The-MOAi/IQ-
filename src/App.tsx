import { useState, useRef, useEffect, useCallback } from 'react'
import { useVoiceRecognition } from './useVoiceRecognition'
import type { TranscriptEntry } from './types'

const LANGUAGES = [
  { code: 'ja-JP', label: '日本語', flag: '🇯🇵' },
  { code: 'en-US', label: 'English', flag: '🇺🇸' },
  { code: 'zh-CN', label: '中文', flag: '🇨🇳' },
  { code: 'ko-KR', label: '한국어', flag: '🇰🇷' },
  { code: 'es-ES', label: 'Español', flag: '🇪🇸' },
  { code: 'fr-FR', label: 'Français', flag: '🇫🇷' },
  { code: 'de-DE', label: 'Deutsch', flag: '🇩🇪' },
]

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function WaveformVisualizer({ volume, active }: { volume: number, active: boolean }) {
  const bars = 24
  return (
    <div className="waveform">
      {Array.from({ length: bars }, (_, i) => {
        const center = bars / 2
        const distFromCenter = Math.abs(i - center) / center
        const baseHeight = active ? 0.15 : 0.08
        const h = active
          ? baseHeight + volume * (1 - distFromCenter * 0.7) * (0.6 + Math.sin(Date.now() / 200 + i * 0.5) * 0.4)
          : baseHeight
        return (
          <div
            key={i}
            className="waveform-bar"
            style={{
              height: `${Math.max(4, h * 48)}px`,
              opacity: active ? 0.6 + volume * 0.4 : 0.2,
              transition: active ? 'height 0.08s ease' : 'height 0.5s ease',
            }}
          />
        )
      })}
    </div>
  )
}

function App() {
  const {
    state,
    interimText,
    finalText,
    setFinalText,
    error,
    isSupported,
    duration,
    volumeLevel,
    start,
    stop,
    clear,
  } = useVoiceRecognition()

  const [language, setLanguage] = useState(() => localStorage.getItem('iq-voice-lang') || 'ja-JP')
  const [autoClean, setAutoClean] = useState(() => localStorage.getItem('iq-voice-clean') !== 'false')
  const [continuousMode, setContinuousMode] = useState(true)
  const [history, setHistory] = useState<TranscriptEntry[]>(() => {
    try {
      const saved = localStorage.getItem('iq-voice-history')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  const [view, setView] = useState<'main' | 'settings' | 'history'>('main')
  const [copied, setCopied] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('iq-voice-onboarded'))
  const textAreaRef = useRef<HTMLTextAreaElement>(null)
  const displayRef = useRef<HTMLDivElement>(null)
  const [, setTick] = useState(0)

  // Animate waveform when recording
  useEffect(() => {
    if (state !== 'recording') return
    const id = setInterval(() => setTick(t => t + 1), 80)
    return () => clearInterval(id)
  }, [state])

  // Persist settings
  useEffect(() => { localStorage.setItem('iq-voice-lang', language) }, [language])
  useEffect(() => { localStorage.setItem('iq-voice-clean', String(autoClean)) }, [autoClean])

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
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.left = '-9999px'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [finalText])

  const handleCopyAndClear = useCallback(async () => {
    await handleCopy()
    setTimeout(clear, 400)
  }, [handleCopy, clear])

  const handleEditToggle = useCallback(() => {
    if (editMode && textAreaRef.current) {
      setFinalText(textAreaRef.current.value)
    }
    setEditMode(!editMode)
  }, [editMode, setFinalText])

  const handleLoadFromHistory = useCallback((entry: TranscriptEntry) => {
    setFinalText(entry.editedText || entry.text)
    setView('main')
  }, [setFinalText])

  const handleClearHistory = useCallback(() => {
    setHistory([])
    localStorage.removeItem('iq-voice-history')
  }, [])

  const handleDismissOnboarding = useCallback(() => {
    setShowOnboarding(false)
    localStorage.setItem('iq-voice-onboarded', 'true')
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

  const currentLang = LANGUAGES.find(l => l.code === language)

  if (!isSupported) {
    return (
      <div className="app">
        <div className="center-message">
          <div className="center-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
              <line x1="1" y1="1" x2="23" y2="23" stroke="#e74c3c" strokeWidth="2" />
            </svg>
          </div>
          <h2>音声認識に非対応</h2>
          <p>Chrome、Edge、またはSafariでお試しください。</p>
        </div>
      </div>
    )
  }

  // Onboarding
  if (showOnboarding) {
    return (
      <div className="app">
        <div className="onboarding">
          <div className="onboarding-logo">
            <div className="onboarding-logo-circle">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </div>
          </div>
          <h1 className="onboarding-title">IQ Voice</h1>
          <p className="onboarding-subtitle">話すだけで、テキストに。</p>
          <div className="onboarding-features">
            <div className="onboarding-feature">
              <span className="feature-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="13 17 18 12 13 7" /><polyline points="6 17 11 12 6 7" /></svg>
              </span>
              <div>
                <div className="feature-title">リアルタイム変換</div>
                <div className="feature-desc">話した言葉が即座にテキストに</div>
              </div>
            </div>
            <div className="onboarding-feature">
              <span className="feature-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
              </span>
              <div>
                <div className="feature-title">自動クリーンアップ</div>
                <div className="feature-desc">「えーっと」などのフィラーを自動除去</div>
              </div>
            </div>
            <div className="onboarding-feature">
              <span className="feature-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
              </span>
              <div>
                <div className="feature-title">ワンタップコピー</div>
                <div className="feature-desc">変換テキストをすぐに貼り付け可能</div>
              </div>
            </div>
          </div>
          <button className="onboarding-start" onClick={handleDismissOnboarding}>
            はじめる
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          {view !== 'main' ? (
            <button className="back-btn" onClick={() => setView('main')}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          ) : null}
          <h1 className="logo">
            {view === 'main' && <span className="logo-dot" />}
            {view === 'main' ? 'IQ Voice' : view === 'settings' ? '設定' : '履歴'}
          </h1>
        </div>
        {view === 'main' && (
          <div className="header-right">
            <button className="icon-btn" onClick={() => setView('history')} title="履歴">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </button>
            <button className="icon-btn" onClick={() => setView('settings')} title="設定">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
                <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
                <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
                <line x1="1" y1="14" x2="7" y2="14" />
                <line x1="9" y1="8" x2="15" y2="8" />
                <line x1="17" y1="16" x2="23" y2="16" />
              </svg>
            </button>
          </div>
        )}
        {view === 'history' && history.length > 0 && (
          <div className="header-right">
            <button className="text-btn danger" onClick={handleClearHistory}>全削除</button>
          </div>
        )}
      </header>

      {/* Settings View */}
      {view === 'settings' && (
        <div className="settings-view">
          <div className="setting-group">
            <div className="setting-group-title">認識言語</div>
            <div className="lang-grid">
              {LANGUAGES.map(l => (
                <button
                  key={l.code}
                  className={`lang-chip ${language === l.code ? 'active' : ''}`}
                  onClick={() => setLanguage(l.code)}
                >
                  <span className="lang-flag">{l.flag}</span>
                  <span>{l.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="setting-group">
            <div className="setting-group-title">音声処理</div>
            <div className="setting-card">
              <div className="setting-row">
                <div>
                  <div className="setting-label">フィラー自動除去</div>
                  <div className="setting-description">「えーっと」「um」などを自動で取り除きます</div>
                </div>
                <button className={`toggle ${autoClean ? 'on' : ''}`} onClick={() => setAutoClean(!autoClean)}>
                  <span className="toggle-knob" />
                </button>
              </div>
              <div className="setting-divider" />
              <div className="setting-row">
                <div>
                  <div className="setting-label">連続録音</div>
                  <div className="setting-description">無音になっても録音を自動で再開します</div>
                </div>
                <button className={`toggle ${continuousMode ? 'on' : ''}`} onClick={() => setContinuousMode(!continuousMode)}>
                  <span className="toggle-knob" />
                </button>
              </div>
            </div>
          </div>
          <div className="setting-group">
            <div className="setting-group-title">ショートカット</div>
            <div className="setting-card">
              <div className="shortcut-row">
                <span>録音の開始/停止</span>
                <kbd>Ctrl + Shift + V</kbd>
              </div>
              <div className="setting-divider" />
              <div className="shortcut-row">
                <span>テキストをコピー</span>
                <kbd>Ctrl + Shift + C</kbd>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History View */}
      {view === 'history' && (
        <div className="history-view">
          {history.length === 0 ? (
            <div className="center-message">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <p>まだ履歴がありません</p>
            </div>
          ) : (
            <div className="history-list">
              {history.map(entry => (
                <button key={entry.id} className="history-item" onClick={() => handleLoadFromHistory(entry)}>
                  <div className="history-text">
                    {(entry.editedText || entry.text).slice(0, 100)}
                    {(entry.editedText || entry.text).length > 100 ? '...' : ''}
                  </div>
                  <div className="history-meta">
                    <span>{new Date(entry.timestamp).toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="history-lang">{LANGUAGES.find(l => l.code === entry.lang)?.flag} {entry.lang.split('-')[0]}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main View */}
      {view === 'main' && (
        <>
          <main className="main">
            {/* Language badge */}
            <div className="lang-badge" onClick={() => setView('settings')}>
              {currentLang?.flag} {currentLang?.label}
              {autoClean && <span className="clean-badge">フィラー除去</span>}
            </div>

            {/* Transcript Area */}
            <div className="transcript-area" ref={displayRef}>
              {!finalText && !interimText && state === 'idle' && (
                <div className="placeholder">
                  <div className="placeholder-mic">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3">
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" y1="19" x2="12" y2="23" />
                      <line x1="8" y1="23" x2="16" y2="23" />
                    </svg>
                  </div>
                  <p className="placeholder-main">下のマイクボタンをタップ</p>
                  <p className="placeholder-sub">声を認識してテキストに変換します</p>
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
                <div className="transcript-text">
                  {finalText && <span className="final-text">{finalText}</span>}
                  {interimText && <span className="interim-text">{interimText}</span>}
                  {state === 'recording' && <span className="cursor-blink">|</span>}
                </div>
              )}
            </div>

            {/* Action Bar */}
            {finalText && !editMode && (
              <div className="action-bar">
                <button className="action-chip" onClick={handleEditToggle}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  編集
                </button>
                <button className="action-chip" onClick={handleCopy}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  {copied ? 'OK!' : 'コピー'}
                </button>
                <button className="action-chip accent" onClick={handleCopyAndClear}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4 20-7z" />
                  </svg>
                  コピー&クリア
                </button>
                <button className="action-chip muted" onClick={clear}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            )}
            {editMode && (
              <div className="action-bar">
                <button className="action-chip accent" onClick={handleEditToggle}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  保存
                </button>
                <button className="action-chip muted" onClick={() => setEditMode(false)}>
                  キャンセル
                </button>
              </div>
            )}
          </main>

          {/* Bottom Area */}
          <div className="bottom-area">
            {/* Waveform */}
            <WaveformVisualizer volume={volumeLevel} active={state === 'recording'} />

            {/* Recording info */}
            {state === 'recording' && (
              <div className="recording-info">
                <span className="recording-dot" />
                <span className="recording-time">{formatDuration(duration)}</span>
              </div>
            )}

            {/* Record Button */}
            <div className="record-container">
              <button
                className={`record-btn ${state === 'recording' ? 'recording' : ''}`}
                onClick={handleToggleRecording}
              >
                {state === 'recording' ? (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="6" width="12" height="12" rx="3" />
                  </svg>
                ) : (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                )}
              </button>
            </div>

            <div className="record-hint">
              {state === 'recording' ? 'タップで停止' : 'タップで録音開始'}
            </div>
          </div>
        </>
      )}

      {/* Toast notifications */}
      {error && <div className="toast error-toast">{error}</div>}
      {copied && <div className="toast success-toast">クリップボードにコピーしました</div>}
    </div>
  )
}

export default App

import { useCallback, useRef, useState } from 'react'
import type { RecordingState, SpeechRecognition, SpeechRecognitionEvent } from './types'

// Japanese filler words and common speech artifacts
const FILLER_PATTERNS_JA = [
  /えーっと/g, /えーと/g, /えっと/g, /えー/g,
  /あのー/g, /あの/g, /そのー/g, /その/g,
  /まあ/g, /なんか/g, /こう/g, /ほら/g,
  /うーん/g, /うん/g, /ええ/g,
]

// English filler words
const FILLER_PATTERNS_EN = [
  /\bum+\b/gi, /\buh+\b/gi, /\bah+\b/gi,
  /\byou know\b/gi, /\blike\b(?=\s*,)/gi,
  /\bso+\b(?=\s*,)/gi, /\bwell\b(?=\s*,)/gi,
  /\bI mean\b/gi, /\bbasically\b/gi,
]

function cleanText(text: string, lang: string): string {
  let cleaned = text
  const patterns = lang.startsWith('ja') ? FILLER_PATTERNS_JA : FILLER_PATTERNS_EN
  for (const pattern of patterns) {
    cleaned = cleaned.replace(pattern, '')
  }
  // Clean up extra spaces
  cleaned = cleaned.replace(/\s{2,}/g, ' ').trim()
  return cleaned
}

export function useVoiceRecognition() {
  const [state, setState] = useState<RecordingState>('idle')
  const [interimText, setInterimText] = useState('')
  const [finalText, setFinalText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const langRef = useRef('ja-JP')
  const autoCleanRef = useRef(true)
  const continuousModeRef = useRef(true)

  const isSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  const start = useCallback((lang: string, autoClean: boolean, continuousMode: boolean) => {
    if (!isSupported) {
      setError('お使いのブラウザは音声認識に対応していません')
      return
    }

    langRef.current = lang
    autoCleanRef.current = autoClean
    continuousModeRef.current = continuousMode

    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognitionClass()

    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = lang
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      setState('recording')
      setError(null)
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = ''
      let final = ''

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          final += result[0].transcript
        } else {
          interim += result[0].transcript
        }
      }

      if (final) {
        const processed = autoCleanRef.current ? cleanText(final, langRef.current) : final
        setFinalText(prev => prev + (prev ? (langRef.current.startsWith('ja') ? '' : ' ') : '') + processed)
      }
      setInterimText(interim)
    }

    recognition.onerror = (event) => {
      if (event.error === 'no-speech') return // Ignore no-speech, keep listening
      if (event.error === 'aborted') return
      setError(`音声認識エラー: ${event.error}`)
      setState('idle')
    }

    recognition.onend = () => {
      // Auto-restart if in continuous mode and still recording
      if (continuousModeRef.current && state === 'recording') {
        try {
          recognition.start()
          return
        } catch {
          // Failed to restart, that's ok
        }
      }
      setState('idle')
      setInterimText('')
    }

    try {
      recognition.start()
      recognitionRef.current = recognition
    } catch {
      setError('音声認識の開始に失敗しました')
    }
  }, [isSupported, state])

  const stop = useCallback(() => {
    continuousModeRef.current = false
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setState('idle')
    setInterimText('')
  }, [])

  const clear = useCallback(() => {
    setFinalText('')
    setInterimText('')
    setError(null)
  }, [])

  return {
    state,
    interimText,
    finalText,
    setFinalText,
    error,
    isSupported,
    start,
    stop,
    clear,
  }
}

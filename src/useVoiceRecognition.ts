import { useCallback, useRef, useState, useEffect } from 'react'
import type { RecordingState, SpeechRecognition, SpeechRecognitionEvent } from './types'

// Japanese filler words and common speech artifacts
const FILLER_PATTERNS_JA = [
  /えーっと/g, /えーと/g, /えっと/g, /えー/g,
  /あのー/g, /あのう/g,
  /そのー/g, /そのう/g,
  /まあ/g, /なんか/g, /こう/g, /ほら/g,
  /うーん/g, /うん/g, /ええ/g,
  /ちょっと/g, /やっぱり/g, /なんていうか/g,
]

// English filler words
const FILLER_PATTERNS_EN = [
  /\bum+\b/gi, /\buh+\b/gi, /\bah+\b/gi,
  /\byou know\b/gi, /\blike\b(?=\s*,)/gi,
  /\bso+\b(?=\s*,)/gi, /\bwell\b(?=\s*,)/gi,
  /\bI mean\b/gi, /\bbasically\b/gi,
  /\bactually\b/gi, /\bkind of\b/gi, /\bsort of\b/gi,
]

function cleanText(text: string, lang: string): string {
  let cleaned = text
  const patterns = lang.startsWith('ja') ? FILLER_PATTERNS_JA : FILLER_PATTERNS_EN
  for (const pattern of patterns) {
    cleaned = cleaned.replace(pattern, '')
  }
  // Clean up extra spaces and repeated punctuation
  cleaned = cleaned.replace(/\s{2,}/g, ' ').replace(/、{2,}/g, '、').trim()
  return cleaned
}

export function useVoiceRecognition() {
  const [state, setState] = useState<RecordingState>('idle')
  const [interimText, setInterimText] = useState('')
  const [finalText, setFinalText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [duration, setDuration] = useState(0)
  const [volumeLevel, setVolumeLevel] = useState(0)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const langRef = useRef('ja-JP')
  const autoCleanRef = useRef(true)
  const continuousModeRef = useRef(true)
  const stateRef = useRef<RecordingState>('idle')
  const durationIntervalRef = useRef<number | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const isSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  // Keep stateRef in sync
  useEffect(() => {
    stateRef.current = state
  }, [state])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current)
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      if (audioContextRef.current) audioContextRef.current.close()
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    }
  }, [])

  const startAudioAnalysis = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const audioContext = new AudioContext()
      audioContextRef.current = audioContext
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.8
      analyserRef.current = analyser
      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)

      const dataArray = new Uint8Array(analyser.frequencyBinCount)
      const updateVolume = () => {
        if (stateRef.current !== 'recording') {
          setVolumeLevel(0)
          return
        }
        analyser.getByteFrequencyData(dataArray)
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
        setVolumeLevel(Math.min(avg / 128, 1))
        animFrameRef.current = requestAnimationFrame(updateVolume)
      }
      updateVolume()
    } catch {
      // Audio analysis is optional, don't block recording
    }
  }, [])

  const stopAudioAnalysis = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setVolumeLevel(0)
  }, [])

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
      stateRef.current = 'recording'
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
        if (processed) {
          setFinalText(prev => prev + (prev ? (langRef.current.startsWith('ja') ? '' : ' ') : '') + processed)
        }
      }
      setInterimText(interim)
    }

    recognition.onerror = (event) => {
      if (event.error === 'no-speech') return
      if (event.error === 'aborted') return
      setError(`音声認識エラー: ${event.error}`)
      setState('idle')
      stateRef.current = 'idle'
    }

    recognition.onend = () => {
      if (continuousModeRef.current && stateRef.current === 'recording') {
        try {
          recognition.start()
          return
        } catch {
          // Failed to restart
        }
      }
      setState('idle')
      stateRef.current = 'idle'
      setInterimText('')
    }

    try {
      recognition.start()
      recognitionRef.current = recognition
      // Start duration timer
      setDuration(0)
      durationIntervalRef.current = window.setInterval(() => {
        setDuration(d => d + 1)
      }, 1000)
      // Start audio analysis for waveform
      startAudioAnalysis()
    } catch {
      setError('音声認識の開始に失敗しました')
    }
  }, [isSupported, startAudioAnalysis])

  const stop = useCallback(() => {
    continuousModeRef.current = false
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current)
      durationIntervalRef.current = null
    }
    stopAudioAnalysis()
    setState('idle')
    stateRef.current = 'idle'
    setInterimText('')
  }, [stopAudioAnalysis])

  const clear = useCallback(() => {
    setFinalText('')
    setInterimText('')
    setError(null)
    setDuration(0)
  }, [])

  return {
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
  }
}

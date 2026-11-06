import { useEffect, useRef, useState } from 'react'

interface RecognitionAlternativeLike {
  transcript: string
}

interface RecognitionResultLike {
  isFinal: boolean
  length: number
  [index: number]: RecognitionAlternativeLike
}

interface RecognitionEventLike {
  results: {
    length: number
    [index: number]: RecognitionResultLike
  }
}

interface RecognitionErrorEventLike {
  error?: string
}

interface RecognitionLike {
  lang: string
  interimResults: boolean
  continuous: boolean
  maxAlternatives: number
  onresult: ((event: RecognitionEventLike) => void) | null
  onerror: ((event: RecognitionErrorEventLike) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

type RecognitionCtor = new () => RecognitionLike

function recognizerCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const windowWithSpeech = window as unknown as {
    SpeechRecognition?: RecognitionCtor
    webkitSpeechRecognition?: RecognitionCtor
  }
  return (
    windowWithSpeech.SpeechRecognition ??
    windowWithSpeech.webkitSpeechRecognition ??
    null
  )
}

export function useSpeechRecognition(onTranscript: (text: string) => void) {
  const [listening, setListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<RecognitionLike | null>(null)
  const supported = recognizerCtor() !== null

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort()
      recognitionRef.current = null
    }
  }, [])

  function start() {
    if (!supported || listening) return
    const Ctor = recognizerCtor()
    if (!Ctor) return

    const recognition = new Ctor()
    recognition.lang = 'en-US'
    recognition.interimResults = true
    recognition.continuous = false
    recognition.maxAlternatives = 1

    recognition.onresult = (event) => {
      let transcript = ''
      for (let index = 0; index < event.results.length; index += 1) {
        transcript += `${event.results[index]?.[0]?.transcript ?? ''} `
      }
      onTranscript(transcript.trim())
    }

    recognition.onerror = (event) => {
      setListening(false)
      setError(
        event.error === 'not-allowed'
          ? '麦克风权限被拒绝。可以直接用键盘输入，或允许麦克风后再试。'
          : '语音识别暂时不可用；可以直接打字继续。',
      )
    }

    recognition.onend = () => setListening(false)

    recognitionRef.current = recognition
    setError(null)
    try {
      recognition.start()
      setListening(true)
    } catch {
      setListening(false)
      setError('语音识别无法启动；可以直接打字继续。')
    }
  }

  function stop() {
    recognitionRef.current?.stop()
    setListening(false)
  }

  return { supported, listening, error, start, stop }
}

import { useEffect, useRef, useState } from 'react'
import type { ListeningClipRow } from '@/lib/db'
import type { ListeningSegment } from '@/lib/listening'
import { canSpeak, speakSequence } from '@/lib/speech'

const RATES = [0.75, 0.9, 1]

export function useListeningPlayer(clip: ListeningClipRow) {
  const [rate, setRate] = useState(0.9)
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const stopAtRef = useRef<number | null>(null)
  const speechCancelRef = useRef<(() => void) | null>(null)

  const hasAudio = clip.audioBlob !== undefined
  const speechReady = canSpeak()

  useEffect(() => {
    if (!clip.audioBlob) return
    const url = URL.createObjectURL(clip.audioBlob)
    const audio = new Audio(url)
    audio.preload = 'auto'

    const handlePlay = () => setPlaying(true)
    const handlePause = () => setPlaying(false)
    const handleEnded = () => {
      stopAtRef.current = null
      setPlaying(false)
    }
    const handleTimeUpdate = () => {
      if (
        stopAtRef.current !== null &&
        audio.currentTime >= stopAtRef.current
      ) {
        audio.pause()
        stopAtRef.current = null
      }
    }

    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audioRef.current = audio

    return () => {
      audio.pause()
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audioRef.current = null
      URL.revokeObjectURL(url)
      speechCancelRef.current?.()
      speechCancelRef.current = null
    }
  }, [clip.id, clip.audioBlob])

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = rate
  }, [rate])

  function stop() {
    audioRef.current?.pause()
    stopAtRef.current = null
    speechCancelRef.current?.()
    speechCancelRef.current = null
    setPlaying(false)
  }

  function playSegments(segments: ListeningSegment[]) {
    if (segments.length === 0) return
    stop()

    if (hasAudio && audioRef.current) {
      const audio = audioRef.current
      const timed = segments.every(
        (segment) => segment.start !== null && segment.end !== null,
      )
      const first = segments[0]
      const last = segments[segments.length - 1]
      audio.currentTime = timed && first.start !== null ? first.start : 0
      stopAtRef.current =
        timed && last.end !== null ? last.end : null
      audio.playbackRate = rate
      void audio.play().catch(() => setPlaying(false))
      return
    }

    if (!speechReady) return
    setPlaying(true)
    speechCancelRef.current = speakSequence(
      segments.map((segment) => segment.text),
      rate,
      () => setPlaying(false),
    )
  }

  function playAll() {
    playSegments(clip.segments)
  }

  return {
    hasAudio,
    speechReady,
    playing,
    rate,
    setRate,
    rates: RATES,
    playSegments,
    playAll,
    stop,
  }
}

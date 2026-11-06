export function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

function makeUtterance(text: string, rate: number): SpeechSynthesisUtterance {
  const synth = window.speechSynthesis
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'en-US'
  utterance.rate = rate
  utterance.pitch = 1

  const voices = synth.getVoices()
  const preferred =
    voices.find(
      (voice) =>
        voice.lang.startsWith('en') &&
        /Samantha|Aria|Jenny|Google US English|Microsoft.*English/i.test(voice.name),
    ) ?? voices.find((voice) => voice.lang.startsWith('en'))

  if (preferred) utterance.voice = preferred
  return utterance
}

export function speakEnglish(text: string, rate = 0.95): boolean {
  if (!canSpeak()) return false

  const synth = window.speechSynthesis
  synth.cancel()
  synth.speak(makeUtterance(text, rate))
  return true
}

/**
 * Reads several sentences with a short gap between them. Returns a cancel
 * function so a practice screen can stop playback when it unmounts.
 */
export function speakSequence(
  texts: string[],
  rate = 0.9,
  onDone?: () => void,
  gapMs = 320,
): () => void {
  if (!canSpeak()) {
    onDone?.()
    return () => undefined
  }

  const synth = window.speechSynthesis
  synth.cancel()
  let cancelled = false

  function readAt(index: number) {
    if (cancelled) return
    if (index >= texts.length) {
      onDone?.()
      return
    }
    const utterance = makeUtterance(texts[index], rate)
    utterance.onend = () => {
      if (cancelled) return
      window.setTimeout(() => readAt(index + 1), gapMs)
    }
    utterance.onerror = () => {
      if (!cancelled) onDone?.()
    }
    synth.speak(utterance)
  }

  readAt(0)

  return () => {
    cancelled = true
    synth.cancel()
  }
}

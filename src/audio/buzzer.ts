let context: AudioContext | null = null

function getContext(): AudioContext | null {
  if (typeof AudioContext === 'undefined') return null
  if (context === null) {
    context = new AudioContext()
  }
  return context
}

export function playBuzzer(): void {
  const ctx = getContext()
  if (ctx === null) return
  void ctx.resume()
  const start = ctx.currentTime
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.3, start)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 1)
  gain.connect(ctx.destination)
  for (const frequency of [220, 224]) {
    const oscillator = ctx.createOscillator()
    oscillator.type = 'square'
    oscillator.frequency.setValueAtTime(frequency, start)
    oscillator.connect(gain)
    oscillator.start(start)
    oscillator.stop(start + 1)
  }
}

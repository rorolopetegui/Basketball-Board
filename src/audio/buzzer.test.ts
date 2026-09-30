import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type FakeOscillator = {
  type: OscillatorType
  frequency: { setValueAtTime: ReturnType<typeof vi.fn> }
  connect: ReturnType<typeof vi.fn>
  start: ReturnType<typeof vi.fn>
  stop: ReturnType<typeof vi.fn>
}

type FakeInstance = {
  currentTime: number
  resume: ReturnType<typeof vi.fn>
  destination: unknown
  createGain: ReturnType<typeof vi.fn>
  createOscillator: ReturnType<typeof vi.fn>
}

function installFakeAudioContext(): {
  constructor: ReturnType<typeof vi.fn>
  instances: FakeInstance[]
  oscillators: FakeOscillator[]
} {
  const instances: FakeInstance[] = []
  const oscillators: FakeOscillator[] = []
  const fake = vi.fn().mockImplementation(function fakeAudioContext(this: unknown) {
    const instance: FakeInstance = {
      currentTime: 0,
      resume: vi.fn().mockResolvedValue(undefined),
      destination: {},
      createGain: vi.fn().mockReturnValue({
        gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
        connect: vi.fn(),
      }),
      createOscillator: vi.fn().mockImplementation(() => {
        const oscillator: FakeOscillator = {
          type: 'sine',
          frequency: { setValueAtTime: vi.fn() },
          connect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
        }
        oscillators.push(oscillator)
        return oscillator
      }),
    }
    instances.push(instance)
    return instance
  })
  vi.stubGlobal('AudioContext', fake)
  return { constructor: fake, instances, oscillators }
}

let playBuzzer: () => void

beforeEach(async () => {
  // The buzzer keeps a module-level AudioContext singleton; import a fresh module per test.
  vi.resetModules()
  const mod = await import('./buzzer')
  playBuzzer = mod.playBuzzer
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('playBuzzer', () => {
  it('is a no-op when AudioContext is undefined', () => {
    vi.stubGlobal('AudioContext', undefined)
    expect(() => playBuzzer()).not.toThrow()
  })

  it('creates one AudioContext and reuses it across calls', () => {
    const fake = installFakeAudioContext()
    playBuzzer()
    playBuzzer()
    expect(fake.constructor).toHaveBeenCalledTimes(1)
    expect(fake.instances).toHaveLength(1)
  })

  it('starts and stops every oscillator over a one second span', () => {
    const fake = installFakeAudioContext()
    playBuzzer()
    expect(fake.oscillators.length).toBeGreaterThan(0)
    for (const oscillator of fake.oscillators) {
      expect(oscillator.start).toHaveBeenCalledTimes(1)
      expect(oscillator.stop).toHaveBeenCalledTimes(1)
      const startAt = oscillator.start.mock.calls[0][0] as number
      const stopAt = oscillator.stop.mock.calls[0][0] as number
      expect(stopAt - startAt).toBeCloseTo(1)
    }
  })
})

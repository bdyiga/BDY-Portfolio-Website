/**
 * Match-night sound, synthesised with the Web Audio API: no audio files to
 * download. Off until the visitor turns it on (the toggle's click is the user
 * gesture browsers need before audio can start).
 *
 *   crowd()   a low murmur from the stands while the stadium is on screen
 *   whistle() the referee: a new stop on the tour, half and full time
 *   thud()    boot on ball
 *   cheer()   the crowd rising for a conversion
 */

let ctx: AudioContext | null = null
let master: GainNode | null = null
let enabled = false
let crowdNodes: { src: AudioBufferSourceNode; gain: GainNode; lfo: OscillatorNode } | null = null
let noise: AudioBuffer | null = null

function audio() {
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = 0.8
    master.connect(ctx.destination)
  }
  return ctx
}

/** Two seconds of pink-ish noise, reused for the crowd and the cheer. */
function noiseBuffer(c: AudioContext) {
  if (noise) return noise
  const len = c.sampleRate * 2
  noise = c.createBuffer(1, len, c.sampleRate)
  const d = noise.getChannelData(0)
  let b0 = 0
  let b1 = 0
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1
    b0 = 0.99765 * b0 + w * 0.099
    b1 = 0.963 * b1 + w * 0.2965
    d[i] = (b0 + b1 + w * 0.1848) * 0.3
  }
  return noise
}

export function setSoundEnabled(on: boolean) {
  enabled = on
  // no audio context at all until someone actually wants sound
  if (!on && !ctx) return
  const c = audio()
  if (!c || !master) return
  if (on) void c.resume()
  master.gain.setTargetAtTime(on ? 0.8 : 0, c.currentTime, 0.08)
  if (!on) crowd(false)
}

export const soundEnabled = () => enabled

/** The stands: band-passed noise with a slow swell. */
export function crowd(on: boolean) {
  if (!on && !ctx) return
  const c = audio()
  if (!c || !master) return
  if (on && enabled && !crowdNodes) {
    const src = c.createBufferSource()
    src.buffer = noiseBuffer(c)
    src.loop = true
    const band = c.createBiquadFilter()
    band.type = 'bandpass'
    band.frequency.value = 520
    band.Q.value = 0.6
    const gain = c.createGain()
    gain.gain.value = 0
    gain.gain.setTargetAtTime(0.09, c.currentTime, 1.2)
    // a slow rise and fall, like a crowd talking among itself
    const lfo = c.createOscillator()
    lfo.frequency.value = 0.13
    const depth = c.createGain()
    depth.gain.value = 0.03
    lfo.connect(depth).connect(gain.gain)
    src.connect(band).connect(gain).connect(master)
    src.start()
    lfo.start()
    crowdNodes = { src, gain, lfo }
  } else if (!on && crowdNodes) {
    const { src, gain, lfo } = crowdNodes
    gain.gain.setTargetAtTime(0, c.currentTime, 0.3)
    src.stop(c.currentTime + 1.5)
    lfo.stop(c.currentTime + 1.5)
    crowdNodes = null
  }
}

/** A referee's whistle: a pea whistle trills, so the pitch wobbles fast. */
export function whistle(blasts = 1) {
  if (!enabled) return
  const c = audio()
  if (!c || !master) return
  for (let b = 0; b < blasts; b++) {
    const t = c.currentTime + b * 0.42
    const len = b === blasts - 1 ? 0.42 : 0.26
    const osc = c.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = 2850
    const trill = c.createOscillator()
    trill.frequency.value = 38
    const trillDepth = c.createGain()
    trillDepth.gain.value = 70
    trill.connect(trillDepth).connect(osc.frequency)
    const g = c.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.11, t + 0.02)
    g.gain.setValueAtTime(0.11, t + len - 0.05)
    g.gain.linearRampToValueAtTime(0, t + len)
    osc.connect(g).connect(master)
    osc.start(t)
    trill.start(t)
    osc.stop(t + len + 0.02)
    trill.stop(t + len + 0.02)
  }
}

/** Boot on ball: a short, falling thump. */
export function thud() {
  if (!enabled) return
  const c = audio()
  if (!c || !master) return
  const t = c.currentTime
  const osc = c.createOscillator()
  osc.frequency.setValueAtTime(150, t)
  osc.frequency.exponentialRampToValueAtTime(48, t + 0.16)
  const g = c.createGain()
  g.gain.setValueAtTime(0.5, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.22)
  osc.connect(g).connect(master)
  osc.start(t)
  osc.stop(t + 0.25)
}

/** The crowd rises for a conversion and settles again. */
export function cheer() {
  if (!enabled) return
  const c = audio()
  if (!c || !master) return
  const t = c.currentTime
  const src = c.createBufferSource()
  src.buffer = noiseBuffer(c)
  src.loop = true
  const band = c.createBiquadFilter()
  band.type = 'bandpass'
  band.frequency.setValueAtTime(700, t)
  band.frequency.linearRampToValueAtTime(1100, t + 0.6)
  band.Q.value = 0.8
  const g = c.createGain()
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(0.32, t + 0.35)
  g.gain.setTargetAtTime(0, t + 0.9, 0.6)
  src.connect(band).connect(g).connect(master)
  src.start(t)
  src.stop(t + 3.5)
}

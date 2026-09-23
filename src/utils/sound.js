// Tubig Irosin — order notification sound (new CONFIRMED orders)
let audioCtx = null
function getCtx() {
  if (audioCtx) return audioCtx
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return null
    audioCtx = new Ctx()
    return audioCtx
  } catch { return null }
}
function beep(ctx, freq, start, duration, vol = 0.32, type = 'sine') {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.value = freq
  osc.connect(gain)
  gain.connect(ctx.destination)
  gain.gain.setValueAtTime(0, start)
  gain.gain.linearRampToValueAtTime(vol, start + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.01, start + duration)
  osc.start(start)
  osc.stop(start + duration + 0.02)
}
export async function playNewOrderSound() {
  if (!isSoundEnabled()) return
  let ctx = getCtx()
  if (!ctx) return
  try { if (ctx.state === 'suspended') await ctx.resume() } catch {}
  if (!ctx || ctx.state !== 'running') return
  try {
    const now = ctx.currentTime
    beep(ctx, 784, now, 0.30, 0.45, 'sine')
    beep(ctx, 659, now, 0.35, 0.18, 'triangle')
    beep(ctx, 1046, now + 0.20, 0.40, 0.50, 'sine')
    beep(ctx, 880, now + 0.20, 0.45, 0.22, 'triangle')
    beep(ctx, 180, now + 0.04, 0.22, 0.25, 'sine')
  } catch {}
}
export function isSoundEnabled() {
  try { const v = localStorage.getItem('orderSoundEnabled'); return v === null ? true : v === 'true' } catch { return true }
}
export function setSoundEnabled(v) { try { localStorage.setItem('orderSoundEnabled', String(v)) } catch {} }
export function toggleSoundEnabled() { const next = !isSoundEnabled(); setSoundEnabled(next); return next }
export function primeSoundOnGesture() {
  const h = () => {
    const ctx = getCtx()
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(()=>{})
    window.removeEventListener('click', h); window.removeEventListener('keydown', h); window.removeEventListener('touchstart', h)
  }
  window.addEventListener('click', h, { once: true })
  window.addEventListener('keydown', h, { once: true })
  window.addEventListener('touchstart', h, { once: true })
}

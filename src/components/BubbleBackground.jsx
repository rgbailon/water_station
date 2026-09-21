import { useEffect, useRef } from 'react'

// Ambient rising-bubble background (pointer-transparent, sits behind app content).
// Respects prefers-reduced-motion by rendering nothing.
export default function BubbleBackground({ maxBubbles = 18 }) {
  const containerRef = useRef(null)
  const bubblesRef = useRef([])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    try {
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    } catch { /* fall through */ }

    let stopped = false

    const createBubble = (initial = false) => {
      const el = document.createElement('div')
      el.className = 'bubble'
      const size = 14 + Math.random() * 46
      el.style.width = `${size}px`
      el.style.height = `${size}px`
      el.style.left = `${Math.random() * 100}%`
      const duration = 9 + Math.random() * 9
      el.style.animationDuration = `${duration}s`
      // negative delay on first paint so bubbles start distributed mid-flight
      el.style.animationDelay = initial ? `${-(Math.random() * duration)}s` : `${Math.random() * 2}s`
      container.appendChild(el)
      bubblesRef.current.push(el)
      const ttl = (duration + 3) * 1000 + (initial ? duration * 1000 : 0)
      setTimeout(() => {
        el.remove()
        bubblesRef.current = bubblesRef.current.filter(b => b !== el)
      }, ttl)
    }

    for (let i = 0; i < 12; i++) {
      setTimeout(() => { if (!stopped) createBubble(true) }, i * 120)
    }

    let timer = null
    const loop = () => {
      if (stopped) return
      if (!document.hidden && bubblesRef.current.length < maxBubbles) createBubble(false)
      timer = setTimeout(loop, 400 + Math.random() * 900)
    }
    timer = setTimeout(loop, 1200)

    return () => {
      stopped = true
      if (timer) clearTimeout(timer)
      bubblesRef.current.forEach(b => b.remove())
      bubblesRef.current = []
    }
  }, [maxBubbles])

  return <div ref={containerRef} className="bubble-background" aria-hidden="true" />
}

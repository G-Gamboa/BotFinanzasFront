import { useEffect, useRef, useState } from 'react'

const ICONS = {
  moon: <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" /></>,
  sunrise: <path d="M12 2v8M4.93 10.93l1.41 1.41M2 18h2M20 18h2M17.66 12.34l1.41-1.41M22 22H2M8 6l4-4 4 4M16 18a4 4 0 0 0-8 0" />,
  sunset: <path d="M12 10V2M4.93 10.93l1.41 1.41M2 18h2M20 18h2M19.07 10.93l-1.41 1.41M22 22H2M16 6l-4 4-4-4M16 18a4 4 0 0 0-8 0" />,
  star: <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />,
  heart: <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />,
  sparkle: <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />,
  sparkles: <><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" /><path d="M20 3v4M22 5h-4M4 17v2M5 18H3" /></>,
  flower: <><circle cx="12" cy="12" r="3" /><path d="M12 16.5A4.5 4.5 0 1 1 7.5 12 4.5 4.5 0 1 1 12 7.5a4.5 4.5 0 1 1 4.5 4.5 4.5 4.5 0 1 1-4.5 4.5M12 7.5V9M7.5 12H9M16.5 12H15M12 16.5V15" /></>,
  gift: <><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5" /></>,
  party: <><path d="M5.8 11.3 2 22l10.7-3.79" /><path d="M4 3h.01M22 8h.01M15 2h.01M22 20h.01" /><path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10" /><path d="m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11-.11.7-.72 1.22-1.43 1.22H17" /><path d="m11 2 .33.82c.34.86-.2 1.82-1.11 1.98C9.52 4.9 9 5.52 9 6.23V7" /><path d="M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2Z" /></>,
  cake: <><path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8" /><path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1" /><path d="M2 21h20" /><path d="M7 8v3M12 8v3M17 8v3" /><path d="M7 4h.01M12 4h.01M17 4h.01" /></>,
  feather: <><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" /><line x1="16" y1="8" x2="2" y2="22" /><line x1="17.5" y1="15" x2="9" y2="15" /></>,
  crown: <><path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z" /><path d="M5 21h14" /></>,
  prev: <path d="M19 12H5M12 19l-7-7 7-7" />,
  next: <path d="M5 12h14M12 5l7 7-7 7" />,
}

function Svg({ name, width = 1.5 }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={width} strokeLinecap="round" strokeLinejoin="round">
      {ICONS[name] || ICONS.heart}
    </svg>
  )
}

const MSGS = [
  { e: 'moon', l: 'Medianoche', t: 'Feliz cumpleaños mi vida... eres lo primero en lo que pienso hoy, es un día especial y quiero hacerlo especial para ti. Que este nuevo año de tu vida esté lleno de todo lo que mereces y más.' },
  { e: 'sparkles', l: '1 de la mañana', t: 'Son las madrugadas y no puedo dejar de pensar en ti. Hoy cumples años y soy el más afortunado de tenerte. Que este año te traiga todo lo bueno para ti bebé.' },
  { e: 'sparkle', l: '2 de la mañana', t: 'Las madrugadas siempre serán nuestras (por muchas cosas :o). Mientras todos duermen, yo celebro en silencio que existes, que eres mía, y que hoy es tu día. Feliz cumpleaños mi amor.' },
  { e: 'star', l: '3 de la mañana', t: 'A esta hora todo está en calma, pero mi corazón te amaa. Cada día contigo es un regalo, y hoy es el más especial de todos. Gracias infinitas por existir.' },
  { e: 'heart', l: '4 de la mañana', t: 'Falta poco para que amanezca en tu cumpleaños y ya nacisteeeeer. Que el sol de hoy brille especialmente para ti. Eres la persona más especial que conozco, te amooooooo.' },
  { e: 'sunrise', l: '5 de la mañana', t: 'Pronto amanecerá. Hoy el sol saldrá para recordarle al mundo lo especial que eres, ¡Feliz cumpleaños!' },
  { e: 'sun', l: '6 de la mañana', t: 'Buenos días en tu cumpleaños, espero ya casi despierteees, que hoy sea tan hermoso como tú preciosaa.' },
  { e: 'flower', l: '7 de la mañana', t: 'Esta mañana es especial porque tú cumples años. Espero que hoy te despiertes con esa sonrisa que tanto me encanta. Que cada momento de tu día esté lleno de alegría.' },
  { e: 'gift', l: '8 de la mañana', t: 'Espero que al ver este mensaje, tu mañana ya vaya siendo tan bonita como tú lo mereces. Te pienso mucho mucho hoy. Feliz cumpleaños mi chiquita hermosa, te amo.' },
  { e: 'heart', l: '9 de la mañana', t: 'Ya vas con todoo en tu día. Espero que cada cosa que hagas hoy te recuerde cuánto eres querida y amada. Eres la mejor mi cieloo.' },
  { e: 'party', l: '10 de la mañana', t: 'A media mañana de tu cumpleaños. Ojalá estés sonriendo tanto como yo cada vez que pienso en ti, oseaaaaaaa todo el tiempo.' },
  { e: 'flower', l: '11 de la mañana', t: 'Casi es mediodía y yo sigo pensando en lo afortunado que soy de que seas parte de mi vida. No me canso de quererte y desearte feliz cumpleaños mi amor.' },
  { e: 'cake', l: 'Mediodía', t: 'Mediodía de tu cumpleaños. Si pudieras ver cuántas veces has estado por mi mente hoy, te quedarías asooombradaaa. Eres mi todo.' },
  { e: 'heart', l: '1 de la tarde', t: 'La tarde de tu cumpleaños apenas comienza. Cada hora que pasa es una hora más que tengo para quererte, para admirarte, para elegirte.' },
  { e: 'sparkles', l: '2 de la tarde', t: '¿Estás disfrutando tu día? Espero que sí, porque te lo mereces completamente.' },
  { e: 'feather', l: '3 de la tarde', t: 'La tarde avanza y mis pensamientos siguen siendo para ti. Que todos tus sueños encuentren forma de cumplirse, uno a uno.' },
  { e: 'sparkle', l: '4 de la tarde', t: 'Cuatro de la tarde en tu cumpleaños. Que la vida siempre te dé razones para sonreír, como tú me las das a mí cada día que pasa.' },
  { e: 'sparkles', l: '5 de la tarde', t: 'Espero que cada pequeño momento de hoy quede grabado en tu corazón como un recuerdo bonito. Te amo mucho preciosa, ya casiii te veoooo bebé.' },
  { e: 'sunset', l: '6 de la tarde', t: 'Atardecer de tu cumpleaños. Ojalá el cielo de hoy sea tan colorido como todo lo que tú le das a mi vida. Gracias por ser mi persona favorita.' },
  { e: 'star', l: '7 de la noche', t: 'La noche se acerca y yo sigo celebrando que hoy naciste. Cada año contigo es mejor que el anterior. Qué suertudo soy de tenerte y mejor, ya estar celebrando contigooo.' },
  { e: 'party', l: '8 de la noche', t: 'La noche de tu cumpleaños está en su mejor momento. Que hoy termine exactamente como lo mereces: feliz, amada, y sabiendo que eres lo más especial que tengo.' },
  { e: 'heart', l: '9 de la noche', t: 'Ya casi es noche y sigo pensando en ti. Gracias por existir, por ser quien eres, por ser mía. No podrías haberme dado un mejor regalo que tú misma.' },
  { e: 'moon', l: '10 de la noche', t: 'Las últimas horas de tu cumpleaños. Espero que hoy haya sido tan especial como tú lo eres para mí. Que cada día del año que entra sea igual de bonito.' },
  { e: 'star', l: '11 de la noche', t: 'Las últimas horas de este día especial... Que al cerrar los ojos esta noche, solo pienses en cuánto eres querida y amada. Feliz cumpleaños mi amor, hasta el próximo año. Te amo.' },
]

const HEART = 'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z'
const SPARK = 'M12 3l-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z'
const STAR = 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z'

export default function BirthdayPage() {
  const [idx, setIdx] = useState(0)
  const boxRef = useRef(null)
  const canvasRef = useRef(null)
  const touchX = useRef(0)

  useEffect(() => {
    const box = boxRef.current
    const canvas = canvasRef.current
    if (!box || !canvas) return undefined
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined

    const ctx = canvas.getContext('2d')
    const shapes = [
      { p: new Path2D(HEART), c: '#f06090' },
      { p: new Path2D(HEART), c: '#ffb3cf' },
      { p: new Path2D(SPARK), c: '#ffc878' },
      { p: new Path2D(STAR), c: '#ffc878' },
    ]
    const particles = []
    let raf = 0

    function resize() {
      canvas.width = box.clientWidth
      canvas.height = box.clientHeight
    }
    resize()
    window.addEventListener('resize', resize)

    function spawn() {
      particles.push({
        x: Math.random() * canvas.width,
        y: canvas.height + 24,
        vx: (Math.random() - 0.5) * 0.7,
        vy: -(Math.random() * 1.1 + 0.5),
        a: Math.random() * 0.55 + 0.35,
        s: Math.random() * 20 + 9,
        sh: shapes[Math.floor(Math.random() * shapes.length)],
        rot: Math.random() * 6.28,
        rs: (Math.random() - 0.5) * 0.025,
        drift: (Math.random() - 0.5) * 0.008,
      })
    }
    const timers = Array.from({ length: 12 }, (_, i) => setTimeout(spawn, i * 90))

    function frame() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      if (Math.random() < 0.07) spawn()
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.vx += p.drift
        p.x += p.vx
        p.y += p.vy
        p.rot += p.rs
        p.a -= 0.0018
        if (p.a <= 0 || p.y < -40) { particles.splice(i, 1); continue }
        ctx.save()
        ctx.globalAlpha = p.a
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.scale(p.s / 24, p.s / 24)
        ctx.translate(-12, -12)
        ctx.fillStyle = p.sh.c
        ctx.fill(p.sh.p)
        ctx.restore()
      }
      raf = requestAnimationFrame(frame)
    }
    frame()

    return () => {
      cancelAnimationFrame(raf)
      timers.forEach(clearTimeout)
      window.removeEventListener('resize', resize)
    }
  }, [])

  const total = MSGS.length
  const go = (delta) => setIdx((i) => (i + delta + total) % total)
  const msg = MSGS[idx]

  return (
    <section className="bday" ref={boxRef}>
      <style>{CSS}</style>
      <canvas ref={canvasRef} className="bday-canvas" />
      <div className="bday-shell">
        <div className="bday-hdr">
          <div className="bday-crown"><Svg name="crown" /></div>
          <h2 className="bday-title">Feliz Cumpleaños</h2>
          <p className="bday-date">12 de noviembre · Tu día</p>
        </div>

        <div
          className="bday-card"
          key={idx}
          onTouchStart={(e) => { touchX.current = e.touches[0].clientX }}
          onTouchEnd={(e) => {
            const dx = e.changedTouches[0].clientX - touchX.current
            if (Math.abs(dx) > 36) go(dx < 0 ? 1 : -1)
          }}
        >
          <span className="bday-ico"><Svg name={msg.e} /></span>
          <div className="bday-label">{msg.l}</div>
          <p className="bday-body">{msg.t}</p>
        </div>

        <p className="bday-hint">desliza la tarjeta · 24 mensajes para ti</p>

        <div className="bday-nav">
          <button type="button" className="bday-btn" onClick={() => go(-1)} aria-label="Anterior"><Svg name="prev" width={2} /></button>
          <div className="bday-ctr">{idx + 1} / {total}</div>
          <button type="button" className="bday-btn" onClick={() => go(1)} aria-label="Siguiente"><Svg name="next" width={2} /></button>
        </div>

        <div className="bday-dots">
          {MSGS.map((m, i) => (
            <button
              key={m.l}
              type="button"
              aria-label={m.l}
              className={`bday-dot${i === idx ? ' active' : i < idx ? ' past' : ''}`}
              onClick={() => setIdx(i)}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400;1,600&family=DM+Sans:wght@400;500;600&display=swap');
.bday {
  --b-fg: #fff0f7; --b-soft: rgba(255,236,248,.6); --b-rose: #f06090; --b-rose-light: #ffb3cf; --b-gold: #ffc878;
  position: relative; overflow: hidden; border-radius: 20px;
  background: radial-gradient(ellipse at 30% 0%, #2e0030 0%, #180020 35%, #0c0010 70%);
  color: var(--b-fg); font-family: 'DM Sans', system-ui, sans-serif;
  padding: 28px 16px 32px; display: flex; justify-content: center;
  min-height: min(720px, 82vh);
}
.bday-canvas { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
.bday-shell { position: relative; z-index: 1; width: 100%; max-width: 400px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.4rem; }
.bday-hdr { text-align: center; display: flex; flex-direction: column; align-items: center; gap: .5rem; }
.bday-crown { line-height: 1; animation: bday-bob 3.2s ease-in-out infinite; filter: drop-shadow(0 0 16px var(--b-gold)); }
.bday-crown svg { width: 2.6rem; height: 2.6rem; color: var(--b-gold); display: block; }
.bday-title {
  margin: 0; font-family: 'Cormorant Garamond', Georgia, serif; font-style: italic; font-weight: 600;
  font-size: clamp(2rem, 7vw, 2.6rem); line-height: 1.08; text-wrap: balance;
  background: linear-gradient(130deg, var(--b-rose-light) 0%, var(--b-gold) 55%, var(--b-rose) 100%);
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}
.bday-date { margin: 0; font-size: .72rem; color: var(--b-soft); letter-spacing: .18em; text-transform: uppercase; }
.bday-card {
  width: 100%; min-height: 220px; text-align: center; border-radius: 22px; padding: 2rem 1.6rem 1.8rem;
  background: rgba(240,96,144,.07); border: 1px solid rgba(240,96,144,.22);
  box-shadow: 0 12px 48px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.04);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: .75rem;
  animation: bday-fade .38s ease both;
}
.bday-ico { animation: bday-throb 2.4s ease-in-out infinite; }
.bday-ico svg { width: 2.4rem; height: 2.4rem; color: var(--b-gold); display: block; }
.bday-label { font-size: .7rem; color: var(--b-rose); letter-spacing: .16em; text-transform: uppercase; font-weight: 600; }
.bday-body { margin: 0; font-family: 'Cormorant Garamond', Georgia, serif; font-style: italic; font-size: clamp(1.05rem, 3.5vw, 1.18rem); line-height: 1.7; max-width: 32ch; overflow-wrap: anywhere; }
.bday-hint { margin: 0; font-size: .68rem; color: var(--b-soft); letter-spacing: .06em; }
.bday-nav { display: flex; align-items: center; justify-content: center; gap: 1rem; width: 100%; }
.bday-btn {
  width: 46px; height: 46px; border-radius: 50%; flex: none; padding: 0;
  display: flex; align-items: center; justify-content: center;
  background: rgba(240,96,144,.14); border: 1px solid rgba(240,96,144,.28); color: var(--b-rose-light);
}
.bday-btn svg { width: 20px; height: 20px; }
.bday-btn:active { transform: scale(.93); }
.bday-ctr { font-size: .75rem; color: var(--b-soft); min-width: 48px; text-align: center; font-variant-numeric: tabular-nums; }
.bday-dots { display: flex; gap: 5px; flex-wrap: wrap; justify-content: center; max-width: 320px; }
.bday-dot { width: 7px; height: 7px; padding: 0; border: 0; border-radius: 50%; background: rgba(240,96,144,.22); flex: none; }
.bday-dot.past { background: rgba(240,96,144,.5); }
.bday-dot.active { background: var(--b-rose); transform: scale(1.5); }
@keyframes bday-bob { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-7px) } }
@keyframes bday-throb { 0%,100% { transform: scale(1) } 50% { transform: scale(1.14) } }
@keyframes bday-fade { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: translateY(0) } }
@media (prefers-reduced-motion: reduce) { .bday *, .bday { animation: none !important; } }
`

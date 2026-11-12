import { useEffect, useRef, useState } from 'react'

const MSGS = [
  { h:0,  e:'🌙', l:'Medianoche',       t:'Feliz cumpleaños mi vida... eres lo primero en lo que pienso hoy, en tu día especial. Que este nuevo año de tu vida esté lleno de todo lo que mereces y más.' },
  { h:1,  e:'💫', l:'1 de la mañana',   t:'Son las madrugadas y no puedo dejar de pensar en ti. Hoy cumples años y soy el más afortunado de tenerte. Que este año te traiga todo lo que tu corazón desea.' },
  { h:2,  e:'✨', l:'2 de la mañana',   t:'Las madrugadas siempre serán nuestras. Mientras el mundo duerme, yo celebro en silencio que existes, que eres mía, y que hoy es tu día. Feliz cumpleaños amor.' },
  { h:3,  e:'🌟', l:'3 de la mañana',   t:'A esta hora todo está en calma, pero mi corazón celebra. Cada día contigo es un regalo, y hoy es el más especial de todos. Gracias infinitas por existir.' },
  { h:4,  e:'💖', l:'4 de la mañana',   t:'Falta poco para que amanezca en tu cumpleaños. Que el sol de hoy brille especialmente para ti, que tanto lo mereces. Eres la persona más especial que conozco.' },
  { h:5,  e:'🌅', l:'5 de la mañana',   t:'Pronto amanecerá. Hoy el sol saldrá para recordarle al mundo lo especial que eres. Te quiero más de lo que soy capaz de expresar con palabras. Feliz cumpleaños.' },
  { h:6,  e:'☀️', l:'6 de la mañana',   t:'Buenos días en tu cumpleaños. El mundo despertó hoy con una persona más especial. Que hoy sea tan hermoso como tú, mi amor.' },
  { h:7,  e:'🌸', l:'7 de la mañana',   t:'Esta mañana es especial porque tú cumples años. Espero que hoy te despiertes con esa sonrisa que tanto me gusta. Que cada momento de tu día esté lleno de alegría.' },
  { h:8,  e:'🎀', l:'8 de la mañana',   t:'Espero que al ver este mensaje, tu mañana ya vaya siendo tan bonita como tú lo mereces. Te pienso mucho hoy. Feliz cumpleaños, te amo.' },
  { h:9,  e:'💝', l:'9 de la mañana',   t:'Ya comenzó tu día a toda marcha. Espero que cada cosa que hagas hoy te recuerde cuánto eres querida, valorada y amada. Eres increíble.' },
  { h:10, e:'🎊', l:'10 de la mañana',  t:'A media mañana de tu cumpleaños. Ojalá estés sonriendo tanto como yo cada vez que pienso en ti, que es básicamente todo el tiempo.' },
  { h:11, e:'🌺', l:'11 de la mañana',  t:'Casi es mediodía y yo sigo pensando en lo afortunado que soy de que seas parte de mi vida. No me canso de quererte. Feliz cumpleaños mi amor.' },
  { h:12, e:'🎂', l:'Mediodía',          t:'Mediodía de tu cumpleaños. Si pudieras ver cuántas veces has cruzado por mi mente hoy, te quedarías sin aliento. Eres mi todo.' },
  { h:13, e:'💕', l:'1 de la tarde',     t:'La tarde de tu cumpleaños apenas comienza. Cada hora que pasa es una hora más que tengo para quererte, para admirarte, para elegirte.' },
  { h:14, e:'🌈', l:'2 de la tarde',     t:'¿Estás disfrutando tu día? Espero que sí, porque te lo mereces completamente. Que la tarde de tu cumpleaños sea tan colorida como todo lo que eres.' },
  { h:15, e:'🦋', l:'3 de la tarde',     t:'La tarde avanza y mis pensamientos siguen siendo para ti. Que todos tus sueños encuentren su camino hacia ti, uno a uno, este año que inicia.' },
  { h:16, e:'✨', l:'4 de la tarde',     t:'Cuatro de la tarde en tu cumpleaños. Que la vida siempre te dé razones para sonreír, como tú me las das a mí cada día que pasa.' },
  { h:17, e:'💫', l:'5 de la tarde',     t:'El día va a paso de fiesta. Espero que cada pequeño momento de hoy quede grabado en tu corazón como un recuerdo bonito. Te quiero mucho.' },
  { h:18, e:'🌆', l:'6 de la tarde',     t:'Atardecer de tu cumpleaños. Ojalá el cielo de hoy sea tan colorido como todo lo que tú le das a mi vida. Gracias por ser mi persona favorita.' },
  { h:19, e:'🌟', l:'7 de la noche',     t:'La noche se acerca y yo sigo celebrando que hoy naciste. Cada año contigo es mejor que el anterior. Qué suertudo soy de tenerte.' },
  { h:20, e:'🎉', l:'8 de la noche',     t:'La noche de tu cumpleaños está en su mejor momento. Que hoy termine exactamente como lo mereces: feliz, amada, y sabiendo que eres lo más especial que tengo.' },
  { h:21, e:'💖', l:'9 de la noche',     t:'Ya casi es noche y sigo pensando en ti. Gracias por existir, por ser quien eres, por ser mía. No podrías haberme dado un mejor regalo que tú misma.' },
  { h:22, e:'🌙', l:'10 de la noche',    t:'Las últimas horas de tu cumpleaños. Espero que hoy haya sido tan especial como tú lo eres para mí. Que cada día del año que entra sea igual de bonito.' },
  { h:23, e:'⭐', l:'11 de la noche',    t:'Las últimas horas de este día especial... Que al cerrar los ojos esta noche, solo pienses en cuánto eres querida y amada. Feliz cumpleaños mi amor, hasta el próximo año. Te amo.' },
]

function getGTHour() {
  return new Date(Date.now() - 6 * 3600000).getUTCHours()
}

function bestIdx(curHour) {
  let b = 0
  for (let i = 0; i < MSGS.length; i++) if (MSGS[i].h <= curHour) b = i
  return b
}

export default function BirthdayPage() {
  const [curHour, setCurHour] = useState(() => getGTHour())
  const [idx, setIdx] = useState(() => bestIdx(getGTHour()))
  const canvasRef = useRef(null)
  const touchStartX = useRef(0)

  useEffect(() => {
    const timer = setInterval(() => setCurHour(getGTHour()), 60000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const P = []
    const CHARS = ['❤️','💕','💖','💗','💓','✨','⭐','🌸','💫','🌺','🎀']
    let raf

    function resize() { canvas.width = innerWidth; canvas.height = innerHeight }
    window.addEventListener('resize', resize)
    resize()

    function spawn() {
      P.push({
        x: Math.random() * canvas.width, y: canvas.height + 24,
        vx: (Math.random() - 0.5) * 0.7, vy: -(Math.random() * 1.1 + 0.5),
        a: Math.random() * 0.55 + 0.35, s: Math.random() * 20 + 9,
        ch: CHARS[Math.floor(Math.random() * CHARS.length)],
        rot: Math.random() * 6.28, rs: (Math.random() - 0.5) * 0.025,
        drift: (Math.random() - 0.5) * 0.008,
      })
    }
    for (let i = 0; i < 12; i++) setTimeout(spawn, i * 90)

    function frame() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      if (Math.random() < 0.07) spawn()
      for (let i = P.length - 1; i >= 0; i--) {
        const p = P[i]
        p.vx += p.drift; p.x += p.vx; p.y += p.vy; p.rot += p.rs; p.a -= 0.0018
        if (p.a <= 0 || p.y < -40) { P.splice(i, 1); continue }
        ctx.save()
        ctx.globalAlpha = p.a
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.font = `${p.s}px serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(p.ch, 0, 0)
        ctx.restore()
      }
      raf = requestAnimationFrame(frame)
    }
    frame()
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])

  const isLocked = (i) => MSGS[i].h > curHour
  const unlockedCount = MSGS.filter(m => m.h <= curHour).length
  const currentBest = bestIdx(curHour)
  const m = MSGS[idx]
  const locked = isLocked(idx)

  function nav(dir) {
    setIdx(i => (i + dir + 24) % 24)
  }

  const hintText = unlockedCount < 24
    ? `${unlockedCount} mensaje${unlockedCount !== 1 ? 's' : ''} desbloqueado${unlockedCount !== 1 ? 's' : ''} · ${24 - unlockedCount} llegando a lo largo del día`
    : 'desliza la tarjeta · 24 mensajes para ti'

  return (
    <div style={styles.root}>
      <style>{CSS}</style>
      <canvas ref={canvasRef} style={styles.canvas} />
      <div style={styles.shell}>
        <div style={styles.hdr}>
          <div style={styles.crown}>👑</div>
          <h1 style={styles.hdrTitle}>Feliz Cumpleaños</h1>
          <p style={styles.hdrDate}>12 de noviembre · Tu día</p>
        </div>

        <div style={{ ...styles.nowBadge, opacity: !locked && idx === currentBest ? 1 : 0 }}>
          <span>✨</span><span>Tu mensaje de ahora</span>
        </div>

        <div
          style={{ ...styles.card, ...(locked ? styles.cardLocked : {}) }}
          className="bd-card"
          onTouchStart={e => { touchStartX.current = e.touches[0].clientX }}
          onTouchEnd={e => {
            const dx = e.changedTouches[0].clientX - touchStartX.current
            if (Math.abs(dx) > 36) nav(dx < 0 ? 1 : -1)
          }}
        >
          {locked ? (
            <div style={styles.lockedOverlay}>
              <svg style={styles.lockIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <div style={styles.lockLabel}>Próximamente</div>
              <p style={styles.lockTime}>
                Este mensaje se desbloquea a las <strong style={{ color: '#ffb3cf', fontStyle: 'normal' }}>{String(m.h).padStart(2,'0')}:00</strong> ✨<br />Vuelve en un rato, mi amor.
              </p>
            </div>
          ) : (
            <>
              <span style={styles.msgEmoji}>{m.e}</span>
              <div style={styles.msgLabel}>{m.l}</div>
              <p style={styles.msgBody}>{m.t}</p>
            </>
          )}
        </div>

        <p style={styles.swipeHint}>{hintText}</p>

        <div style={styles.nav}>
          <button style={styles.navBtn} onClick={() => nav(-1)} aria-label="Anterior">&#8592;</button>
          <div style={styles.navCtr}>{idx + 1} / 24</div>
          <button style={styles.navBtn} onClick={() => nav(1)} aria-label="Siguiente">&#8594;</button>
        </div>

        <div style={styles.dots}>
          {MSGS.map((_, i) => (
            <div
              key={i}
              onClick={() => setIdx(i)}
              style={{
                ...styles.dot,
                ...(i === idx ? styles.dotActive : isLocked(i) ? styles.dotLocked : i < idx ? styles.dotPast : {}),
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400;1,600&family=DM+Sans:wght@400;500;600&display=swap');
@keyframes bob    { 0%,100%{transform:translateY(0)}  50%{transform:translateY(-7px)} }
@keyframes throb  { 0%,100%{transform:scale(1)}       50%{transform:scale(1.14)} }
.bd-card { transition: opacity 0.3s; }
`

const styles = {
  root: {
    position: 'fixed', inset: 0,
    background: 'radial-gradient(ellipse at 30% 0%, #2e0030 0%, #180020 35%, #0c0010 70%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: "'DM Sans', system-ui, sans-serif",
    color: '#fff0f7',
    paddingLeft:  'max(16px, env(safe-area-inset-left,0px))',
    paddingRight: 'max(16px, env(safe-area-inset-right,0px))',
    overflow: 'hidden',
  },
  canvas: { position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 },
  shell: {
    position: 'relative', zIndex: 1,
    width: '100%', maxWidth: 400,
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.4rem',
    paddingTop: 'max(env(safe-area-inset-top,20px),20px)',
    paddingBottom: 'max(env(safe-area-inset-bottom,24px),24px)',
  },
  hdr: { textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' },
  crown: { fontSize: '2.4rem', lineHeight: 1, animation: 'bob 3.2s ease-in-out infinite', filter: 'drop-shadow(0 0 16px #ffc878)' },
  hdrTitle: {
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontStyle: 'italic', fontWeight: 600,
    fontSize: 'clamp(2rem,7vw,2.6rem)', lineHeight: 1.08,
    background: 'linear-gradient(130deg,#ffb3cf 0%,#ffc878 55%,#f06090 100%)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    filter: 'drop-shadow(0 2px 24px rgba(240,96,144,0.25))',
    textWrap: 'balance', margin: 0,
  },
  hdrDate: { fontSize: '0.72rem', color: 'rgba(255,236,248,0.6)', letterSpacing: '0.18em', textTransform: 'uppercase' },
  nowBadge: {
    display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
    background: 'rgba(255,200,120,0.1)', border: '1px solid rgba(255,200,120,0.28)',
    color: '#ffc878', borderRadius: 100, padding: '0.3rem 1rem',
    fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
    transition: 'opacity 0.3s',
  },
  card: {
    background: 'rgba(240,96,144,0.07)', border: '1px solid rgba(240,96,144,0.22)',
    borderRadius: 22, padding: '2rem 1.6rem 1.8rem', width: '100%',
    textAlign: 'center', backdropFilter: 'blur(16px)',
    boxShadow: '0 0 0 1px rgba(255,100,155,0.08),0 12px 48px rgba(0,0,0,0.5),inset 0 1px 0 rgba(255,255,255,0.04)',
    minHeight: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
  },
  cardLocked: { opacity: 0.6, borderColor: 'rgba(240,96,144,0.1)' },
  lockedOverlay: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0' },
  lockIcon: { width: 40, height: 40, opacity: 0.55, color: 'rgba(255,236,248,0.6)' },
  lockLabel: { fontSize: '0.68rem', color: 'rgba(240,96,144,0.5)', letterSpacing: '0.14em', textTransform: 'uppercase' },
  lockTime: {
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontStyle: 'italic', fontSize: 'clamp(1rem,3.4vw,1.1rem)',
    color: 'rgba(255,236,248,0.6)', lineHeight: 1.6, maxWidth: '28ch', margin: 0,
  },
  msgEmoji: { fontSize: '2.4rem', lineHeight: 1, animation: 'throb 2.4s ease-in-out infinite' },
  msgLabel: { fontSize: '0.7rem', color: '#f06090', letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 600 },
  msgBody: {
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontStyle: 'italic', fontSize: 'clamp(1.05rem,3.5vw,1.18rem)',
    lineHeight: 1.7, color: '#fff0f7', maxWidth: '32ch', minWidth: 0, margin: 0,
  },
  swipeHint: { fontSize: '0.68rem', color: 'rgba(255,236,248,0.6)', letterSpacing: '0.06em', textAlign: 'center' },
  nav: { display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'center', width: '100%' },
  navBtn: {
    background: 'rgba(240,96,144,0.14)', border: '1px solid rgba(240,96,144,0.28)',
    color: '#ffb3cf', borderRadius: '50%', width: 46, height: 46,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', fontSize: '1rem', fontWeight: 600,
    flexShrink: 0, WebkitTapHighlightColor: 'transparent',
  },
  navCtr: { fontSize: '0.75rem', color: 'rgba(255,236,248,0.6)', minWidth: 48, textAlign: 'center' },
  dots: { display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 320 },
  dot:       { width: 7, height: 7, borderRadius: '50%', background: 'rgba(240,96,144,0.22)', cursor: 'pointer', flexShrink: 0 },
  dotPast:   { background: 'rgba(240,96,144,0.5)' },
  dotActive: { background: '#f06090', transform: 'scale(1.5)' },
  dotLocked: { background: 'rgba(255,255,255,0.08)', cursor: 'default' },
}

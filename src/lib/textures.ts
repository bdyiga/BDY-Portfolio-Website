/** Procedural canvas drawings used as textures. No image assets are downloaded for the 3D scene. */

export const PALETTE = {
  forest: '#0b2a1c',
  pitchA: '#1d5a35',
  pitchB: '#174d2d',
  charcoal: '#111513',
  lime: '#c6ff3d',
  silver: '#c9d1cf',
  white: '#f4f7f5',
  gold: '#e8c35a',
}

export const HEAD = '"Archivo", "Arial Black", sans-serif'
export const MONO = '"JetBrains Mono", ui-monospace, monospace'

export function setFont(ctx: CanvasRenderingContext2D, weight: number, size: number, family = HEAD, stretch = true) {
  ctx.font = `${weight} ${size}px ${family}`
  try {
    ;(ctx as CanvasRenderingContext2D & { fontStretch: string }).fontStretch = stretch ? 'expanded' : 'normal'
  } catch {
    /* older browsers */
  }
}

export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const test = line ? `${line} ${w}` : w
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = w
    } else line = test
  }
  if (line) lines.push(line)
  return lines
}

function rand(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

/** Full pitch incl. in-goal areas: x ∈ [-60, 60], z ∈ [-35, 35]. */
export function drawPitch(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const S = W / 120
  const X = (x: number) => (x + 60) * S
  const Z = (z: number) => (z + 35) * S

  // mown stripes, 5m wide, across the length
  for (let i = 0; i < 24; i++) {
    ctx.fillStyle = i % 2 ? PALETTE.pitchA : PALETTE.pitchB
    ctx.fillRect(i * 5 * S, 0, 5 * S + 1, H)
  }
  // in-goal areas a touch darker
  ctx.fillStyle = 'rgba(5, 25, 14, 0.28)'
  ctx.fillRect(0, 0, 10 * S, H)
  ctx.fillRect(110 * S, 0, 10 * S, H)

  // grass speckle
  const r = rand(7)
  for (let i = 0; i < 26000; i++) {
    const x = r() * W
    const y = r() * H
    ctx.fillStyle = r() > 0.5 ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.05)'
    ctx.fillRect(x, y, 2, 2)
  }

  const lw = Math.max(2, 0.12 * S)
  ctx.strokeStyle = 'rgba(244,247,245,0.92)'
  ctx.lineWidth = lw
  const line = (x1: number, z1: number, x2: number, z2: number, dash: number[] = []) => {
    ctx.setLineDash(dash.map((d) => d * S))
    ctx.beginPath()
    ctx.moveTo(X(x1), Z(z1))
    ctx.lineTo(X(x2), Z(z2))
    ctx.stroke()
  }
  // boundary: touchlines & dead-ball lines
  ctx.strokeRect(X(-60) + lw / 2, Z(-35) + lw / 2, 120 * S - lw, 70 * S - lw)
  // try lines, 22s, halfway
  for (const x of [-50, 50, -28, 28, 0]) line(x, -35, x, 35)
  // 10m dashed lines
  for (const x of [-10, 10]) line(x, -35, x, 35, [2, 1.6])
  // 5m and 15m dashed lines parallel to the touchlines
  for (const z of [-30, 30, -20, 20]) line(-50, z, 50, z, [1, 4])
  // 5m from the try line, dashed
  for (const x of [-45, 45]) line(x, -35, x, 35, [1, 4])
  ctx.setLineDash([])

  // centre spot
  ctx.fillStyle = PALETTE.white
  ctx.beginPath()
  ctx.arc(X(0), Z(0), 0.35 * S, 0, Math.PI * 2)
  ctx.fill()

  // in-goal branding, painted on the grass
  ctx.save()
  ctx.globalAlpha = 0.16
  ctx.fillStyle = PALETTE.lime
  setFont(ctx, 900, 7 * S)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.translate(X(-55), Z(0))
  ctx.rotate(Math.PI / 2)
  ctx.fillText('PLAYBOOK', 0, 0)
  ctx.restore()
  ctx.save()
  ctx.globalAlpha = 0.16
  ctx.fillStyle = PALETTE.lime
  setFont(ctx, 900, 7 * S)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.translate(X(55), Z(0))
  ctx.rotate(-Math.PI / 2)
  ctx.fillText('MATCH LOG', 0, 0)
  ctx.restore()

  // halfway line wordmark
  ctx.save()
  ctx.globalAlpha = 0.12
  ctx.fillStyle = PALETTE.white
  setFont(ctx, 900, 3.2 * S)
  ctx.textAlign = 'center'
  ctx.fillText("BDY'S WORLD", X(0), Z(-24))
  ctx.restore()
}

/** Outer ground around the pitch. */
export function drawSurround(ctx: CanvasRenderingContext2D, W: number, H: number) {
  ctx.fillStyle = '#123a24'
  ctx.fillRect(0, 0, W, H)
  const r = rand(3)
  for (let i = 0; i < 9000; i++) {
    ctx.fillStyle = r() > 0.5 ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.07)'
    ctx.fillRect(r() * W, r() * H, 2, 2)
  }
}

/** Rugby ball skin. U wraps around the ball, V runs tip to tip. */
export function drawBall(ctx: CanvasRenderingContext2D, W: number, H: number) {
  ctx.fillStyle = '#f2f4f1'
  ctx.fillRect(0, 0, W, H)
  // leather grain
  const r = rand(11)
  for (let i = 0; i < 9000; i++) {
    ctx.fillStyle = `rgba(0,0,0,${r() * 0.06})`
    ctx.beginPath()
    ctx.arc(r() * W, r() * H, 1 + r() * 1.2, 0, Math.PI * 2)
    ctx.fill()
  }
  // panel seams
  ctx.strokeStyle = 'rgba(30,40,35,0.35)'
  ctx.lineWidth = 2
  for (let i = 0; i < 4; i++) {
    const x = (i / 4) * W
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, H)
    ctx.stroke()
  }
  // end bands: charcoal + lime
  const band = (v: number, h: number, c: string) => {
    ctx.fillStyle = c
    ctx.fillRect(0, v * H, W, h * H)
  }
  band(0.12, 0.07, PALETTE.forest)
  band(0.195, 0.025, PALETTE.lime)
  band(0.81, 0.07, PALETTE.forest)
  band(0.78, 0.025, PALETTE.lime)
  // centre wordmark
  ctx.save()
  ctx.translate(W * 0.62, H * 0.5)
  ctx.rotate(-Math.PI / 2)
  ctx.fillStyle = PALETTE.forest
  setFont(ctx, 900, H * 0.06)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('BDY', 0, 0)
  ctx.restore()
  // laces
  const lx = W * 0.125
  ctx.strokeStyle = '#d9ddd9'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(lx, H * 0.38)
  ctx.lineTo(lx, H * 0.62)
  ctx.stroke()
  ctx.lineWidth = 4
  for (let i = 0; i < 8; i++) {
    const y = H * (0.39 + i * 0.03)
    ctx.beginPath()
    ctx.moveTo(lx - W * 0.02, y)
    ctx.lineTo(lx + W * 0.02, y)
    ctx.stroke()
  }
}

function corners(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, len: number, color: string, lw = 4) {
  ctx.strokeStyle = color
  ctx.lineWidth = lw
  ctx.beginPath()
  ctx.moveTo(x, y + len); ctx.lineTo(x, y); ctx.lineTo(x + len, y)
  ctx.moveTo(x + w - len, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + len)
  ctx.moveTo(x + w, y + h - len); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - len, y + h)
  ctx.moveTo(x + len, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + h - len)
  ctx.stroke()
}

/** Holographic project card. */
export function drawCard(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  d: { index: number; title: string; play: string; short: string; tags: string[]; badge?: string },
) {
  ctx.clearRect(0, 0, W, H)
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, 'rgba(10, 40, 26, 0.88)')
  g.addColorStop(1, 'rgba(6, 18, 12, 0.92)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
  // scanlines
  ctx.fillStyle = 'rgba(198,255,61,0.035)'
  for (let y = 0; y < H; y += 6) ctx.fillRect(0, y, W, 2)
  ctx.strokeStyle = 'rgba(198,255,61,0.35)'
  ctx.lineWidth = 2
  ctx.strokeRect(10, 10, W - 20, H - 20)
  corners(ctx, 10, 10, W - 20, H - 20, 46, PALETTE.lime, 6)

  const pad = 56
  setFont(ctx, 600, 30, MONO, false)
  ctx.fillStyle = PALETTE.lime
  ctx.textBaseline = 'top'
  ctx.fillText(`PLAY ${String(d.index + 1).padStart(2, '0')} · ${d.play.toUpperCase()}`, pad, pad)

  if (d.badge) {
    setFont(ctx, 800, 26, MONO, false)
    const bw = ctx.measureText(d.badge.toUpperCase()).width + 30
    ctx.fillStyle = PALETTE.gold
    ctx.fillRect(W - pad - bw, pad - 6, bw, 42)
    ctx.fillStyle = PALETTE.charcoal
    ctx.fillText(d.badge.toUpperCase(), W - pad - bw + 15, pad + 2)
  }

  ctx.fillStyle = PALETTE.white
  setFont(ctx, 900, 72)
  let lines = wrapText(ctx, d.title.toUpperCase(), W - pad * 2)
  if (lines.length > 2) {
    setFont(ctx, 900, 56)
    lines = wrapText(ctx, d.title.toUpperCase(), W - pad * 2)
  }
  let y = pad + 64
  for (const l of lines.slice(0, 3)) {
    ctx.fillText(l, pad, y)
    y += lines.length > 2 ? 62 : 80
  }

  setFont(ctx, 400, 32, '"Inter", sans-serif', false)
  ctx.fillStyle = PALETTE.silver
  for (const l of wrapText(ctx, d.short, W - pad * 2).slice(0, 2)) {
    y += 8
    ctx.fillText(l, pad, y)
    y += 36
  }

  // tags
  setFont(ctx, 500, 24, MONO, false)
  let tx = pad
  const ty = H - pad - 44
  for (const t of d.tags.slice(0, 4)) {
    const w = ctx.measureText(t).width + 28
    if (tx + w > W - pad) break
    ctx.strokeStyle = 'rgba(198,255,61,0.55)'
    ctx.lineWidth = 2
    ctx.strokeRect(tx, ty, w, 40)
    ctx.fillStyle = PALETTE.lime
    ctx.fillText(t, tx + 14, ty + 8)
    tx += w + 12
  }
}

/** Scrolling LED perimeter board. Drawn once; scrolling is done via texture offset. */
export function drawLedBoard(ctx: CanvasRenderingContext2D, W: number, H: number, text: string) {
  ctx.fillStyle = '#050806'
  ctx.fillRect(0, 0, W, H)
  setFont(ctx, 900, H * 0.56)
  ctx.textBaseline = 'middle'
  let x = 20
  const parts = text.split('·').map((s) => s.trim())
  let i = 0
  while (x < W) {
    const t = parts[i % parts.length]
    ctx.fillStyle = i % 2 ? PALETTE.lime : PALETTE.white
    ctx.fillText(t, x, H / 2 + 2)
    x += ctx.measureText(t).width + 40
    ctx.fillStyle = PALETTE.lime
    ctx.fillText('/', x, H / 2 + 2)
    x += 60
    i++
  }
  // LED pixel grid
  ctx.fillStyle = 'rgba(0,0,0,0.35)'
  for (let gx = 0; gx < W; gx += 4) ctx.fillRect(gx, 0, 1, H)
  for (let gy = 0; gy < H; gy += 4) ctx.fillRect(0, gy, W, 1)
}

/** Leadership banner, like a hanging team flag with a jersey number. */
export function drawBanner(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  d: { number: number; role: string; org: string; active: boolean },
) {
  ctx.fillStyle = d.active ? '#123d27' : PALETTE.forest
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = PALETTE.lime
  ctx.fillRect(0, 0, W, 14)
  ctx.fillRect(0, H - 14, W, 14)
  // chevron
  ctx.fillStyle = 'rgba(198,255,61,0.12)'
  ctx.beginPath()
  ctx.moveTo(0, H * 0.55)
  ctx.lineTo(W / 2, H * 0.72)
  ctx.lineTo(W, H * 0.55)
  ctx.lineTo(W, H * 0.66)
  ctx.lineTo(W / 2, H * 0.83)
  ctx.lineTo(0, H * 0.66)
  ctx.fill()

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = PALETTE.white
  setFont(ctx, 900, H * 0.3)
  ctx.fillText(String(d.number), W / 2, H * 0.27)
  ctx.fillStyle = PALETTE.lime
  setFont(ctx, 800, 30)
  const roleLines = wrapText(ctx, d.role.split(',')[0].toUpperCase(), W - 50)
  roleLines.slice(0, 2).forEach((l, i) => ctx.fillText(l, W / 2, H * 0.48 + i * 36))
  ctx.fillStyle = PALETTE.silver
  setFont(ctx, 500, 24, '"Inter", sans-serif', false)
  const orgShort = d.org.replace(/\s*\(.*\)/, '').replace('School of Informatics, Computing & Engineering', 'School')
  wrapText(ctx, orgShort, W - 50)
    .slice(0, 3)
    .forEach((l, i) => ctx.fillText(l, W / 2, H * 0.9 - 28 * (2 - i) - 10))
}

/** Scoreboard screen: header + one highlight. */
export function drawScoreboard(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  d: { value: string; label: string; index: number; total: number; conversions: number },
) {
  ctx.fillStyle = '#040605'
  ctx.fillRect(0, 0, W, H)
  // header strip
  ctx.fillStyle = '#0b2a1c'
  ctx.fillRect(0, 0, W, H * 0.2)
  setFont(ctx, 900, H * 0.1)
  ctx.textBaseline = 'middle'
  ctx.fillStyle = PALETTE.white
  ctx.textAlign = 'left'
  ctx.fillText('BDY', W * 0.04, H * 0.1)
  ctx.fillStyle = PALETTE.lime
  ctx.textAlign = 'center'
  setFont(ctx, 600, H * 0.075, MONO, false)
  ctx.fillText('CAREER HIGHLIGHTS', W / 2, H * 0.1)
  ctx.textAlign = 'right'
  ctx.fillStyle = PALETTE.silver
  ctx.fillText(`${d.index + 1}/${d.total}`, W * 0.96, H * 0.1)

  ctx.textAlign = 'center'
  ctx.fillStyle = PALETTE.lime
  setFont(ctx, 900, H * 0.38)
  ctx.fillText(d.value, W / 2, H * 0.5)
  ctx.fillStyle = PALETTE.white
  setFont(ctx, 700, H * 0.09)
  ctx.fillText(d.label.toUpperCase(), W / 2, H * 0.76)

  ctx.fillStyle = PALETTE.silver
  setFont(ctx, 500, H * 0.055, MONO, false)
  ctx.fillText(
    d.conversions > 0 ? `CONVERSIONS THIS VISIT: ${d.conversions}` : 'CLICK THE SCREEN FOR THE NEXT STAT',
    W / 2,
    H * 0.9,
  )
  // LED grid
  ctx.fillStyle = 'rgba(0,0,0,0.4)'
  for (let gx = 0; gx < W; gx += 5) ctx.fillRect(gx, 0, 1.4, H)
  for (let gy = 0; gy < H; gy += 5) ctx.fillRect(0, gy, W, 1.4)
}

/** Small text sprite for floating skill chips / labels. */
export function drawChip(ctx: CanvasRenderingContext2D, W: number, H: number, text: string) {
  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = 'rgba(8, 24, 16, 0.85)'
  ctx.strokeStyle = PALETTE.lime
  ctx.lineWidth = 4
  const r = H / 2 - 4
  ctx.beginPath()
  ctx.roundRect(2, 2, W - 4, H - 4, r)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = PALETTE.white
  setFont(ctx, 600, H * 0.42, MONO, false)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, W / 2, H / 2 + 2)
}

export function drawTowerPanel(ctx: CanvasRenderingContext2D, W: number, H: number) {
  ctx.fillStyle = '#1b1f1d'
  ctx.fillRect(0, 0, W, H)
  const cols = 6
  const rows = 3
  const cw = W / cols
  const rh = H / rows
  for (let c = 0; c < cols; c++)
    for (let r = 0; r < rows; r++) {
      const g = ctx.createRadialGradient(c * cw + cw / 2, r * rh + rh / 2, 1, c * cw + cw / 2, r * rh + rh / 2, cw / 2)
      g.addColorStop(0, '#ffffff')
      g.addColorStop(0.5, '#f4fbe0')
      g.addColorStop(1, '#2a2f2c')
      ctx.fillStyle = g
      ctx.fillRect(c * cw + 3, r * rh + 3, cw - 6, rh - 6)
    }
}

/** Experience totem face: a vertical LED scoreboard for one match period. */
export function drawTotem(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  d: { year: number; name: string; role: string; dates: string; index: number; active: boolean },
) {
  ctx.fillStyle = d.active ? '#0d2b1c' : '#060908'
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = d.active ? PALETTE.lime : '#1e4a30'
  ctx.fillRect(0, 0, W, 10)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  setFont(ctx, 600, 34, MONO, false)
  ctx.fillStyle = PALETTE.silver
  ctx.fillText(`PERIOD ${d.index + 1}`, W / 2, 70)
  setFont(ctx, 900, 150)
  ctx.fillStyle = PALETTE.lime
  ctx.fillText(String(d.year), W / 2, 210)
  ctx.fillStyle = PALETTE.white
  setFont(ctx, 900, 58)
  wrapText(ctx, d.name.toUpperCase(), W - 50)
    .slice(0, 2)
    .forEach((l, i) => ctx.fillText(l, W / 2, 380 + i * 66))
  ctx.fillStyle = PALETTE.silver
  setFont(ctx, 500, 34, '"Inter", sans-serif', false)
  wrapText(ctx, d.role, W - 60)
    .slice(0, 3)
    .forEach((l, i) => ctx.fillText(l, W / 2, 560 + i * 44))
  setFont(ctx, 600, 30, MONO, false)
  ctx.fillStyle = PALETTE.lime
  ctx.fillText(d.dates.toUpperCase(), W / 2, H - 90)
  ctx.fillStyle = 'rgba(0,0,0,0.35)'
  for (let gx = 0; gx < W; gx += 5) ctx.fillRect(gx, 0, 1.2, H)
  for (let gy = 0; gy < H; gy += 5) ctx.fillRect(0, gy, W, 1.2)
}

export const IU = { crimson: '#990000', crimsonDark: '#5e0000', cream: '#EEEDEB' }

/**
 * IU rugby jersey wrapped around the torso cylinder.
 * Cylinder UVs: u = 0 (and 1) is the chest, u = 0.5 is the back.
 */
export function drawJersey(ctx: CanvasRenderingContext2D, W: number, H: number) {
  ctx.fillStyle = IU.crimson
  ctx.fillRect(0, 0, W, H)
  // knit texture
  const r = rand(13)
  for (let i = 0; i < 9000; i++) {
    ctx.fillStyle = r() > 0.5 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.06)'
    ctx.fillRect(r() * W, r() * H, 2, 2)
  }
  // collar and hem
  ctx.fillStyle = IU.cream
  ctx.fillRect(0, 0, W, H * 0.06)
  ctx.fillStyle = IU.crimsonDark
  ctx.fillRect(0, H * 0.06, W, H * 0.015)
  ctx.fillRect(0, H * 0.95, W, H * 0.05)
  // cream side piping
  ctx.fillStyle = IU.cream
  for (const u of [0.25, 0.75]) ctx.fillRect(W * u - 4, H * 0.08, 8, H * 0.87)

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const outlined = (text: string, x: number, y: number) => {
    ctx.lineJoin = 'round'
    ctx.lineWidth = 10
    ctx.strokeStyle = IU.crimsonDark
    ctx.strokeText(text, x, y)
    ctx.fillStyle = IU.cream
    ctx.fillText(text, x, y)
  }

  // back: name and number
  setFont(ctx, 900, H * 0.14)
  outlined('YIGA', W / 2, H * 0.2)
  setFont(ctx, 900, H * 0.5, HEAD, false)
  outlined('13', W / 2, H * 0.6)

  // chest: IU monogram, drawn at both seams so it wraps cleanly
  setFont(ctx, 900, H * 0.24, HEAD, false)
  for (const x of [0, W]) outlined('IU', x, H * 0.36)
}

/** Cream shorts with an IU candy-stripe side panel. */
export function drawShorts(ctx: CanvasRenderingContext2D, W: number, H: number) {
  ctx.fillStyle = IU.cream
  ctx.fillRect(0, 0, W, H)
  for (const u of [0.25, 0.75]) {
    const x0 = W * u - W * 0.06
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = i % 2 ? IU.cream : IU.crimson
      ctx.fillRect(x0 + (i * W * 0.12) / 6, 0, (W * 0.12) / 6, H)
    }
  }
  ctx.fillStyle = IU.crimson
  ctx.fillRect(0, H * 0.9, W, H * 0.1)
}

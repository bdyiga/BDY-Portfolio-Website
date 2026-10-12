import { Vector3 } from 'three'
import { ball, flyBall } from './sceneState'
import { newSequence, player, playAction, runTo, waitUntil } from './player'
import { BALL_HOME, CONVERSION_LANDING, KICK, PLAYER_SPOTS, SECTION_BY_ID, type SectionId, type Vec3 } from './sections'

/**
 * Multi-step plays for #13 and the ball. Every step checks `alive()` so a
 * new navigation cleanly cancels whatever play was running.
 */

const v = (a: Vec3) => new Vector3(a[0], a[1], a[2])
const isCarried = () => ball.mode === 'carried'
const ballFree = () => ball.mode === 'idle' || isCarried()

/** Run to the ball (wherever it came to rest) and pick it up. */
async function fetchBall(alive: () => boolean, instant: boolean): Promise<boolean> {
  if (isCarried()) return true
  if (!(await waitUntil(ballFree, alive, 6000))) return false
  if (isCarried()) return true
  const b = ball.pos.clone().setY(0)
  const away = player.pos.clone().setY(0).sub(b)
  if (away.lengthSq() < 1e-3) away.set(0, 0, 1)
  away.normalize()
  if (!(await runTo(b.clone().addScaledVector(away, 1.1), { face: b, instant })) || !alive()) return false
  return playAction('pickup', {
    at: 0.45,
    instant,
    face: b,
    onAt: () => {
      ball.tween?.kill()
      ball.mode = 'carried'
    },
  })
}

/** Carry the ball to a spot and set it down (on the tee, for home and the posts). */
async function placeAt(spot: Vec3, alive: () => boolean, instant: boolean): Promise<boolean> {
  const s = v(spot).setY(0)
  const approach = player.pos.clone().setY(0).sub(s)
  if (approach.lengthSq() < 1e-3) approach.set(0, 0, 1)
  approach.normalize()
  if (!(await runTo(s.clone().addScaledVector(approach, 1.1), { face: s, instant })) || !alive()) return false
  return playAction('place', {
    at: 0.5,
    instant,
    face: s,
    onAt: () => flyBall(spot, { height: 0.3, duration: 0.25, instant }),
  })
}

/** Conversion: ball on the tee, run-up, plant, boot. */
async function conversion(alive: () => boolean, instant: boolean, onContact: () => void) {
  const tee = v(SECTION_BY_ID.contact.ballSpot)
  const onTee = () => ball.mode === 'idle' && ball.pos.distanceTo(tee) < 1
  if (!onTee()) {
    if (!(await fetchBall(alive, instant)) || !alive()) return
    if (!(await placeAt(SECTION_BY_ID.contact.ballSpot, alive, instant)) || !alive()) return
    if (!(await waitUntil(onTee, alive)) || !alive()) return
  }
  if (!(await runTo(KICK.runUp, { face: tee, instant })) || !alive()) return
  if (!(await runTo(KICK.plant, { speed: 6, face: CONVERSION_LANDING, instant })) || !alive()) return
  await playAction('kick', { at: 0.45, onAt: onContact, instant, face: CONVERSION_LANDING })
}

/** The play that runs whenever a section opens (or the visitor returns to the overview). */
export async function deliver(section: SectionId | null, instant: boolean, onConversionContact: () => void) {
  const alive = newSequence()
  if (section === 'contact') return conversion(alive, instant, onConversionContact)

  if (!(await fetchBall(alive, instant)) || !alive()) return
  const spot = PLAYER_SPOTS[section ?? 'home']

  if (section === null || section === 'about') {
    // the ball goes back on its kicking tee at center field
    if (!(await placeAt(BALL_HOME, alive, instant)) || !alive()) return
    if (!(await runTo(spot.pos, { face: spot.face, instant })) || !alive()) return
    if (section === 'about' && !instant) await playAction('wave', { face: spot.face })
    return
  }

  // carry it over, spin-pass it into the zone, then present the content
  const target = SECTION_BY_ID[section].ballSpot
  if (!(await runTo(spot.pos, { face: target, instant })) || !alive()) return
  if (!(await playAction('pass', { at: 0.55, instant, face: target, onAt: () => flyBall(target, { style: 'spiral', instant }) })) || !alive()) return
  if (!instant) await playAction('point', { face: spot.face })
  else player.targetYaw = Math.atan2(spot.face[0] - spot.pos[0], spot.face[2] - spot.pos[2])
}

/** "Kick again" / the K key. */
export function kickAgain(instant: boolean, onConversionContact: () => void) {
  if (player.action === 'kick' || ball.mode === 'flight' || ball.mode === 'physics') return
  return conversion(newSequence(), instant, onConversionContact)
}

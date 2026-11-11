import { use, useEffect, useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import {
  AnimationMixer,
  Bone,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Group,
  MathUtils,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  ShaderChunk,
  SkinnedMesh,
  Vector3,
  type AnimationAction,
  type Texture,
} from 'three'
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import athleteUrl from '../assets/athlete.glb?url'
import { player, playAction, yawTo, type Action } from '../lib/player'
import { ACTIONS, IDLE, KEYS, sample, wrapAngle, type Pose } from '../lib/poses'
import { ball, BALL_CARRY_SCALE } from '../lib/sceneState'
import { SECTION_BY_ID } from '../lib/sections'
import { IU, setFont, HEAD } from '../lib/textures'
import { useStore } from '../state/store'
import { BALL_LENGTH, BALL_RADIUS } from './RugbyBall'
import { useCanvasTexture } from './useCanvasTexture'

/**
 * The rigged #13: a CC0 base character (Quaternius) driven by motion-capture
 * clips, with the kit painted on in the shader and the hand-keyed moves from
 * poses.ts layered on top. Two-bone IK keeps his hands on the ball wherever
 * the clips and the moves put it.
 */

/** Model is 1.81 m; the stadium's #13 has always been drawn at hero scale (hips at 1.61 m). */
const S = 1.7
const SKIN = new Color('#6b4226')
/** Average skin colour of the base texture; the shader re-tones it to SKIN. */
const TEXTURE_SKIN = new Color('#a67450')

let request: Promise<GLTF> | null = null
function loadAthlete() {
  if (!request) {
    request = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(athleteUrl)
    // a failed load is handled by Player's fallback; don't also report it as unhandled
    request.catch(() => {})
  }
  return request
}

/* ------------------------------------------------------------------ */
/* Kit                                                                 */
/* ------------------------------------------------------------------ */

/** Name and number for the back (left half) and the chest crest (right half). */
function drawPrint(ctx: CanvasRenderingContext2D, W: number, H: number) {
  ctx.clearRect(0, 0, W, H)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const outlined = (text: string, x: number, y: number, line: number) => {
    ctx.lineJoin = 'round'
    ctx.lineWidth = line
    ctx.strokeStyle = IU.crimsonDark
    ctx.strokeText(text, x, y)
    ctx.fillStyle = IU.cream
    ctx.fillText(text, x, y)
  }
  const half = W / 2
  setFont(ctx, 900, H * 0.15)
  outlined('YIGA', half / 2, H * 0.16, 8)
  setFont(ctx, 900, H * 0.56, HEAD, false)
  outlined('13', half / 2, H * 0.58, 12)
  setFont(ctx, 900, H * 0.5, HEAD, false)
  outlined('IU', half + half / 2, H * 0.5, 14)
}

/**
 * Paints the kit onto the bare base mesh by where each point sits in the bind
 * pose (a T-pose, metres, facing +Z): boots, hooped socks, cream shorts with
 * crimson side stripes, the crimson jersey with cream cuffs and a buttoned
 * placket, a short dark crop, and the skin toned to match. With `shell`, it
 * colours the loose jersey that sits over the body instead (all shirt).
 */
function dressBody(base: MeshStandardMaterial, print: Texture, shell = false) {
  const m = base.clone()
  if (shell) m.defines = { ...m.defines, SHELL: '' }
  m.roughness = 0.62
  m.metalness = 0
  const uniforms = {
    uPrint: { value: print },
    uCrimson: { value: new Color(IU.crimson) },
    uCream: { value: new Color(IU.cream) },
    uBoot: { value: new Color('#101010') },
    uHair: { value: new Color('#120d0a') },
    uSkin: { value: new Color(SKIN.r / TEXTURE_SKIN.r, SKIN.g / TEXTURE_SKIN.g, SKIN.b / TEXTURE_SKIN.b) },
  }
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vBind;\nvarying vec3 vBindN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBind = position;\nvBindN = normal;')
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec3 vBind;
varying vec3 vBindN;
uniform sampler2D uPrint;
uniform vec3 uCrimson, uCream, uBoot, uHair, uSkin;
float above(float y, float edge) { float w = max(fwidth(y), 1e-4); return smoothstep(edge - w, edge + w, y); }`,
      )
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
vec3 kp = vBind;
vec3 kn = normalize(vBindN);
float ax = abs(kp.x);
float neckR = length(vec2(kp.x, kp.z + 0.02));
float lum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
float shade = clamp(lum / 0.32, 0.6, 1.25);

float boot = 1.0 - above(kp.y, 0.135);
float sock = (1.0 - boot) * (1.0 - above(kp.y, 0.5));
float hoop = sock * above(kp.y, 0.41) * (1.0 - above(kp.y, 0.45));
float shorts = above(kp.y, 0.7) * (1.0 - above(kp.y, 0.99));
float shortsHem = shorts * (1.0 - above(kp.y, 0.725));
float stripe = shorts * step(0.04, ax) * step(0.55, sign(kp.x) * kn.x) * (1.0 - above(abs(kp.z + 0.035), 0.02));
float torso = above(kp.y, 0.97) * (1.0 - above(ax, 0.37));
float neckOpen = (1.0 - above(neckR, 0.09)) * above(kp.y, 1.47);
float jersey = torso * (1.0 - neckOpen) * (1.0 - above(kp.y, mix(1.53, 1.62, above(ax, 0.1))));
#ifdef SHELL
// the loose shirt: all of it is jersey, nothing of the body shows through
jersey = 1.0; boot = 0.0; sock = 0.0; hoop = 0.0; shorts = 0.0; shortsHem = 0.0; stripe = 0.0;
#endif
float cuff = jersey * above(ax, 0.35);
float piping = jersey * step(0.85, abs(kn.x)) * step(ax, 0.26) * (1.0 - above(abs(kp.z + 0.01), 0.007)) * (1.0 - above(kp.y, 1.38));
// a polo placket down the front of the collar, three buttons
float placket = jersey * step(0.0, kp.z) * step(0.3, kn.z) * (1.0 - above(ax, 0.017)) * above(kp.y, 1.37);
float bd = min(min(abs(kp.y - 1.395), abs(kp.y - 1.43)), abs(kp.y - 1.465));
float button = placket * (1.0 - above(length(vec2(kp.x, bd)), 0.0055));
float hairline = mix(1.665, 1.772, smoothstep(-0.06, 0.075, kp.z));
float hair = above(kp.y, hairline) * (1.0 - above(neckR, 0.16)) * above(kp.y, 1.58);
#ifdef SHELL
hair = 0.0;
#endif

float kit = clamp(boot + sock + shorts + jersey, 0.0, 1.0);
vec3 kitCol = uCrimson;
kitCol = mix(kitCol, uCream, shorts);
kitCol = mix(kitCol, uCrimson, max(shortsHem, stripe));
kitCol = mix(kitCol, uCrimson, jersey);
kitCol = mix(kitCol, uCream, max(max(placket, cuff), piping));
kitCol = mix(kitCol, uCrimson * 0.6, button);
kitCol = mix(kitCol, uCream, hoop);
kitCol = mix(kitCol, uBoot, boot);

// name and number on the back, crest on the chest (projected straight on, like a transfer)
vec2 backUv = vec2(0.25 - kp.x / 0.34 * 0.5, (kp.y - 1.06) / 0.34);
float onBack = jersey * step(kp.z, 0.0) * step(kn.z, -0.3) * step(abs(backUv.x - 0.25), 0.25) * step(0.0, backUv.y) * step(backUv.y, 1.0);
vec2 chestUv = vec2(0.75 + (kp.x - 0.085) / 0.1 * 0.5, (kp.y - 1.31) / 0.1);
float onChest = jersey * step(0.0, kp.z) * step(0.3, kn.z) * step(abs(chestUv.x - 0.75), 0.25) * step(0.0, chestUv.y) * step(chestUv.y, 1.0);
vec4 ink = texture2D(uPrint, onBack > 0.5 ? backUv : chestUv) * max(onBack, onChest);
kitCol = mix(kitCol, ink.rgb, ink.a);

vec3 skin = diffuseColor.rgb * uSkin;
diffuseColor.rgb = mix(skin, kitCol * shade, kit);
diffuseColor.rgb = mix(diffuseColor.rgb, uHair * shade, hair * (1.0 - kit));
float cloth = max(kit, hair);`,
      )
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.86, cloth);\nroughnessFactor = mix(roughnessFactor, 0.35, boot);')
      .replace(
        '#include <normal_fragment_maps>',
        ShaderChunk.normal_fragment_maps.replace('mapN.xy *= normalScale;', 'mapN.xy *= normalScale * mix(1.0, 0.3, cloth);'),
      )
  }
  m.customProgramCacheKey = () => (shell ? 'athlete-shell' : 'athlete-kit')
  return m
}

/* ------------------------------------------------------------------ */
/* The shirt: a loose jersey shell and a polo collar                   */
/* ------------------------------------------------------------------ */

const smooth01 = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/** Bind-pose points the shirt covers: the torso and short sleeves, down over the hips, open at the neck. */
function inShirt(x: number, y: number, z: number) {
  const ax = Math.abs(x)
  if (y < 0.955 || ax > 0.372) return false
  if (Math.hypot(x, z + 0.02) < 0.092 && y > 1.47) return false
  return y <= (ax > 0.1 ? 1.62 : 1.53)
}

/**
 * The jersey as its own surface, so he wears a shirt instead of body paint:
 * the body's own triangles under the shirt, pushed out along their normals.
 * It sits close at the chest, looser at the cuffs, and hangs untucked over the
 * shorts at the hem. Same skeleton and weights, so it moves with him.
 */
function buildShell(body: SkinnedMesh, material: MeshStandardMaterial) {
  const g = body.geometry
  const pos = g.attributes.position
  const nor = g.attributes.normal
  const uv = g.attributes.uv
  const si = g.attributes.skinIndex
  const sw = g.attributes.skinWeight
  const index = g.index!
  const ok = (i: number) => inShirt(pos.getX(i), pos.getY(i), pos.getZ(i))
  const tris: number[] = []
  for (let t = 0; t < index.count; t += 3) {
    const a = index.getX(t)
    const b = index.getX(t + 1)
    const c = index.getX(t + 2)
    if (ok(a) && ok(b) && ok(c)) tris.push(a, b, c)
  }
  const keep = new Int32Array(pos.count).fill(-1)
  let n = 0
  for (const i of tris) if (keep[i] < 0) keep[i] = n++
  const P = new Float32Array(n * 3)
  const N = new Float32Array(n * 3)
  const U = new Float32Array(n * 2)
  const SI = new Uint16Array(n * 4)
  const SW = new Float32Array(n * 4)
  const nv = new Vector3()
  for (let i = 0; i < pos.count; i++) {
    const j = keep[i]
    if (j < 0) continue
    const x = pos.getX(i)
    const y = pos.getY(i)
    nv.set(nor.getX(i), nor.getY(i), nor.getZ(i)).normalize()
    // close at the chest, a little looser in the sleeves, hanging off the hips at the hem
    const off = 0.009 + 0.018 * smooth01(1.04, 0.955, y) + 0.007 * smooth01(0.26, 0.37, Math.abs(x))
    P.set([x + nv.x * off, y + nv.y * off, pos.getZ(i) + nv.z * off], j * 3)
    N.set([nv.x, nv.y, nv.z], j * 3)
    if (uv) U.set([uv.getX(i), uv.getY(i)], j * 2)
    SI.set([si.getX(i), si.getY(i), si.getZ(i), si.getW(i)], j * 4)
    SW.set([sw.getX(i), sw.getY(i), sw.getZ(i), sw.getW(i)], j * 4)
  }
  const geo = new BufferGeometry()
  geo.setAttribute('position', new BufferAttribute(P, 3))
  geo.setAttribute('normal', new BufferAttribute(N, 3))
  geo.setAttribute('uv', new BufferAttribute(U, 2))
  geo.setAttribute('skinIndex', new BufferAttribute(SI, 4))
  geo.setAttribute('skinWeight', new BufferAttribute(SW, 4))
  geo.setIndex(tris.map((i) => keep[i]))
  const mesh = new SkinnedMesh(geo, material)
  mesh.name = 'Jersey'
  mesh.bind(body.skeleton, body.bindMatrix)
  mesh.castShadow = true
  mesh.frustumCulled = false
  return mesh
}

/**
 * A polo collar in cream: a band standing up from the neckline and folded
 * down over it, open at the front where the placket starts, with the points
 * of the collar resting on the chest. Rides on the neck and the upper chest.
 */
function buildCollar(body: SkinnedMesh) {
  const bones = body.skeleton.bones
  const neck = bones.findIndex((b) => b.name === 'neck_01')
  const chest = bones.findIndex((b) => b.name === 'spine_03')
  const SEG = 48
  const gap = 0.3 // half the opening at the front, radians
  // rows from the neckline up the stand, then out and down the fold
  const rows = [
    { r: 0.089, dy: 0, out: 0 },
    { r: 0.091, dy: 0.022, out: 0 },
    { r: 0.101, dy: 0.014, out: 1 },
    { r: 0.11, dy: 0.004, out: 1 },
  ]
  const P: number[] = []
  const I: number[] = []
  for (let k = 0; k <= SEG; k++) {
    const th = gap + ((Math.PI * 2 - gap * 2) * k) / SEG
    const front = Math.cos(th)
    // the neckline dips at the front; the collar points drop onto the chest
    const base = 1.505 - 0.024 * front
    const tip = smooth01(gap + 0.55, gap, Math.min(th, Math.PI * 2 - th))
    for (const row of rows) {
      const r = row.r + row.out * tip * 0.012
      const y = base + row.dy - row.out * tip * 0.018
      P.push(Math.sin(th) * r, y, Math.cos(th) * r - 0.02)
    }
  }
  const R = rows.length
  for (let k = 0; k < SEG; k++)
    for (let j = 0; j < R - 1; j++) {
      const a = k * R + j
      const b = (k + 1) * R + j
      I.push(a, b, a + 1, b, b + 1, a + 1)
    }
  const n = P.length / 3
  const geo = new BufferGeometry()
  geo.setAttribute('position', new BufferAttribute(new Float32Array(P), 3))
  geo.setAttribute('skinIndex', new BufferAttribute(new Uint16Array(Array.from({ length: n }, () => [neck, chest, 0, 0]).flat()), 4))
  geo.setAttribute('skinWeight', new BufferAttribute(new Float32Array(Array.from({ length: n }, () => [0.6, 0.4, 0, 0]).flat()), 4))
  geo.setIndex(I)
  geo.computeVertexNormals()
  const mesh = new SkinnedMesh(geo, new MeshStandardMaterial({ color: IU.cream, roughness: 0.85, side: DoubleSide }))
  mesh.name = 'Collar'
  mesh.bind(body.skeleton, body.bindMatrix)
  mesh.castShadow = true
  mesh.frustumCulled = false
  return mesh
}

/* ------------------------------------------------------------------ */
/* Rig                                                                 */
/* ------------------------------------------------------------------ */

const X = new Vector3(1, 0, 0)
const Y = new Vector3(0, 1, 0)
const Z = new Vector3(0, 0, 1)
const ID = new Quaternion()

const _q = new Quaternion()
const _qa = new Quaternion()
const _pq = new Quaternion()
const _bq = new Quaternion()
const _A = new Vector3()
const _B = new Vector3()
const _C = new Vector3()
const _E = new Vector3()
const _T = new Vector3()
const _d = new Vector3()
const _bend = new Vector3()
const _u = new Vector3()
const _w = new Vector3()
const _m1 = new Matrix4()
const _m2 = new Matrix4()
const _s1 = new Vector3()
const _s2 = new Vector3()
const _s3 = new Vector3()
const _h = Array.from({ length: 6 }, () => new Vector3())
const _lk = { q: new Quaternion(), inv: new Quaternion(), a: new Vector3(), want: new Vector3(), cur: new Vector3() }
const _pose = { ...IDLE } as Pose

/**
 * Hand-keyed targets for the kick (right foot), as wrist positions in his own
 * frame (metres: x to his left, y up, z ahead). The left arm flies out wide for
 * balance as the leg swings, then comes across on the follow-through; the right
 * arm goes back and out, then swings forward with the leg.
 */
const KICK_HANDS: Record<'l' | 'r', [number, [number, number, number]][]> = {
  l: [
    [0, [0.85, 2.3, 0.3]],
    [0.18, [0.9, 2.35, 0.25]],
    [0.45, [1.15, 2.5, 0.05]],
    [0.7, [1.0, 2.4, 0.4]],
    [1, [1.0, 2.4, 0.4]],
  ],
  r: [
    [0, [-0.6, 1.8, -0.45]],
    [0.18, [-0.65, 1.8, -0.5]],
    [0.45, [-0.8, 1.85, -0.55]],
    [0.7, [-0.4, 2.05, 0.6]],
    [1, [-0.4, 2.05, 0.6]],
  ],
}
function keyed(frames: [number, [number, number, number]][], t: number, out: Vector3) {
  let i = 0
  while (i < frames.length - 2 && t > frames[i + 1][0]) i++
  const [t0, a] = frames[i]
  const [t1, b] = frames[i + 1]
  const k = MathUtils.smoothstep((t - t0) / Math.max(1e-4, t1 - t0), 0, 1)
  return out.set(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k)
}
/** Finger curl around the ball, per joint (base, middle, tip); the little finger closes a touch more. */
const CURL = [0.35, 0.6, 0.45]

type Loop = 'walk' | 'jog' | 'sprint'
const LOOPS: Loop[] = ['walk', 'jog', 'sprint']
const FINGERS = ['index', 'middle', 'ring', 'pinky']

/** Rotate a bone by a world-space rotation, keeping its parent where it is. */
function applyWorld(bone: Object3D, q: Quaternion) {
  bone.parent!.getWorldQuaternion(_pq)
  bone.getWorldQuaternion(_bq)
  _bq.premultiply(q)
  bone.quaternion.copy(_pq.invert().multiply(_bq))
  bone.updateMatrixWorld(true)
}

function rotateTo(bone: Object3D, from: Vector3, to: Vector3, w: number) {
  _q.setFromUnitVectors(from.normalize(), to.normalize())
  if (w < 1) _q.slerp(ID, 1 - w)
  applyWorld(bone, _q)
}

/** Analytic two-bone IK: bends a-b-c so c reaches `target`, with the middle joint toward `pole`. */
function twoBone(a: Object3D, b: Object3D, c: Object3D, target: Vector3, pole: Vector3, w: number) {
  if (w < 0.002) return
  a.getWorldPosition(_A)
  b.getWorldPosition(_B)
  c.getWorldPosition(_C)
  const la = _A.distanceTo(_B)
  const lb = _B.distanceTo(_C)
  _d.subVectors(target, _A)
  const reach = MathUtils.clamp(_d.length(), Math.abs(la - lb) + 1e-3, (la + lb) * 0.999)
  _d.normalize()
  _bend.subVectors(pole, _A)
  _bend.addScaledVector(_d, -_bend.dot(_d)).normalize()
  const cosA = MathUtils.clamp((la * la + reach * reach - lb * lb) / (2 * la * reach), -1, 1)
  _E.copy(_A).addScaledVector(_d, la * cosA).addScaledVector(_bend, la * Math.sqrt(1 - cosA * cosA))
  rotateTo(a, _u.subVectors(_B, _A), _w.subVectors(_E, _A), w)
  b.getWorldPosition(_B)
  c.getWorldPosition(_C)
  _T.copy(_A).addScaledVector(_d, reach)
  rotateTo(b, _u.subVectors(_C, _B), _w.subVectors(_T, _B), w)
}

function buildRig(scene: Object3D) {
  const bones = new Map<string, Bone>()
  scene.traverse((o) => {
    if ((o as Bone).isBone) bones.set(o.name, o as Bone)
  })
  const bone = (n: string) => {
    const b = bones.get(n)
    if (!b) throw new Error(`athlete: missing bone ${n}`)
    return b
  }
  scene.updateMatrixWorld(true)
  const rootInv = scene.getWorldQuaternion(new Quaternion()).invert()
  /** Bind-pose orientation of a bone relative to the character. */
  const bindRel = (b: Bone) => rootInv.clone().multiply(b.getWorldQuaternion(new Quaternion()))
  /** A character-space axis, expressed in the bone's own frame at bind. */
  const localAxis = (b: Bone, axis: Vector3) => axis.clone().applyQuaternion(bindRel(b).invert())
  /** A point given in bind-pose model metres, expressed in the bone's frame (so it rides with the bone). */
  const attach = (b: Bone, p: Vector3) => b.worldToLocal(scene.localToWorld(p.clone()))

  const side = (s: 'l' | 'r') => {
    const sign = s === 'l' ? 1 : -1
    const upper = bone(`upperarm_${s}`)
    const lower = bone(`lowerarm_${s}`)
    const hand = bone(`hand_${s}`)
    const thigh = bone(`thigh_${s}`)
    const calf = bone(`calf_${s}`)
    const foot = bone(`foot_${s}`)
    return {
      sign,
      upper,
      lower,
      hand,
      thigh,
      calf,
      foot,
      // the T-pose elbow hinges about the vertical; the knee about the side axis
      elbowAxis: localAxis(lower, Y),
      kneeAxis: localAxis(calf, X),
      // T-pose hands: palms down, fingers pointing out along the arm
      palm: localAxis(hand, new Vector3(0, -1, 0)),
      finger: localAxis(hand, new Vector3(sign, 0, 0)),
      fingers: FINGERS.flatMap((f) => [1, 2, 3].map((i) => bone(`${f}_0${i}_${s}`))).map((b) => ({ b, axis: localAxis(b, Z) })),
    }
  }

  const chest = bone('spine_03')
  const neck = bone('neck_01')
  const head = bone('Head')
  return {
    bones,
    pelvis: bone('pelvis'),
    spine: [bone('spine_01'), bone('spine_02'), chest],
    neck,
    head,
    chest,
    chestBind: bindRel(chest),
    /** Undo each bone's bind orientation, so character-forward can be read off it. */
    unbind: { neck: bindRel(neck).invert(), head: bindRel(head).invert() },
    l: side('l'),
    r: side('r'),
    /** Where the ball sits: in front of the stomach in two hands, or tucked under an arm. */
    carry: attach(chest, new Vector3(0, 1.24, 0.3)),
    tuck: { r: attach(chest, new Vector3(-0.2, 1.17, 0.1)), l: attach(chest, new Vector3(0.2, 1.17, 0.1)) },
  }
}

type Rig = ReturnType<typeof buildRig>
type Side = Rig['l']

/* ------------------------------------------------------------------ */
/* Athlete                                                             */
/* ------------------------------------------------------------------ */

const smoothstep = (a: number, b: number, x: number) => {
  const t = MathUtils.clamp((x - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}

/** Where the left foot is furthest forward in a loop (0..1), and how far the clip travels per second. */
function measureLoop(mixer: AnimationMixer, action: AnimationAction, scene: Object3D, foot: Object3D) {
  const dur = action.getClip().duration
  action.reset().setEffectiveWeight(1).play()
  let min = Infinity
  let max = -Infinity
  let front = 0
  const p = new Vector3()
  for (let i = 0; i < 32; i++) {
    action.time = (dur * i) / 32
    mixer.update(0)
    scene.updateMatrixWorld(true)
    scene.worldToLocal(foot.getWorldPosition(p))
    if (p.z > max) {
      max = p.z
      front = i / 32
    }
    min = Math.min(min, p.z)
  }
  action.stop()
  // two steps per cycle, each as long as the foot's sweep under the body
  return { offset: front, speed: (2 * (max - min) * S) / dur, cycle: 2 * (max - min) * S }
}

export default function Athlete() {
  const gltf = use(loadAthlete())
  const quality = useStore((s) => s.quality)
  const print = useCanvasTexture(1024, 512, drawPrint)
  const root = useRef<Group>(null)
  const shadow = useRef<Mesh>(null)

  const rigged = useMemo(() => {
    const scene = gltf.scene
    scene.scale.setScalar(S)
    scene.position.set(0, 0, 0)
    scene.rotation.set(0, 0, 0)
    let body: SkinnedMesh | null = null
    scene.traverse((o) => {
      const m = o as SkinnedMesh
      if (!m.isSkinnedMesh || m.name === 'Jersey' || m.name === 'Collar') return
      m.frustumCulled = false
      m.castShadow = true
      const mat = m.material as MeshStandardMaterial
      if (mat.name === 'MI_Superhero_Male') {
        body = m
        if (!m.userData.base) m.userData.base = mat
        m.material = dressBody(m.userData.base as MeshStandardMaterial, print)
      } else if (mat.name === 'MI_Hair_1') mat.color.set('#3a2a20')
    })
    // the shirt and its collar, built once (the memo can run twice in development)
    const dressed = body as SkinnedMesh | null
    if (dressed && !dressed.parent?.getObjectByName('Jersey')) {
      dressed.parent!.add(buildShell(dressed, dressBody(dressed.userData.base as MeshStandardMaterial, print, true)), buildCollar(dressed))
    }
    const rig = buildRig(scene)
    const mixer = new AnimationMixer(scene)
    const clip = (n: string) => {
      const c = gltf.animations.find((a) => a.name === n)
      if (!c) throw new Error(`athlete: missing clip ${n}`)
      return mixer.clipAction(c)
    }
    const idle = clip('idle')
    const loops = Object.fromEntries(
      LOOPS.map((n) => {
        const a = clip(n)
        return [n, { action: a, ...measureLoop(mixer, a, scene, rig.l.foot) }]
      }),
    ) as Record<Loop, { action: AnimationAction; offset: number; speed: number; cycle: number }>
    return { scene, rig, mixer, idle, loops }
  }, [gltf, print])

  const state = useRef({
    cur: { ...IDLE } as Pose,
    target: { ...IDLE } as Pose,
    prev: player.pos.clone(),
    prevYaw: player.yaw,
    speed: 0,
    bank: 0,
    phase: 0,
    carry: 0,
    tuck: 0,
    /** Which arm the ball is tucked under at speed: 1 left, -1 right (the arm away from the turn). */
    tuckSide: -1,
    /** Where his eyes are, and how much he is looking there. */
    lookAt: new Vector3(),
    lookW: 0,
    /** 0 when the ball has just been taken, 1 once it is settled in his hands. */
    grab: 0,
    feet: [new Vector3(), new Vector3()],
    ballAt: new Vector3(),
    hold: new Quaternion(),
  })

  useEffect(() => {
    const { mixer, idle, loops } = rigged
    idle.play()
    // the loops are scrubbed by the stride phase, never by the mixer's clock
    for (const n of LOOPS) loops[n].action.setEffectiveTimeScale(0).setEffectiveWeight(0).play()
    return () => void mixer.stopAllAction()
  }, [rigged])

  useFrame((frame, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30)
    const s = state.current
    const t = frame.clock.elapsedTime
    const { reducedMotion, hovered, phase } = useStore.getState()
    const { scene, rig, mixer, idle, loops } = rigged
    const g = root.current
    if (!g) return

    /* ---- where he is and how fast he is really going ---- */
    const moved = Math.hypot(player.pos.x - s.prev.x, player.pos.z - s.prev.z)
    const v = dt > 0 ? moved / dt : 0
    s.speed += (v - s.speed) * (1 - Math.exp(-dt * 12))
    player.yaw += wrapAngle(player.targetYaw - player.yaw) * Math.min(1, dt * 9)
    const yawRate = dt > 0 ? wrapAngle(player.yaw - s.prevYaw) / dt : 0
    s.prevYaw = player.yaw
    // lean into the turn, harder the faster he goes
    s.bank += (MathUtils.clamp(-yawRate * s.speed * 0.012, -0.32, 0.32) - s.bank) * (1 - Math.exp(-dt * 8))
    g.position.set(player.pos.x, 0, player.pos.z)
    g.rotation.set(0, player.yaw, s.bank, 'YXZ')

    /* ---- locomotion: idle -> walk -> jog -> sprint, sharing one stride phase ---- */
    const sp = s.speed
    const marks = [0, loops.walk.speed, loops.jog.speed, loops.sprint.speed]
    const w = [0, 0, 0, 0]
    if (sp >= marks[3]) w[3] = 1
    else {
      let i = 0
      while (sp > marks[i + 1]) i++
      const k = (sp - marks[i]) / (marks[i + 1] - marks[i])
      w[i] = 1 - k
      w[i + 1] = k
    }
    let cycle = 0
    let moving = 0
    LOOPS.forEach((n, i) => {
      cycle += w[i + 1] * loops[n].cycle
      moving += w[i + 1]
    })
    if (moving > 0) s.phase = (s.phase + (Math.min(sp, marks[3] * 1.3) * dt) / (cycle / moving)) % 1
    idle.setEffectiveWeight(w[0])
    idle.setEffectiveTimeScale(reducedMotion ? 0 : 1)
    LOOPS.forEach((n, i) => {
      const l = loops[n]
      l.action.setEffectiveWeight(w[i + 1])
      l.action.time = ((s.phase + l.offset) % 1) * l.action.getClip().duration
    })
    mixer.update(dt)
    scene.position.y = 0
    g.updateMatrixWorld(true)

    /* ---- the hand-keyed layer: actions, glances, crouches ---- */
    const target = s.target
    const act: Action | null = player.mode === 'action' ? player.action : null
    if (act) {
      sample(ACTIONS[act], player.actionT, target)
      if (act === 'wave' && player.actionT > 0.15 && player.actionT < 0.85) target.rEl += 0.45 * Math.sin(t * 16)
    } else {
      Object.assign(target, IDLE)
      if (hovered && phase === 'world' && player.mode === 'idle') {
        const diff = MathUtils.clamp(wrapAngle(yawTo(player.pos, SECTION_BY_ID[hovered].hotspot) - player.yaw), -1.1, 1.1)
        target.twist = diff * 0.45
        target.head = diff * 0.5
      }
    }
    const k = 1 - Math.exp(-dt * 14)
    for (const key of KEYS) s.cur[key] += (target[key] - s.cur[key]) * k
    const p = s.cur
    const d = (key: keyof Pose) => p[key] - IDLE[key]

    rig.l.foot.getWorldPosition(s.feet[0])
    rig.r.foot.getWorldPosition(s.feet[1])
    scene.position.y = p.bob
    g.updateMatrixWorld(true)

    const charQ = g.getWorldQuaternion(new Quaternion())
    const charInv = charQ.clone().invert()
    const turn = (b: Object3D, axis: Vector3, angle: number) => {
      if (Math.abs(angle) < 1e-4) return
      _qa.setFromAxisAngle(axis, angle)
      applyWorld(b, _q.copy(charQ).multiply(_qa).multiply(charInv))
    }
    const hinge = (b: Object3D, axis: Vector3, angle: number) => {
      if (Math.abs(angle) < 1e-4) return
      b.quaternion.multiply(_qa.setFromAxisAngle(axis, angle))
      b.updateMatrixWorld(true)
    }
    for (const b of rig.spine) {
      turn(b, X, d('lean') / 3)
      turn(b, Y, d('twist') / 3)
    }
    turn(rig.head, Y, d('head'))
    for (const sd of [rig.l, rig.r]) {
      const L = sd === rig.l
      turn(sd.upper, X, -d(L ? 'lShX' : 'rShX'))
      turn(sd.upper, Z, sd.sign * d(L ? 'lShZ' : 'rShZ'))
      hinge(sd.lower, sd.elbowAxis, -sd.sign * d(L ? 'lEl' : 'rEl'))
      turn(sd.thigh, X, -d(L ? 'lHip' : 'rHip'))
      hinge(sd.calf, sd.kneeAxis, d(L ? 'lKnee' : 'rKnee'))
    }

    const at = player.actionT
    const env = (a: number, b: number) => smoothstep(0, a, at) * (1 - smoothstep(b, 1, at))
    const kickEnv = act === 'kick' ? env(0.12, 0.85) : 0
    const passEnv = act === 'pass' ? env(0.15, 0.85) : 0
    const charPoint = (x: number, y: number, z: number, out: Vector3) => out.set(x, y, z).applyQuaternion(charQ).add(g.position)

    // the pass is driven from the hips: they turn a beat before the shoulders
    if (passEnv > 0) {
      sample(ACTIONS.pass, Math.min(1, at + 0.12), _pose)
      turn(rig.pelvis, Y, (_pose.twist - IDLE.twist) * 0.5 * passEnv)
    }

    // feet stay planted in a crouch, through the pass, and under the standing leg of the kick
    const plant = MathUtils.clamp(-p.bob * 6, 0, 1)
    const sides: [Side, Vector3, number][] = [
      [rig.l, s.feet[0], Math.max(plant, passEnv, kickEnv)],
      [rig.r, s.feet[1], act === 'kick' ? 0 : Math.max(plant, passEnv)],
    ]
    for (const [sd, foot, wFoot] of sides) {
      if (wFoot < 0.002) continue
      sd.thigh.getWorldPosition(_s1)
      const pole = _s2.set(sd.sign * 0.3, 0, 2).applyQuaternion(charQ).add(_s1)
      twoBone(sd.thigh, sd.calf, sd.foot, foot, pole, wFoot)
    }

    /* ---- the ball: where it sits, and both hands on it ---- */
    const carried = ball.mode === 'carried'
    const passing = act === 'pass'
    s.carry += ((carried ? 1 : 0) - s.carry) * (1 - Math.exp(-dt * (carried ? 14 : 6)))
    // at speed the ball goes under one arm: the one away from the turn. Switching arms goes through both hands
    if (carried && !act && Math.abs(yawRate) > 0.8 && sp > loops.jog.speed) {
      const want = yawRate > 0 ? -1 : 1
      if (want !== s.tuckSide && s.tuck < 0.08) s.tuckSide = want
    }
    const wantSide = carried && !act && Math.abs(yawRate) > 0.8 && sp > loops.jog.speed ? (yawRate > 0 ? -1 : 1) : s.tuckSide
    const tuckGoal = carried && !act && wantSide === s.tuckSide ? smoothstep(loops.jog.speed * 1.05, loops.sprint.speed * 0.9, sp) : 0
    s.tuck += (tuckGoal - s.tuck) * (1 - Math.exp(-dt * 6))
    const side = s.tuckSide
    const tuckArm = side < 0 ? rig.r : rig.l

    const chestQ = rig.chest.getWorldQuaternion(new Quaternion()).multiply(rig.chestBind.clone().invert())
    const fwd = _s1.copy(Z).applyQuaternion(chestQ)
    const up = _s2.copy(Y).applyQuaternion(chestQ)
    const lat = _s3.copy(X).applyQuaternion(chestQ)

    const anchor = rig.chest.localToWorld(_T.copy(rig.carry))
    const tuckAt = rig.chest.localToWorld(_E.copy(side < 0 ? rig.tuck.r : rig.tuck.l))
    anchor.lerp(tuckAt, s.tuck)
    if (carried && !act) {
      // in two hands the ball rides the stride: a little side to side, a little bounce
      const stride = Math.PI * 2 * s.phase
      const sway = (1 - s.tuck) * Math.min(1, sp / 4)
      anchor.addScaledVector(lat, Math.sin(stride) * 0.035 * sway).addScaledVector(up, Math.abs(Math.cos(stride)) * 0.03 * sway)
    }
    if (passing) {
      // swing it down to the hip, then sweep it across and out in front for the release
      const wind = smoothstep(0, 0.35, at) * (1 - smoothstep(0.35, 0.55, at))
      const sweep = smoothstep(0.35, 0.6, at)
      anchor.addScaledVector(up, -0.5 * wind).addScaledVector(lat, 0.3 * wind)
      anchor.addScaledVector(fwd, 0.55 * sweep).addScaledVector(up, 0.25 * sweep).addScaledVector(lat, -0.15 * sweep)
    } else if (act === 'place' || act === 'pickup') {
      // reach down to the grass in front of his feet
      const low = act === 'place' ? smoothstep(0, 0.5, at) : 1 - smoothstep(0.45, 0.95, at)
      _A.set(0, 0, 1.1).applyQuaternion(charQ).add(g.position).setY(BALL_RADIUS)
      anchor.lerp(_A, low)
    }
    s.grab = carried ? Math.min(1, s.grab + dt * 4) : 0
    if (carried) {
      // ease it into his hands, then hold it exactly: any lag shows as a gap at full sprint
      ball.pos.lerp(anchor, Math.max(1 - Math.exp(-dt * 22), s.grab * s.grab))
      // long axis forward and up: steeper when tucked, and turned in along the carrying forearm
      _u.copy(fwd).multiplyScalar(Math.cos(0.4 + s.tuck * 0.25)).addScaledVector(up, Math.sin(0.4 + s.tuck * 0.25))
      if (s.tuck > 0) _u.addScaledVector(lat, -0.25 * s.tuck * side)
      s.hold.setFromUnitVectors(Y, _u.normalize())
      ball.hold = s.hold
    } else ball.hold = null

    // reach for the ball on the grass before he has it
    const reach = act === 'pickup' && !carried ? smoothstep(0.1, 0.45, at) : 0
    const grip = Math.max(s.carry, reach)
    if (grip > 0.002) {
      const rb = BALL_RADIUS * (carried ? BALL_CARRY_SCALE : 1)
      const half = (BALL_LENGTH / 2) * (carried ? BALL_CARRY_SCALE : 1)
      const ballAt = s.ballAt.copy(ball.pos)
      for (const sd of [rig.l, rig.r]) {
        const isTuck = sd === tuckArm
        const wArm = grip * (isTuck ? 1 : 1 - s.tuck)
        if (wArm < 0.002) continue
        // two hands: palms on either side, fingers forward. Tucked: the carrying hand over the front tip
        const [palmIn, palmAt, fingerDir, wrist, pole, tip] = _h
        palmIn.copy(lat).multiplyScalar(-sd.sign)
        palmAt.copy(ballAt).addScaledVector(lat, sd.sign * (rb + 0.04))
        fingerDir.copy(fwd).addScaledVector(up, -0.35).normalize()
        if (isTuck && s.tuck > 0) {
          tip.copy(Y).applyQuaternion(s.hold)
          wrist.copy(ballAt).addScaledVector(tip, half * 0.55).addScaledVector(up, rb * 0.7).addScaledVector(lat, 0.04 * side)
          palmAt.lerp(wrist, s.tuck)
          palmIn.lerp(wrist.copy(up).negate(), s.tuck).normalize()
          fingerDir.lerp(wrist.copy(lat).multiplyScalar(-side), s.tuck).normalize()
        }
        wrist.copy(palmAt).addScaledVector(fingerDir, -0.17)
        sd.upper.getWorldPosition(pole)
        pole.addScaledVector(up, -1.2).addScaledVector(fwd, -0.9).addScaledVector(lat, sd.sign * 0.9)
        twoBone(sd.upper, sd.lower, sd.hand, wrist, pole, wArm)
        aimHand(sd, palmIn, fingerDir, wArm)
        // fingers wrap the ball: more at the middle joint, the little finger a touch more
        sd.fingers.forEach((f, n) => hinge(f.b, f.axis, -sd.sign * (CURL[n % 3] + (n >= 9 ? 0.1 : 0)) * wArm))
      }
    }

    // the kick: arms out wide for balance, then through with the leg
    if (kickEnv > 0.002) {
      for (const sd of [rig.l, rig.r]) {
        keyed(KICK_HANDS[sd === rig.l ? 'l' : 'r'], at, _h[3])
        charPoint(_h[3].x, _h[3].y, _h[3].z, _h[3])
        sd.upper.getWorldPosition(_h[4])
        _h[4].add(_h[5].set(sd.sign * 0.3, -1, -0.8).applyQuaternion(charQ))
        twoBone(sd.upper, sd.lower, sd.hand, _h[3], _h[4], kickEnv)
      }
    }
    // after the pass leaves his hands they follow through, pointing at the receiver
    const follow = passing && !carried ? smoothstep(0.55, 0.66, at) * (1 - smoothstep(0.86, 1, at)) : 0
    if (follow > 0.002) {
      for (const sd of [rig.l, rig.r]) {
        charPoint(sd.sign * 0.16, 2.05, 0.95, _h[3])
        sd.upper.getWorldPosition(_h[4])
        _h[4].add(_h[5].set(sd.sign * 0.6, -1, -0.6).applyQuaternion(charQ))
        twoBone(sd.upper, sd.lower, sd.hand, _h[3], _h[4], follow)
      }
    }

    /* ---- where he looks: the ball, the receiver, the camera when he waves ---- */
    let lookW = 0
    if (act === 'pickup' || act === 'place' || act === 'kick') {
      _lk.a.copy(ball.pos)
      lookW = 1
    } else if (passing) {
      // at the receiver until it is gone, then after the ball
      if (carried) charPoint(0, 1.6, 14, _lk.a)
      else _lk.a.copy(ball.pos)
      lookW = 1
    } else if (act === 'wave') {
      _lk.a.copy(frame.camera.position)
      lookW = 0.9
    } else if (ball.mode === 'flight' && ball.pos.distanceTo(g.position) < 70) {
      _lk.a.copy(ball.pos)
      lookW = 0.85
    } else if (act === 'point') {
      charPoint(0, 3, 20, _lk.a)
      lookW = 0.5
    }
    if (lookW > 0) s.lookAt.lerp(_lk.a, s.lookW < 0.05 ? 1 : 1 - Math.exp(-dt * 12))
    s.lookW += (lookW - s.lookW) * (1 - Math.exp(-dt * 6))
    if (s.lookW > 0.01) {
      // turn the head toward it, within what a neck can do; the neck takes a share
      _lk.q.copy(chestQ)
      _lk.inv.copy(chestQ).invert()
      rig.head.getWorldPosition(_lk.cur)
      const w = _lk.want.subVectors(s.lookAt, _lk.cur).normalize().applyQuaternion(_lk.inv)
      const yaw = MathUtils.clamp(Math.atan2(w.x, w.z), -1.15, 1.15)
      const pitch = MathUtils.clamp(Math.asin(MathUtils.clamp(w.y, -1, 1)), -0.8, 0.5)
      w.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).applyQuaternion(_lk.q)
      for (const [b, unbind, share] of [
        [rig.neck, rig.unbind.neck, 0.4],
        [rig.head, rig.unbind.head, 1],
      ] as const) {
        _lk.cur.copy(Z).applyQuaternion(b.getWorldQuaternion(_pq).multiply(unbind))
        _A.copy(w)
        rotateTo(b, _lk.cur, _A, s.lookW * share)
      }
    }

    // an open hand for the wave (the clips hold loose fists)
    const open = act === 'wave' ? smoothstep(0, 0.15, player.actionT) * (1 - smoothstep(0.85, 1, player.actionT)) : 0
    if (open > 0) for (const f of rig.r.fingers) hinge(f.b, f.axis, rig.r.sign * 0.7 * open)

    if (shadow.current) shadow.current.position.set(player.pos.x, 0.025, player.pos.z)
    s.prev.copy(player.pos)

    // before the ball and the camera, so both see where his hands are this frame
  }, -1)

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    const st = useStore.getState()
    if (st.phase !== 'world' || player.mode !== 'idle') return
    playAction('wave', { instant: st.reducedMotion })
    st.showToast({ title: '#13 says hi', body: 'Thanks for stopping by the stadium. Pick a zone in the rundown and I will run you there.' })
  }

  return (
    <>
      <group ref={root}>
        <primitive object={rigged.scene} />
        {/* click target: the skinned mesh itself is too costly to raycast every pointer move */}
        <mesh
          position-y={1.6}
          onClick={onClick}
          onPointerOver={(e) => {
            e.stopPropagation()
            document.body.style.cursor = 'pointer'
          }}
          onPointerOut={() => (document.body.style.cursor = '')}
        >
          <capsuleGeometry args={[0.55, 2, 4, 8]} />
          <meshBasicMaterial colorWrite={false} depthWrite={false} />
        </mesh>
      </group>
      <mesh ref={shadow} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.75, 24]} />
        <meshBasicMaterial color="#000" transparent opacity={quality === 'high' ? 0.16 : 0.35} depthWrite={false} />
      </mesh>
    </>
  )
}

/** Turn a hand so its palm faces `palm` and its fingers point along `finger` (world directions). */
function aimHand(sd: Side, palm: Vector3, finger: Vector3, w: number) {
  const n = palm.clone().normalize()
  const f = finger.clone().addScaledVector(n, -finger.dot(n)).normalize()
  _m1.makeBasis(n, f, new Vector3().crossVectors(n, f))
  const ln = sd.palm
  const lf = sd.finger.clone().addScaledVector(ln, -sd.finger.dot(ln)).normalize()
  _m2.makeBasis(ln, lf, new Vector3().crossVectors(ln, lf)).transpose()
  _q.setFromRotationMatrix(_m1.multiply(_m2))
  sd.hand.getWorldQuaternion(_bq)
  _bq.slerp(_q, w)
  sd.hand.parent!.getWorldQuaternion(_pq)
  sd.hand.quaternion.copy(_pq.invert().multiply(_bq))
  sd.hand.updateMatrixWorld(true)
}

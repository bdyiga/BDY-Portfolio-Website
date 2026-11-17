/**
 * Folds the moves keyed in Blender (moves.py) into src/assets/athlete.glb,
 * leaving the mesh, skin and the motion-capture clips as they were.
 *
 *   node scripts/athlete/merge-moves.mjs <moves.glb> [athlete.glb]
 *
 * Blender folds the armature's root (-90 deg about X, Z-up to Y-up) into the
 * pelvis on the way through, so the pelvis keys are turned back into the
 * original root's frame and the root's own keys are dropped. A clip already
 * in athlete.glb with the same name is replaced.
 */
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { prune, resample } from '@gltf-transform/functions'
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer'

const [movesPath, athletePath = 'src/assets/athlete.glb'] = process.argv.slice(2)
if (!movesPath) {
  console.error('usage: node scripts/athlete/merge-moves.mjs <moves.glb> [athlete.glb]')
  process.exit(1)
}

await MeshoptDecoder.ready
await MeshoptEncoder.ready
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder })

const athlete = await io.read(athletePath)
const moves = await io.read(movesPath)
// one key per frame out of Blender; drop the ones a straight line between neighbours already gives
await moves.transform(resample({ tolerance: 1e-4 }))

const root = athlete.getRoot()
const nodes = new Map(root.listNodes().map((n) => [n.getName(), n]))
const buffer = root.listBuffers()[0]

// +90 deg about X: from Blender's folded root back to the original one
const S = Math.SQRT1_2
const R = [S, 0, 0, S]
const qmul = ([ax, ay, az, aw], [bx, by, bz, bw]) => [
  aw * bx + ax * bw + ay * bz - az * by,
  aw * by - ax * bz + ay * bw + az * bx,
  aw * bz + ax * by - ay * bx + az * bw,
  aw * bw - ax * bx - ay * by - az * bz,
]
const rotX90 = ([x, y, z]) => [x, -z, y]

const accessor = (src, array) =>
  athlete.createAccessor().setType(src.getType()).setArray(array).setBuffer(buffer)

for (const clip of moves.getRoot().listAnimations()) {
  const name = clip.getName()
  for (const old of root.listAnimations()) {
    if (old.getName() !== name) continue
    // disposing the clip alone leaves its keys in the file
    const data = old.listSamplers().flatMap((s) => [s.getInput(), s.getOutput()])
    for (const s of old.listSamplers()) s.dispose()
    for (const c of old.listChannels()) c.dispose()
    old.dispose()
    for (const acc of new Set(data)) if (acc && !acc.listParents().some((p) => p.propertyType !== 'Root')) acc.dispose()
  }
  const anim = athlete.createAnimation(name)
  for (const ch of clip.listChannels()) {
    const path = ch.getTargetPath()
    const target = nodes.get(ch.getTargetNode()?.getName())
    if (!target || target.getName() === 'root' || path === 'scale' || path === 'weights') continue
    // only the pelvis moves; every other bone keeps its rest offset
    if (path === 'translation' && target.getName() !== 'pelvis') continue
    const s = ch.getSampler()
    const input = s.getInput()
    const out = s.getOutput().getArray().slice()
    if (target.getName() === 'pelvis') {
      for (let i = 0; i < out.length; i += path === 'rotation' ? 4 : 3) {
        if (path === 'rotation') out.set(qmul(R, out.slice(i, i + 4)), i)
        else out.set(rotX90(out.slice(i, i + 3)), i)
      }
    }
    const sampler = athlete
      .createAnimationSampler()
      .setInput(accessor(input, input.getArray().slice()))
      .setOutput(accessor(s.getOutput(), out))
      .setInterpolation(s.getInterpolation())
    anim.addSampler(sampler).addChannel(athlete.createAnimationChannel().setTargetNode(target).setTargetPath(path).setSampler(sampler))
  }
  console.log(`${name}: ${anim.listChannels().length} channels`)
}

// the new clips' rotations as 16-bit normals (meshopt packs these tightly; the loader reads them natively).
// The motion-capture clips stay as they came, so a rebuild starts from the same idle pose every time
const merged = new Set(moves.getRoot().listAnimations().map((a) => a.getName()))
for (const anim of root.listAnimations().filter((a) => merged.has(a.getName())))
  for (const ch of anim.listChannels()) {
    const out = ch.getSampler().getOutput()
    if (ch.getTargetPath() !== 'rotation' || out.getComponentType() !== 5126) continue
    const f = out.getArray()
    out.setArray(Int16Array.from(f, (v) => Math.round(Math.max(-1, Math.min(1, v)) * 32767))).setNormalized(true)
  }

await athlete.transform(prune({ propertyTypes: ['Accessor', 'AnimationSampler'] }))
await io.write(athletePath, athlete)
console.log('clips:', root.listAnimations().map((a) => a.getName()).join(', '))

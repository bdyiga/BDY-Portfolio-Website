import { useMemo } from 'react'
import { MeshLambertMaterial, RepeatWrapping, type Texture } from 'three'
import { drawPitch, drawSurround, drawTurfDetail } from '../lib/textures'
import { useCanvasTexture } from './useCanvasTexture'

/** Mown bands are 5 m wide: 24 along the pitch, 14 across it. */
const BAND = 5

/**
 * Turf material. Mowing lays the grass over in alternate directions, and grass
 * lying away from you looks lighter than grass lying towards you. So the stripes
 * are shaded from the viewing direction: they are strong looking down the pitch,
 * soft from the side, and they swap as the camera goes round.
 */
function turfMaterial(map: Texture, detail: Texture) {
  const mat = new MeshLambertMaterial({ map })
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uDetail = { value: detail }
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vTurf;\nvarying vec3 vTurfWorld;')
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvTurf = position.xy;\nvTurfWorld = (modelMatrix * vec4(position, 1.0)).xyz;',
      )
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        /* glsl */ `#include <common>
        uniform sampler2D uDetail;
        varying vec2 vTurf;
        varying vec3 vTurfWorld;
        // a square wave with soft, anti-aliased edges; fades to flat when the bands get narrower than a pixel
        float mown(float c) {
          float s = sin(3.14159265 * c);
          return clamp(s / (fwidth(c) * 2.4 + 0.05), -1.0, 1.0);
        }`,
      )
      .replace(
        '#include <map_fragment>',
        /* glsl */ `#include <map_fragment>
        vec2 look = normalize(vTurfWorld.xz - cameraPosition.xz + vec2(1e-4));
        float along = mown(vTurf.x / ${BAND.toFixed(1)}) * (0.05 + 0.085 * look.x);
        float across = mown(vTurf.y / ${BAND.toFixed(1)}) * (0.018 + 0.05 * look.y);
        float blades = texture2D(uDetail, vTurf * 0.42).g * 2.0;
        float clumps = texture2D(uDetail, vTurf.yx * 0.061 + 0.37).g * 2.0;
        diffuseColor.rgb *= (1.0 + along + across) * mix(1.0, blades, 0.5) * mix(1.0, clumps, 0.3);`,
      )
  }
  mat.customProgramCacheKey = () => 'turf'
  return mat
}

export function Pitch({ quality }: { quality: 'high' | 'low' }) {
  const size = quality === 'high' ? 4096 : 2048
  const pitch = useCanvasTexture(size, Math.round((size * 70) / 120), drawPitch)
  const detail = useCanvasTexture(256, 256, drawTurfDetail)
  const surround = useCanvasTexture(512, 512, drawSurround)
  surround.wrapS = surround.wrapT = RepeatWrapping
  surround.repeat.set(10, 10)
  detail.wrapS = detail.wrapT = RepeatWrapping
  const turf = useMemo(() => turfMaterial(pitch, detail), [pitch, detail])

  return (
    <group>
      {/* outer ground */}
      <mesh rotation-x={-Math.PI / 2} position-y={-0.02} receiveShadow>
        <planeGeometry args={[420, 420]} />
        <meshStandardMaterial map={surround} roughness={1} />
      </mesh>
      {/* playing surface incl. in-goal areas */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow material={turf}>
        <planeGeometry args={[120, 70]} />
      </mesh>
      {/* corner flags */}
      {[-60, -50, 50, 60].flatMap((x) =>
        [-35, 35].map((z) => (
          <group key={`${x}${z}`} position={[x, 0, z]}>
            <mesh position-y={0.8}>
              <cylinderGeometry args={[0.03, 0.03, 1.6, 6]} />
              <meshStandardMaterial color="#e6e9e7" />
            </mesh>
            <mesh position={[0.22, 1.42, 0]}>
              <planeGeometry args={[0.44, 0.3]} />
              <meshStandardMaterial color="#990000" emissive="#990000" emissiveIntensity={0.5} side={2} />
            </mesh>
          </group>
        )),
      )}
    </group>
  )
}

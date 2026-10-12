import { useEffect, useMemo } from 'react'
import { CanvasTexture, SRGBColorSpace } from 'three'
import { useThree } from '@react-three/fiber'

/**
 * Builds a CanvasTexture from a draw function and redraws it once web fonts
 * are ready (canvas text otherwise falls back to system fonts).
 */
export function useCanvasTexture(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  deps: unknown[] = [],
) {
  const gl = useThree((s) => s.gl)
  const { texture, ctx } = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')!
    const texture = new CanvasTexture(canvas)
    texture.colorSpace = SRGBColorSpace
    texture.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy())
    return { texture, ctx }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height])

  useEffect(() => {
    let alive = true
    const paint = () => {
      if (!alive) return
      draw(ctx, width, height)
      texture.needsUpdate = true
    }
    paint()
    document.fonts?.ready.then(paint)
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx, texture, ...deps])

  useEffect(() => () => texture.dispose(), [texture])
  return texture
}

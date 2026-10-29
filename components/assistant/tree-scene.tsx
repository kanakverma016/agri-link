'use client'

import { useEffect, useRef } from 'react'

type TreeSceneProps = {
  awake: boolean
  speaking: boolean
  listening?: boolean
  onReady?: () => void
  className?: string
}

const MODEL_URL = '/models/krishi-tree.glb'
const FIREFLY_COUNT = 36

/**
 * Renders the Krishi Dost tree with three.js. The scene reads `awake` and
 * `speaking` from refs so toggling them animates the tree without rebuilding it.
 */
export function TreeScene({ awake, speaking, listening = false, onReady, className }: TreeSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const awakeRef = useRef(awake)
  const speakingRef = useRef(speaking)
  const listeningRef = useRef(listening)
  const onReadyRef = useRef(onReady)

  useEffect(() => {
    awakeRef.current = awake
    speakingRef.current = speaking
    listeningRef.current = listening
    onReadyRef.current = onReady
  }, [awake, speaking, listening, onReady])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let disposed = false
    let frame = 0
    let cleanup = () => {}

    async function start(host: HTMLDivElement) {
      const THREE = await import('three')
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')
      if (disposed) return

      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.setClearColor(0x000000, 0)
      renderer.outputColorSpace = THREE.SRGBColorSpace
      renderer.domElement.style.display = 'block'
      renderer.domElement.style.width = '100%'
      renderer.domElement.style.height = '100%'
      host.appendChild(renderer.domElement)

      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50)
      camera.position.set(0, 1.25, 5.6)
      camera.lookAt(0, 0.95, 0)

      const hemi = new THREE.HemisphereLight(0xdfffe6, 0x2a1a0e, 1.1)
      const key = new THREE.DirectionalLight(0xfff1d6, 2.2)
      key.position.set(2.5, 4, 3)
      const rim = new THREE.PointLight(0x7dffb0, 0, 8)
      rim.position.set(-2, 1.5, -2)
      scene.add(hemi, key, rim)

      const glowTexture = (() => {
        const c = document.createElement('canvas')
        c.width = c.height = 128
        const ctx = c.getContext('2d')!
        const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
        g.addColorStop(0, 'rgba(255,255,255,1)')
        g.addColorStop(1, 'rgba(255,255,255,0)')
        ctx.fillStyle = g
        ctx.fillRect(0, 0, 128, 128)
        return new THREE.CanvasTexture(c)
      })()

      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(3.4, 3.4),
        new THREE.MeshBasicMaterial({
          map: glowTexture,
          color: 0x5ee89a,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      )
      ground.rotation.x = -Math.PI / 2
      ground.position.y = 0.01
      scene.add(ground)

      const fireflyPositions = new Float32Array(FIREFLY_COUNT * 3)
      const fireflySeeds = Array.from({ length: FIREFLY_COUNT }, () => ({
        radius: 0.7 + Math.random() * 0.9,
        height: 0.2 + Math.random() * 1.9,
        speed: 0.25 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
      }))
      const fireflyGeometry = new THREE.BufferGeometry()
      fireflyGeometry.setAttribute('position', new THREE.BufferAttribute(fireflyPositions, 3))
      const fireflies = new THREE.Points(
        fireflyGeometry,
        new THREE.PointsMaterial({
          map: glowTexture,
          color: 0xd9ff8a,
          size: 0.11,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      )
      scene.add(fireflies)

      const pivot = new THREE.Group()
      scene.add(pivot)

      let material: InstanceType<typeof THREE.MeshStandardMaterial> | null = null
      let colorAttr: InstanceType<typeof THREE.BufferAttribute> | null = null
      let awakeColors: Float32Array | null = null
      let sleepColors: Float32Array | null = null
      let lastBlend = -1

      const loader = new GLTFLoader()
      loader.load(MODEL_URL, (gltf) => {
        if (disposed) return
        const mesh = gltf.scene.getObjectByProperty('isMesh', true) as InstanceType<typeof THREE.Mesh> | undefined
        if (!mesh) return
        const geometry = mesh.geometry
        const source = geometry.getAttribute('color')
        const count = source.count
        awakeColors = new Float32Array(count * 3)
        sleepColors = new Float32Array(count * 3)
        for (let i = 0; i < count; i++) {
          const r = source.getX(i)
          const g = source.getY(i)
          const b = source.getZ(i)
          awakeColors[i * 3] = r
          awakeColors[i * 3 + 1] = g
          awakeColors[i * 3 + 2] = b
          const gray = r * 0.3 + g * 0.5 + b * 0.2
          sleepColors[i * 3] = (r * 0.25 + gray * 0.75) * 0.5
          sleepColors[i * 3 + 1] = (g * 0.25 + gray * 0.75) * 0.52
          sleepColors[i * 3 + 2] = (b * 0.25 + gray * 0.75) * 0.58
        }
        colorAttr = new THREE.BufferAttribute(new Float32Array(sleepColors), 3)
        geometry.setAttribute('color', colorAttr)
        material = new THREE.MeshStandardMaterial({
          vertexColors: true,
          roughness: 0.78,
          metalness: 0,
          emissive: new THREE.Color(0x2fbf6a),
          emissiveIntensity: 0,
        })
        const tree = new THREE.Mesh(geometry, material)
        pivot.add(tree)
        onReadyRef.current?.()
      })

      let width = 0
      let height = 0
      const resize = () => {
        const w = host.clientWidth
        const h = host.clientHeight
        if (!w || !h || (w === width && h === height)) return
        width = w
        height = h
        renderer.setSize(w, h, false)
        camera.aspect = w / h
        // Keep the whole tree in frame on narrow stages.
        camera.position.z = camera.aspect < 1 ? 5.6 / Math.max(camera.aspect, 0.55) ** 0.6 : 5.6
        camera.updateProjectionMatrix()
      }
      const observer = new ResizeObserver(resize)
      observer.observe(host)
      resize()

      let pointerX = 0
      const onPointerMove = (e: PointerEvent) => {
        const rect = host.getBoundingClientRect()
        pointerX = ((e.clientX - rect.left) / rect.width - 0.5) * 2
      }
      host.addEventListener('pointermove', onPointerMove)

      let awakeLevel = 0
      let speakLevel = 0
      let listenLevel = 0
      let wakeBounce = 0
      let wasAwake = false
      let spin = 0
      let visible = true
      const onVisibility = () => {
        visible = !document.hidden
      }
      document.addEventListener('visibilitychange', onVisibility)

      const clock = new THREE.Clock()
      const smooth = (current: number, target: number, rate: number, dt: number) =>
        current + (target - current) * (1 - Math.exp(-rate * dt))

      const render = () => {
        frame = requestAnimationFrame(render)
        if (!visible) {
          clock.getDelta()
          return
        }
        const dt = Math.min(clock.getDelta(), 0.05)
        const t = clock.elapsedTime
        const isAwake = awakeRef.current

        if (isAwake && !wasAwake) wakeBounce = 1
        wasAwake = isAwake
        wakeBounce = Math.max(0, wakeBounce - dt * 0.9)

        awakeLevel = smooth(awakeLevel, isAwake ? 1 : 0, 3.2, dt)
        speakLevel = smooth(speakLevel, speakingRef.current ? 1 : 0, 6, dt)
        listenLevel = smooth(listenLevel, listeningRef.current ? 1 : 0, 5, dt)

        if (material && colorAttr && awakeColors && sleepColors) {
          const blend = Math.round(awakeLevel * 50) / 50
          if (blend !== lastBlend) {
            lastBlend = blend
            const out = colorAttr.array as Float32Array
            for (let i = 0; i < out.length; i++) out[i] = sleepColors[i] + (awakeColors[i] - sleepColors[i]) * blend
            colorAttr.needsUpdate = true
          }
          material.emissiveIntensity =
            awakeLevel * (0.08 + speakLevel * 0.22 + listenLevel * 0.14 * (0.6 + 0.4 * Math.sin(t * 5)) + wakeBounce * 0.6)
        }

        const breathe = Math.sin(t * (1.2 + awakeLevel * 0.8 + speakLevel * 2.4))
        const bounce = Math.sin(wakeBounce * Math.PI * 3) * wakeBounce * 0.1
        const scale = 0.96 + awakeLevel * 0.04 + listenLevel * 0.025 + breathe * (0.006 + speakLevel * 0.018) + bounce
        pivot.scale.setScalar(scale)
        pivot.position.y = Math.abs(bounce) * 0.6

        spin += dt * (reduceMotion ? 0 : 0.12 + awakeLevel * 0.1)
        const droop = (1 - awakeLevel) * 0.09
        const lean = listenLevel * 0.06
        pivot.rotation.set(
          droop + lean,
          spin * (1 - listenLevel * 0.85) + pointerX * 0.35,
          Math.sin(t * 0.7) * 0.015 * awakeLevel + droop * 0.4,
        )

        rim.intensity = awakeLevel * (4 + speakLevel * 5 + listenLevel * 3)
        ;(ground.material as InstanceType<typeof THREE.MeshBasicMaterial>).opacity =
          awakeLevel * (0.28 + speakLevel * 0.22 + listenLevel * 0.2 + wakeBounce * 0.35)
        ground.scale.setScalar(1 + wakeBounce * 0.5 + speakLevel * 0.08 * Math.sin(t * 6) + listenLevel * 0.1 * Math.sin(t * 4))

        for (let i = 0; i < FIREFLY_COUNT; i++) {
          const f = fireflySeeds[i]
          const a = t * f.speed + f.phase
          fireflyPositions[i * 3] = Math.cos(a) * f.radius
          fireflyPositions[i * 3 + 1] = f.height + Math.sin(a * 1.7) * 0.12
          fireflyPositions[i * 3 + 2] = Math.sin(a) * f.radius
        }
        fireflyGeometry.attributes.position.needsUpdate = true
        ;(fireflies.material as InstanceType<typeof THREE.PointsMaterial>).opacity = awakeLevel * (0.55 + speakLevel * 0.35)

        renderer.render(scene, camera)
      }
      render()

      cleanup = () => {
        cancelAnimationFrame(frame)
        observer.disconnect()
        host.removeEventListener('pointermove', onPointerMove)
        document.removeEventListener('visibilitychange', onVisibility)
        scene.traverse((obj) => {
          const mesh = obj as InstanceType<typeof THREE.Mesh>
          mesh.geometry?.dispose()
          const mat = mesh.material as InstanceType<typeof THREE.Material> | InstanceType<typeof THREE.Material>[] | undefined
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
          else mat?.dispose()
        })
        glowTexture.dispose()
        renderer.dispose()
        renderer.domElement.remove()
      }
    }

    start(container).catch(() => {})

    return () => {
      disposed = true
      cleanup()
    }
  }, [])

  return <div ref={containerRef} className={className} role="img" aria-label="Krishi Dost, the friendly farming tree" />
}

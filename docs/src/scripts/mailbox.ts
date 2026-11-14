import * as THREE from 'three/webgpu'
import { toonOutlinePass } from 'three/tsl'

interface MailboxOptions {
  /** Holds the mailbox still: no idle motion, deliveries only raise the flag. */
  reducedMotion: boolean
}

const BLUE = 0x4f7cff
const BLUE_LIGHT = 0x7c9dff
const FLAG = 0xff5d73
const POST = 0x9b6a45
const PAPER = 0xf6f1e4
const PAPER_SHADE = 0xe2d9c4
const OUTLINE = 0x0b0b12

/* Body profile: a box with a half-round roof, like a rural mailbox. */
const WIDTH = 1
const WALL = 0.62
const DEPTH = 1.9

const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1)
const easeOutCubic = (value: number) => 1 - (1 - clamp01(value)) ** 3
const easeInOutCubic = (value: number) => {
  const t = clamp01(value)
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
}
/** Rises to 1 with a springy overshoot, settled by t = 1. */
const springIn = (value: number) => {
  const t = clamp01(value)
  return 1 - Math.exp(-6 * t) * Math.cos(9 * t)
}
/** A decaying wobble that starts and ends at 0. */
const wobble = (value: number, frequency = 18) => {
  const t = clamp01(value)
  return t >= 1 ? 0 : Math.exp(-5 * t) * Math.sin(frequency * t)
}

function toonGradient() {
  const texture = new THREE.DataTexture(
    new Uint8Array([90, 90, 90, 255, 175, 175, 175, 255, 255, 255, 255, 255]),
    3,
    1,
  )
  texture.minFilter = THREE.NearestFilter
  texture.magFilter = THREE.NearestFilter
  texture.generateMipmaps = false
  texture.needsUpdate = true
  return texture
}

function profile(width: number, wall: number) {
  const radius = width / 2
  const shape = new THREE.Shape()
  shape.moveTo(-radius, 0)
  shape.lineTo(radius, 0)
  shape.lineTo(radius, wall)
  shape.absarc(0, wall, radius, 0, Math.PI, false)
  shape.lineTo(-radius, 0)
  return shape
}

export async function mountMailbox(canvas: HTMLCanvasElement, options: MailboxOptions) {
  const renderer = new THREE.WebGPURenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0x000000, 0)
  await renderer.init()

  const gradientMap = toonGradient()
  const toon = (value: number) => new THREE.MeshToonNodeMaterial({ color: value, gradientMap })

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50)

  scene.add(new THREE.HemisphereLight(0xdfe6ff, 0x1b1f33, 1.6))
  const sun = new THREE.DirectionalLight(0xffffff, 2.6)
  sun.position.set(-3, 5, 4)
  scene.add(sun)

  /* Everything that leans and jolts together. */
  const rig = new THREE.Group()
  rig.rotation.y = -0.55
  scene.add(rig)

  const post = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.5, 0.24), toon(POST))
  post.position.y = -0.75
  rig.add(post)

  const box = new THREE.Group()
  box.position.y = 0.02
  rig.add(box)

  const body = new THREE.Mesh(
    new THREE.ExtrudeGeometry(profile(WIDTH, WALL), {
      depth: DEPTH,
      bevelEnabled: true,
      bevelSize: 0.035,
      bevelThickness: 0.035,
      bevelSegments: 3,
      curveSegments: 24,
    }),
    toon(BLUE),
  )
  body.position.z = -DEPTH / 2
  box.add(body)

  /* Door: hinged along its bottom edge on the front face. */
  const door = new THREE.Group()
  door.position.set(0, 0, DEPTH / 2 + 0.035)
  box.add(door)
  const doorPanel = new THREE.Mesh(
    new THREE.ExtrudeGeometry(profile(WIDTH - 0.08, WALL - 0.04), {
      depth: 0.06,
      bevelEnabled: true,
      bevelSize: 0.02,
      bevelThickness: 0.02,
      bevelSegments: 2,
      curveSegments: 24,
    }),
    toon(BLUE_LIGHT),
  )
  doorPanel.position.y = 0.02
  door.add(doorPanel)
  const latch = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.09), toon(PAPER))
  latch.position.set(0, WALL + 0.36, 0.08)
  door.add(latch)

  /* Flag: an arm pivoting on the side, down along the body until mail arrives. */
  const flag = new THREE.Group()
  flag.position.set(WIDTH / 2 + 0.07, WALL * 0.7, -0.45)
  box.add(flag)
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.95, 0.07), toon(FLAG))
  arm.position.y = 0.475
  flag.add(arm)
  const banner = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.26, 0.36), toon(FLAG))
  banner.position.set(0, 0.82, -0.2)
  flag.add(banner)
  const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.06, 16), toon(PAPER))
  pin.rotation.z = Math.PI / 2
  pin.position.x = -0.02
  flag.add(pin)

  /* Letter: a paper envelope with its flap, flying in from the left. */
  const letter = new THREE.Group()
  scene.add(letter)
  const paper = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.48, 0.03), toon(PAPER))
  letter.add(paper)
  const flapShape = new THREE.Shape()
  flapShape.moveTo(-0.36, 0.24)
  flapShape.lineTo(0.36, 0.24)
  flapShape.lineTo(0, -0.04)
  flapShape.lineTo(-0.36, 0.24)
  const flap = new THREE.Mesh(new THREE.ShapeGeometry(flapShape), toon(PAPER_SHADE))
  flap.position.z = 0.017
  letter.add(flap)
  const seal = new THREE.Mesh(new THREE.CircleGeometry(0.055, 20), toon(FLAG))
  seal.position.set(0, -0.02, 0.019)
  letter.add(seal)
  letter.rotation.order = 'YXZ'
  letter.visible = false

  /* Soft contact shadow under the post. */
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.9, 40),
    new THREE.MeshBasicNodeMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    }),
  )
  shadow.rotation.x = -Math.PI / 2
  shadow.scale.set(1, 0.55, 1)
  shadow.position.y = -1.5
  scene.add(shadow)

  const pipeline = new THREE.RenderPipeline(
    renderer,
    toonOutlinePass(scene, camera, new THREE.Color(OUTLINE), 0.004, 1),
  )

  /* ---------------------------------------------------------------- */
  /* Animation                                                         */
  /* ---------------------------------------------------------------- */

  const DOOR_OPEN = 1.75
  const FLAG_DOWN = Math.PI / 2
  const FLAG_RAISE_AT = 1.25
  const DURATION = 2.6
  const BASE_YAW = -0.55
  const TURN = Math.PI * 2

  interface Spring {
    value: number
    velocity: number
    target: number
  }

  /* Flag angle, spin around the post and hover lift all follow damped springs. */
  const flagSpring: Spring = { value: FLAG_DOWN, velocity: 0, target: FLAG_DOWN }
  const spinSpring: Spring = { value: 0, velocity: 0, target: 0 }
  const hoverSpring: Spring = { value: 0, velocity: 0, target: 0 }
  const springs = [flagSpring, spinSpring, hoverSpring]

  const advance = (spring: Spring, stiffness: number, damping: number, delta: number) => {
    if (options.reducedMotion) {
      spring.value = spring.target
      spring.velocity = 0
      return
    }
    spring.velocity +=
      ((spring.target - spring.value) * stiffness - spring.velocity * damping) * delta
    spring.value += spring.velocity * delta
  }

  let deliveryAge = Number.POSITIVE_INFINITY
  let dragging = false
  const lean = new THREE.Vector2()
  const leanTarget = new THREE.Vector2()

  const mouth = new THREE.Vector3()
  const inside = new THREE.Vector3()
  const start = new THREE.Vector3()
  const control = new THREE.Vector3()
  const path = new THREE.QuadraticBezierCurve3(start, control, mouth)

  const pose = (delta: number) => {
    const previousAge = deliveryAge
    deliveryAge += delta
    const t = deliveryAge
    if (previousAge < FLAG_RAISE_AT && t >= FLAG_RAISE_AT) flagSpring.target = 0

    advance(flagSpring, 160, 9, delta)
    if (!dragging) advance(spinSpring, 18, 6.5, delta)
    advance(hoverSpring, 260, 18, delta)

    /* Lean toward the pointer and lift on hover. */
    lean.lerp(leanTarget, 1 - Math.exp(-delta * 4))
    rig.rotation.y = BASE_YAW + lean.x * 0.35 + spinSpring.value
    rig.rotation.x = lean.y * 0.08
    rig.scale.setScalar(1 + hoverSpring.value * 0.045)
    flag.rotation.x = flagSpring.value

    /* Door: opens as the letter approaches, slams shut after it. */
    const opening = easeOutCubic((t - 0.05) / 0.35)
    const closing = springIn((t - 1.05) / 0.6)
    door.rotation.x = t < 1.05 ? DOOR_OPEN * opening : DOOR_OPEN * (1 - closing)

    /* Jolt: the box squashes when the door slams and shakes with the flag. */
    const jolt = wobble((t - 1.1) / 0.9)
    box.scale.set(1 + jolt * 0.05, 1 - jolt * 0.07, 1 + jolt * 0.05)
    box.rotation.z = wobble((t - 1.15) / 0.8, 26) * 0.06

    /* Letter: arcs in from the left, slides through the door, disappears inside. */
    box.updateWorldMatrix(true, true)
    mouth.copy(box.localToWorld(new THREE.Vector3(0, WALL * 0.75, DEPTH / 2 + 0.45)))
    inside.copy(box.localToWorld(new THREE.Vector3(0, WALL * 0.75, -0.2)))
    start.set(rig.position.x - 6.4, 1.6, 0.8)
    control.set(rig.position.x - 2.6, 2.6, 2.2)

    letter.visible = t > 0 && t < 1.08
    if (letter.visible) {
      const flight = easeInOutCubic(t / 0.72)
      if (t < 0.72) {
        letter.position.copy(path.getPoint(flight))
        letter.rotation.set(
          0.25 - flight * 1.27,
          rig.rotation.y * flight,
          Math.sin(flight * Math.PI) * 0.9,
        )
        letter.scale.setScalar(0.9 + flight * 0.1)
      } else {
        const slide = easeInOutCubic((t - 0.72) / 0.32)
        letter.position.lerpVectors(mouth, inside, slide)
        letter.rotation.set(-Math.PI / 2 + 0.55, rig.rotation.y, 0)
        letter.scale.setScalar(1 - slide * 0.25)
      }
    }
  }

  /* ---------------------------------------------------------------- */
  /* Loop and sizing                                                   */
  /* ---------------------------------------------------------------- */

  let last = performance.now()
  let visible = true
  let running = false

  const frame = () => {
    const now = performance.now()
    const delta = Math.min((now - last) / 1000, 1 / 20)
    last = now
    pose(delta)
    pipeline.render()

    /* Render on demand: the loop stops once nothing moves and restarts on input. */
    const settled =
      !dragging &&
      deliveryAge > DURATION &&
      lean.distanceTo(leanTarget) < 0.0005 &&
      springs.every(
        (spring) =>
          Math.abs(spring.target - spring.value) < 0.0005 && Math.abs(spring.velocity) < 0.005,
      )
    if (settled) stop()
  }

  const play = () => {
    if (running || !visible) return
    running = true
    last = performance.now()
    renderer.setAnimationLoop(frame)
  }

  const stop = () => {
    running = false
    renderer.setAnimationLoop(null)
  }

  /* Framing comes from CSS so each breakpoint can place the mailbox. */
  const resize = () => {
    const { width, height } = canvas.getBoundingClientRect()
    if (!width || !height) return
    const style = getComputedStyle(canvas)
    const offset = Number.parseFloat(style.getPropertyValue('--mailbox-x')) || 0
    const distance = Number.parseFloat(style.getPropertyValue('--mailbox-distance')) || 8

    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.position.set(0, 1.1, distance)
    camera.lookAt(0, 0.2, 0)
    camera.updateProjectionMatrix()
    rig.position.x = offset
    shadow.position.x = offset
    play()
  }

  resize()
  new ResizeObserver(resize).observe(canvas)

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting
    if (visible) play()
    else stop()
  }).observe(canvas)

  /* ---------------------------------------------------------------- */
  /* Interaction                                                       */
  /* ---------------------------------------------------------------- */

  const deliver = () => {
    if (deliveryAge < FLAG_RAISE_AT) return
    if (options.reducedMotion) {
      flagSpring.target = 0
      deliveryAge = DURATION
    } else {
      flagSpring.target = FLAG_DOWN
      deliveryAge = 0
    }
    play()
  }

  const flagParts = new Set<THREE.Object3D>([arm, banner, pin])
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()

  /** What the pointer is over: the flag, the rest of the mailbox, or nothing. */
  const pick = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect()
    pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    )
    raycaster.setFromCamera(pointer, camera)
    const [hit] = raycaster.intersectObject(rig, true)
    if (!hit) return null
    return flagParts.has(hit.object) ? 'flag' : 'box'
  }

  let press: {
    target: 'flag' | 'box'
    startX: number
    lastX: number
    lastTime: number
    moved: boolean
  } | null = null

  const settleSpin = () => {
    dragging = false
    spinSpring.target = Math.round((spinSpring.value + spinSpring.velocity * 0.3) / TURN) * TURN
  }

  canvas.addEventListener('pointerdown', (event) => {
    const target = pick(event)
    if (!target) return
    press = {
      target,
      startX: event.clientX,
      lastX: event.clientX,
      lastTime: event.timeStamp,
      moved: false,
    }
    canvas.setPointerCapture(event.pointerId)
    play()
  })

  canvas.addEventListener('pointermove', (event) => {
    if (press) {
      /* Dragging sideways spins the mailbox around its post. */
      if (!press.moved && !options.reducedMotion && Math.abs(event.clientX - press.startX) > 6) {
        press.moved = true
        dragging = true
        canvas.style.cursor = 'grabbing'
      }
      if (press.moved) {
        const turn = (event.clientX - press.lastX) * 0.012
        const seconds = Math.max((event.timeStamp - press.lastTime) / 1000, 1 / 120)
        spinSpring.value += turn
        spinSpring.velocity = turn / seconds
        press.lastX = event.clientX
        press.lastTime = event.timeStamp
      }
      return
    }

    if (event.pointerType === 'mouse') {
      const over = pick(event) !== null
      hoverSpring.target = over ? 1 : 0
      canvas.style.cursor = over ? 'pointer' : ''
    }
  })

  canvas.addEventListener('pointerup', () => {
    if (!press) return
    if (press.moved) settleSpin()
    else if (press.target === 'flag') flagSpring.target = flagSpring.target === 0 ? FLAG_DOWN : 0
    else deliver()
    press = null
    canvas.style.cursor = hoverSpring.target ? 'pointer' : ''
    play()
  })

  canvas.addEventListener('pointercancel', () => {
    if (press?.moved) settleSpin()
    press = null
  })

  canvas.addEventListener('pointerleave', () => {
    if (press) return
    hoverSpring.target = 0
    canvas.style.cursor = ''
  })

  if (!options.reducedMotion) {
    window.addEventListener('pointermove', (event) => {
      if (event.pointerType !== 'mouse') return
      const rect = canvas.getBoundingClientRect()
      const x = (event.clientX - rect.left) / rect.width - 0.5
      const y = (event.clientY - rect.top) / rect.height - 0.5
      leanTarget.set(Math.max(-1, Math.min(1, x)), Math.max(-1, Math.min(1, y)))
      play()
    })
  }

  /* Compile shaders off the main thread where the backend allows it, before the first frame. */
  await renderer.compileAsync(scene, camera)
  canvas.dataset.ready = ''
  play()

  /** Plays one delivery: the door opens, a letter goes in, the flag goes up. */
  return { deliver }
}

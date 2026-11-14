import * as THREE from 'three/webgpu'
import { color, mix, positionLocal, smoothstep, toonOutlinePass } from 'three/tsl'

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
const INSIDE_TOP = 0x070a18
const INSIDE_FLOOR = 0x1d2756

/* Body profile: a box with a half-round roof, like a rural mailbox. */
const WIDTH = 1
const WALL = 0.62
const DEPTH = 1.9

const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1)
const random = (min: number, max: number) => min + Math.random() * (max - min)
const easeOutCubic = (value: number) => 1 - (1 - clamp01(value)) ** 3
const easeInOutCubic = (value: number) => {
  const t = clamp01(value)
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
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

  /* The slot behind the door: a dark opening, so an open door shows the inside of the box. */
  const slotMaterial = new THREE.MeshBasicNodeMaterial()
  slotMaterial.colorNode = mix(
    color(INSIDE_FLOOR),
    color(INSIDE_TOP),
    smoothstep(0, 0.7, positionLocal.y),
  )
  const slot = new THREE.Mesh(
    new THREE.ShapeGeometry(profile(WIDTH - 0.14, WALL - 0.06), 24),
    slotMaterial,
  )
  slot.position.set(0, 0.04, DEPTH / 2 + 0.04)
  box.add(slot)

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

  const inside = new THREE.Vector3()
  const anchor = new THREE.Vector3()
  const front = new THREE.Vector3()
  const boxQuaternion = new THREE.Quaternion()
  const entry = new THREE.Quaternion()
  const tumble = new THREE.Quaternion()

  /* Letters share geometries and materials, so a burst of clicks compiles nothing new. */
  const flapShape = new THREE.Shape()
  flapShape.moveTo(-0.36, 0.24)
  flapShape.lineTo(0.36, 0.24)
  flapShape.lineTo(0, -0.04)
  flapShape.lineTo(-0.36, 0.24)
  const letterParts = [
    { geometry: new THREE.BoxGeometry(0.72, 0.48, 0.03), material: toon(PAPER), z: 0, y: 0 },
    { geometry: new THREE.ShapeGeometry(flapShape), material: toon(PAPER_SHADE), z: 0.017, y: 0 },
    { geometry: new THREE.CircleGeometry(0.055, 20), material: toon(FLAG), z: 0.019, y: -0.02 },
  ]

  /* Every letter rolls its own throw: where it appears, its arc, pace, spin and landing. */
  interface Letter {
    group: THREE.Group
    age: number
    flight: number
    slide: number
    /** 0 eases in and out like a lob, 1 leaves fast like a throw. */
    punch: number
    size: number
    turns: number
    axis: THREE.Vector3
    /** Landing point in the slot and approach distance, in box space. */
    slot: THREE.Vector3
    reach: number
    rise: number
    tilt: THREE.Quaternion
    start: THREE.Vector3
    swing: THREE.Vector3
    approach: THREE.Vector3
    target: THREE.Vector3
    path: THREE.CubicBezierCurve3
  }

  const letters: Letter[] = []

  const createLetter = (): Letter => {
    const group = new THREE.Group()
    for (const part of letterParts) {
      const mesh = new THREE.Mesh(part.geometry, part.material)
      mesh.position.set(0, part.y, part.z)
      group.add(mesh)
    }
    group.visible = false
    scene.add(group)
    const start = new THREE.Vector3()
    const swing = new THREE.Vector3()
    const approach = new THREE.Vector3()
    const target = new THREE.Vector3()
    return {
      group,
      age: 0,
      flight: 0,
      slide: 0,
      punch: 0,
      size: 1,
      turns: 0,
      axis: new THREE.Vector3(),
      slot: new THREE.Vector3(),
      reach: 0,
      rise: 0,
      tilt: new THREE.Quaternion(),
      start,
      swing,
      approach,
      target,
      path: new THREE.CubicBezierCurve3(start, swing, approach, target),
    }
  }

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
  const CLOSE = 0.6
  const MAX_LETTERS = 16
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

  let dragging = false
  /* Door state: open while letters fly, then a slam measured by closeAge. */
  let doorOpen = false
  let closeFrom = 0
  let closeAge = Number.POSITIVE_INFINITY
  let gulpAge = Number.POSITIVE_INFINITY
  const lean = new THREE.Vector2()
  const leanTarget = new THREE.Vector2()

  const pose = (delta: number) => {
    advance(flagSpring, 160, 9, delta)
    if (!dragging) advance(spinSpring, 18, 6.5, delta)
    advance(hoverSpring, 260, 18, delta)

    /* Lean toward the pointer and lift on hover. */
    lean.lerp(leanTarget, 1 - Math.exp(-delta * 4))
    rig.rotation.y = BASE_YAW + lean.x * 0.35 + spinSpring.value
    rig.rotation.x = lean.y * 0.08
    rig.scale.setScalar(1 + hoverSpring.value * 0.045)
    flag.rotation.x = flagSpring.value

    /* Letters: each follows its own curve, tumbles, then lines up with the slot and slides in. */
    box.updateWorldMatrix(true, true)
    box.getWorldQuaternion(boxQuaternion)
    front.set(0, 0, 1).applyQuaternion(boxQuaternion)

    let inFlight = false
    for (const letter of letters) {
      if (!letter.group.visible) continue
      letter.age += delta
      const t = letter.age
      if (t >= letter.flight + letter.slide) {
        letter.group.visible = false
        gulpAge = 0
        continue
      }

      inFlight = true
      letter.target.copy(box.localToWorld(anchor.copy(letter.slot)))
      letter.approach.copy(letter.target).addScaledVector(front, letter.reach)
      letter.approach.y += letter.rise
      entry.copy(boxQuaternion).multiply(letter.tilt)

      if (t < letter.flight) {
        const progress = t / letter.flight
        const eased =
          easeInOutCubic(progress) * (1 - letter.punch) + easeOutCubic(progress) * letter.punch
        letter.group.position.copy(letter.path.getPoint(eased))
        tumble.setFromAxisAngle(
          letter.axis,
          letter.turns * Math.PI * 2 * (1 - easeOutCubic(progress)),
        )
        letter.group.quaternion.copy(entry).multiply(tumble)
        /* Pops in where it appears instead of crossing the canvas edge. */
        letter.group.scale.setScalar(letter.size * easeOutCubic(t / 0.16))
      } else {
        const slide = easeInOutCubic((t - letter.flight) / letter.slide)
        inside.copy(box.localToWorld(anchor.set(letter.slot.x, letter.slot.y, -0.2)))
        letter.group.position.lerpVectors(letter.target, inside, slide)
        letter.group.quaternion.copy(entry)
        letter.group.scale.setScalar(letter.size * (1 - slide * 0.25))
      }
    }

    /* Door: swings open while letters fly in. Once the last one is inside it slams and
       bounces on the frame; |cos| keeps the angle at or above closed, so it never enters the box. */
    if (inFlight) {
      doorOpen = true
      door.rotation.x += (DOOR_OPEN - door.rotation.x) * (1 - Math.exp(-delta * 10))
    } else {
      if (doorOpen) {
        doorOpen = false
        closeFrom = door.rotation.x
        closeAge = 0
      }
      const previousClose = closeAge
      closeAge += delta
      const progress = clamp01(closeAge / CLOSE)
      door.rotation.x =
        progress >= 1
          ? 0
          : closeFrom * Math.exp(-6 * progress) * Math.abs(Math.cos(2 * Math.PI * progress))
      if (previousClose < 0.2 && closeAge >= 0.2) flagSpring.target = 0
    }
    gulpAge += delta

    /* Jolt: a small gulp per letter, a bigger squash when the door slams. */
    const jolt = wobble((closeAge - 0.12) / 0.9) + wobble(gulpAge / 0.4, 22) * 0.35
    box.scale.set(1 + jolt * 0.05, 1 - jolt * 0.07, 1 + jolt * 0.05)
    box.rotation.z = wobble((closeAge - 0.15) / 0.8, 26) * 0.06
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
      !doorOpen &&
      closeAge > CLOSE &&
      gulpAge > 0.4 &&
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
  /* Half extents of the visible area on the z = 0 plane, where letters may appear. */
  const view = { x: 0, y: 0 }

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
    view.y = distance * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
    view.x = view.y * camera.aspect
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

  const inFrame = (point: THREE.Vector3, margin: number) => {
    point.x = THREE.MathUtils.clamp(point.x, -view.x * margin, view.x * margin)
    point.y = THREE.MathUtils.clamp(point.y, 0.2 - view.y * 0.7, 0.2 + view.y * margin)
    return point
  }

  /** Rolls a new throw: a start inside the frame and away from the mailbox, a random swing, pace and spin. */
  const throwLetter = (letter: Letter) => {
    letter.age = 0
    letter.flight = random(0.55, 1.05)
    letter.slide = random(0.2, 0.34)
    letter.punch = Math.random()
    letter.size = random(0.68, 0.95)
    letter.turns = random(0.3, 2.2) * (Math.random() < 0.5 ? -1 : 1)
    letter.axis.randomDirection()
    const room = (0.86 - 0.72 * letter.size) / 2 - 0.02
    letter.slot.set(random(-room, room), WALL * 0.75 + random(-0.08, 0.1), DEPTH / 2 + 0.45)
    letter.reach = random(0.6, 1.8)
    letter.rise = random(-0.2, 0.9)
    letter.tilt.setFromEuler(
      new THREE.Euler(-Math.PI / 2 + random(0.4, 0.75), 0, random(-0.15, 0.15)),
    )

    for (let attempt = 0; attempt < 12; attempt++) {
      letter.start.set(
        random(-view.x, view.x) * 0.92,
        0.2 + random(-0.4, 0.9) * view.y,
        random(-2, 2),
      )
      const clear = Math.abs(letter.start.x - rig.position.x) > 1.6 || letter.start.y > 1.9
      if (clear) break
    }
    inFrame(letter.start, 0.92)
    letter.swing.set(
      letter.start.x + random(-2.4, 2.4),
      letter.start.y + random(-0.5, 2.6),
      letter.start.z + random(-2, 2.5),
    )
    inFrame(letter.swing, 0.85)
  }

  /** Posts one letter. Calls stack: every click sends its own letter. */
  const deliver = () => {
    if (options.reducedMotion) {
      flagSpring.target = 0
      play()
      return
    }

    let letter = letters.find((candidate) => !candidate.group.visible)
    if (!letter && letters.length < MAX_LETTERS) {
      letter = createLetter()
      letters.push(letter)
    }
    if (letter) {
      throwLetter(letter)
      letter.group.visible = true
      flagSpring.target = FLAG_DOWN
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

  return { deliver }
}

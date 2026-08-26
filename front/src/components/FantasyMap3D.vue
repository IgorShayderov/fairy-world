<template>
  <section class="min-h-[400px] w-full rounded-lg p-6 shadow-xl bg-gray-800 text-white">
    <h2 class="mb-4 text-2xl font-bold text-center">🗺️ {{ $t('fantasy.mapTitle') }}</h2>
    <div class="relative h-[400px] w-full rounded-lg overflow-hidden bg-gradient-to-br from-indigo-600 to-purple-600">
      <!-- 3D Map Canvas using Three.js -->
      <canvas id="fantasyMapCanvas" class="absolute inset-0"></canvas>
    </div>
    <p class="mt-4 text-center text-sm opacity-80">
      {{ $t('fantasy.mapDescription') }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

// Three.js types - declare global for Three.js types
declare global {
  interface Window {
    THREE?: any
  }
}

// Three.js setup
let scene: any = null
let camera: any = null
let renderer: any = null

onMounted(() => {
  initThreeJS()
  createScene()
  createObjects()
  animate()
})

onUnmounted(() => {
  if (renderer) {
    renderer.dispose()
    renderer.forceReflow()
    renderer.setAnimationLoop(null)
  }
})

// Initialize ThreeJS
function initThreeJS() {
  const canvas = document.getElementById('fantasyMapCanvas') as HTMLCanvasElement
  if (!canvas) return

  // Set canvas size
  canvas.width = canvas.clientWidth
  canvas.height = canvas.clientHeight

  // Scene
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x1a0a2e)

  // Camera
  camera = new THREE.PerspectiveCamera(75, canvas.width / canvas.height, 0.1, 1000)
  camera.position.z = 10

  // Renderer
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setSize(canvas.width, canvas.height)
  renderer.setPixelRatio(window.devicePixelRatio)
}

// Create fantasy objects
function createObjects() {
  if (!scene || !camera) return

  // Ground plane
  const groundGeometry = new THREE.PlaneGeometry(50, 50)
  const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x2a1a40 })
  const ground = new THREE.Mesh(groundGeometry, groundMaterial)
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  scene.add(ground)

  // Add fantasy towers
  for (let i = 0; i < 10; i++) {
    const geometry = new THREE.ConeGeometry(0.5 + Math.random() * 1.5, 2 + Math.random() * 3, 4)
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(Math.random(), 0.5, 0.5),
      roughness: 0.3,
      metalness: 0.1
    })
    const tower = new THREE.Mesh(geometry, material)
    tower.position.set(
      (Math.random() - 0.5) * 30,
      0,
      (Math.random() - 0.5) * 30
    )
    tower.castShadow = true
    tower.receiveShadow = true
    scene.add(tower)
  }

  // Add stars background
  const starGeometry = new THREE.SphereGeometry(50, 32, 32)
  const starMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    side: THREE.BackSide
  })
  const stars = new THREE.Mesh(starGeometry, starMaterial)
  scene.add(stars)

  // Add moon
  const moonGeometry = new THREE.SphereGeometry(1, 32, 32)
  const moonMaterial = new THREE.MeshStandardMaterial({ color: 0xf0f0f0 })
  const moon = new THREE.Mesh(moonGeometry, moonMaterial)
  moon.position.set(15, 10, 15)
  moon.receiveShadow = true
  scene.add(moon)

  // Add sun/light
  const ambientLight = new THREE.AmbientLight(0x404040, 0.6)
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
  directionalLight.position.set(10, 15, 10)
  directionalLight.castShadow = true
  scene.add(directionalLight)

  // Hemisphere light
  const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x6b4226, 0.3)
  scene.add(hemisphereLight)
}

// Animation loop
function animate() {
  requestAnimationFrame(animate)

  if (!renderer || !scene || !camera) return

  // Rotate objects
  ;(scene.children as any[]).forEach((obj: any) => {
    if (obj.type === 'Mesh') {
      ;(obj as any).rotation.y += 0.01
      ;(obj as any).rotation.x += 0.005
    }
  })

  // Rotate moon
  if (scene.children.some((c: any) => c.name === 'moon')) {
    ;(scene.children.find((c: any) => c.name === 'moon') as any).rotation.y += 0.005
  }

  renderer.render(scene, camera)
}
</script>

<style scoped>
canvas {
  width: 100% !important;
  height: 100% !important;
}
</style>
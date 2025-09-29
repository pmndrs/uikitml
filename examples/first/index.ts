import * as THREE from 'three'
import { interpret, parse, reversePainterSortStable } from '@pmndrs/uikitml'
import Stats from 'stats.js'
import * as Icons from '@pmndrs/uikit-lucide'
//import * as Defaults from '@pmndrs/uikit-default'
import * as Horizon from '@pmndrs/uikit-horizon'
import { forwardHtmlEvents } from '@pmndrs/pointer-events'
import { OrbitHandles } from '@pmndrs/handle'

const stats = new Stats()
document.body.appendChild(stats.dom)

// Create scene, camera, and renderer
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setTransparentSort(reversePainterSortStable)

renderer.setClearColor(0x202020)
document.getElementById('app')!.appendChild(renderer.domElement)

// Add lighting
const ambientLight = new THREE.AmbientLight(0x404040, 0.5)
scene.add(ambientLight)

const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
directionalLight.position.set(5, 5, 5)
scene.add(directionalLight)

// Parse and interpret the uikitml - this returns a Three.js object
const userInterface = interpret(parse('<div style="align-items:center; gap: 4px"><Button style="text-align: center">Test</Button></div>'), {
  ...(Icons as {}),
  ...(Horizon as {}),
  //...(Defaults as {}),
})!
userInterface.setProperties({ padding: 32, color: '#000', backgroundColor: '#fff' })
scene.add(userInterface)

// Position camera
camera.position.z = 5

const { update } = forwardHtmlEvents(renderer.domElement, camera, scene)
const orbit = new OrbitHandles(renderer.domElement, camera)
orbit.bind(scene)

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(window.devicePixelRatio)
}
resize()

// Handle window resize
window.addEventListener('resize', resize)

// Animation loop
function animate(delta: number) {
  update()
  orbit.update(delta)
  userInterface.update(delta)
  stats.update()

  renderer.render(scene, camera)
}

renderer.setAnimationLoop(animate)

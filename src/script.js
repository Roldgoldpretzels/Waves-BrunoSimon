import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import terrainVertexShader from './shaders/terrain/vertex.glsl'
import terrainFragmentShader from './shaders/terrain/fragment.glsl'
import Guify from'guify'
import { EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer'
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass'
import {BokehPass} from 'three/examples/jsm/postprocessing/BokehPass'
import { UniformsLib } from 'three'
import terrainDepthVertexShader from './shaders/terrainDepth/vertex.glsl'
import terrainDepthFragmentShader from './shaders/terrainDepth/fragment.glsl'


/**
 * Base
 */
// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

/**
 * Sizes
 */

//Debugger


const sizes = {
    width: window.innerWidth,
    height: window.innerHeight,
    pixelRatio: Math.min(window.devicePixelRatio, 2)
}

window.addEventListener('resize', () => {
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight
    sizes.PixelRatio = Math.min(window.devicePixelRatio, 2)

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(sizes.pixelRatio)

})

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
camera.position.x = 1
camera.position.y = 1
camera.position.z = 1
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

/**
 * Terrain
 */

const terrain = {}

terrain.texture = {}
terrain.texture.linesCount = 4
terrain.texture.bigLineWidth = .08
terrain.texture.smallLineWidth = .01
terrain.texture.smallLineAlpha = 0.6
terrain.texture.width = 50
terrain.texture.height = 150
terrain.texture.canvas = document.createElement('canvas')
terrain.texture.canvas.width = terrain.texture.width
terrain.texture.canvas.height = terrain.texture.height
terrain.texture.canvas.style.position = 'fixed'
terrain.texture.canvas.style.top = 0
terrain.texture.canvas.style.left = 0
terrain.texture.canvas.style.zIndex = 1
document.body.append(terrain.texture.canvas)

terrain.texture.context = terrain.texture.canvas.getContext('2d')


terrain.texture.instance = new THREE.CanvasTexture(terrain.texture.canvas)
terrain.texture.instance.wrapS = THREE.RepeatWrapping
terrain.texture.instance.wrapT = THREE.RepeatWrapping
terrain.texture.instance.magFilter = THREE.NearestFilter

terrain.texture.update = () => {
    terrain.texture.context.clearRect(0, Math.round(terrain.texture.height * 0), terrain.texture.width, 4)

    //Big Lines
    const actualBigLineWidth = Math.round(terrain.texture.height * terrain.texture.bigLineWidth)
    terrain.texture.context.globalAlpha = 1
    terrain.texture.context.fillStyle='#ffffff'

    terrain.texture.context.fillRect(
    0,
    0,
    terrain.texture.width,
    actualBigLineWidth,
    )

    //Small Lines
    const actualSmallLineWidth = Math.round(terrain.texture.height * terrain.texture.smallLineWidth)
    const smallLinesCount = terrain.texture.linesCount -1
    for(let i =0; i < smallLinesCount; i++){

        terrain.texture.context.globalAlpha = terrain.texture.smallLineAlpha
        terrain.texture.context.fillStyle='#00ffff'

        terrain.texture.context.fillRect(
        0,
        actualBigLineWidth+ Math.round((terrain.texture.height-actualBigLineWidth)/terrain.texture.linesCount) *(i+1),
        terrain.texture.width,
        actualSmallLineWidth
        )
    }

}
terrain.texture.update()



//Geometry 
terrain.geometry = new THREE.PlaneGeometry(1, 1, 1000, 1000)
terrain.geometry.rotateX(-Math.PI * 0.5)

terrain.uniforms={
    uTexture: { value: terrain.texture.instance },
    uElevation: { value: 2 },
    uTextureFrequency: {value: 10},
    uTime:{value:0}
}

//Material
terrain.material = new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.DoubleSide,
    vertexShader: terrainVertexShader,
    fragmentShader: terrainFragmentShader,
    uniforms:terrain.uniforms

})
//Depth Material
const uniforms = THREE.UniformsUtils.merge([
    THREE.UniformsLib.common,
    THREE.UniformsLib.displacementmap,
])

for (const uniformKey in terrain.uniforms)
{
    uniforms[uniformKey] = terrain.uniforms[uniformKey]
}
terrain.depthMaterial = new THREE.MeshDepthMaterial({

    uniforms: uniforms,
    vertexShader: terrainDepthVertexShader,
    fragmentShader: terrainDepthFragmentShader,

})


terrain.depthMaterial.depthPacking = THREE.RGBADepthPacking
terrain.depthMaterial.blending = THREE.NoBlending

//Mesh
terrain.mesh = new THREE.Mesh(terrain.geometry, terrain.material)
terrain.mesh.scale.set(10, 10, 10)
terrain.mesh.userData.depthMaterial = terrain.depthMaterial
scene.add(terrain.mesh)

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
})
renderer.setClearColor(0x11092e, 1)
renderer.outputEncoding = THREE.sRGBEncoding
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(sizes.pixelRatio)

const renderTarget = new THREE.WebGLMultipleRenderTargets(800,600,{
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    encoding: THREE.sRGBEncoding
})

const effectComposer = new EffectComposer(renderer)
effectComposer.setSize(sizes.width, sizes.height)
effectComposer.setPixelRatio(sizes.pixelRatio)

const renderPass= new RenderPass(scene,camera)
effectComposer.addPass(renderPass)

const bokehPass = new BokehPass(
    scene,
    camera,
    {
        focus: 1.25,
        aperture: 0.015,
        maxblur: 0.01,

        width: sizes.width * sizes.setPixelRatio,
        height: sizes.height * sizes.setPixelRatio
    }
)
effectComposer.addPass(bokehPass)


/**
 * Animate
 */
const clock = new THREE.Clock()
let lastElapsedTime = 0

const tick = () => {
    const elapsedTime = clock.getElapsedTime()
    const deltaTime = elapsedTime - lastElapsedTime
    lastElapsedTime = elapsedTime


    //Terrain Update
    terrain.material.uniforms.uTime.value = elapsedTime
    // Update controls
    controls.update()

    // Render
    // renderer.render(scene, camera)
    effectComposer.render()

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()
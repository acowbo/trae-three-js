<template>
  <div ref="container" class="city-scene-container">
    <TrafficSystem ref="trafficSystem" />
    <PopulationEnvironmentSystem ref="populationEnvSystem" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, reactive, computed } from 'vue'
import TrafficSystem from './TrafficSystem.vue'
import PopulationEnvironmentSystem from './PopulationEnvironmentSystem.vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { FXAAPass } from 'three/examples/jsm/postprocessing/FXAAPass.js'
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import gsap from 'gsap'

// 组件引用
const container = ref(null)
const trafficSystem = ref(null)
const populationEnvSystem = ref(null)

// 场景相关变量
let scene, camera, renderer, controls, composer
let clock, ambientLight, directionalLight, pointLight
let cityGroup, roadGroup, riverGroup, parkGroup, cloudGroup, trafficGroup, populationGroup, sensorGroup, facilityGroup, eventGroup
let skybox, cloudsMesh
let animationFrameId

// 人口和环境系统变量
let populationGrid = null
let sensorMeshes = []
let facilityMeshes = []
let eventMeshes = []

// 交通系统变量
let roads = []
let cameras = []

// 场景配置
const config = reactive({
  // 城市配置
  city: {
    size: 2000,
    gridSize: 20,
    buildingCount: 1000,
    minBuildingHeight: 10,
    maxBuildingHeight: 100,
    buildingColor: 0x888888,
    buildingGlassColor: 0x4488ff
  },
  // 道路配置
  road: {
    width: 20,
    color: 0x333333
  },
  // 河流配置
  river: {
    width: 30,
    color: 0x2266aa
  },
  // 公园配置
  park: {
    color: 0x228844
  },
  // 光照配置
  lighting: {
    ambientIntensity: 0.5,
    directionalIntensity: 1.0,
    pointLightIntensity: 0.8,
    dayColor: 0xffffff,
    nightColor: 0x444488,
    sunsetColor: 0xff8844
  },
  // 天空配置
  sky: {
    dayTexture: '/textures/skybox/skyday.jpg',
    nightTexture: '/textures/skybox/skynight.jpg',
    cloudTexture: '/textures/clouds/cloud.png',
    cloudSpeed: 0.01
  },
  // 后期效果配置
  postProcessing: {
    bloomStrength: 0.8,
    bloomRadius: 0.4,
    bloomThreshold: 0.2,
    fogDensity: 0.0003,
    fogColor: 0xffffff
  },
  // 相机配置
  camera: {
    fov: 75,
    near: 0.1,
    far: 5000,
    initialPosition: { x: 0, y: 200, z: 500 },
    targetPosition: { x: 0, y: 100, z: 0 },
    moveSpeed: 10,
    rotateSpeed: 0.005
  },
  // 动画配置
  animation: {
    dayDuration: 60000, // 60秒一个昼夜循环
    flightDuration: 300000 // 5分钟自动飞行一圈
  }
})

// 计算属性 - 根据时间计算当前昼夜状态
const timeOfDay = ref(0) // 0 = 午夜, 0.5 = 中午, 1 = 午夜
const isDay = computed(() => timeOfDay.value > 0.25 && timeOfDay.value < 0.75)
const isSunset = computed(() => timeOfDay.value > 0.65 && timeOfDay.value < 0.75)
const isSunrise = computed(() => timeOfDay.value > 0.25 && timeOfDay.value < 0.35)

// 初始化场景
const initScene = () => {
  // 创建场景
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x87CEEB)
  scene.fog = new THREE.FogExp2(config.postProcessing.fogColor, config.postProcessing.fogDensity)
  
  // 创建相机
  camera = new THREE.PerspectiveCamera(
    config.camera.fov,
    window.innerWidth / window.innerHeight,
    config.camera.near,
    config.camera.far
  )
  camera.position.set(
    config.camera.initialPosition.x,
    config.camera.initialPosition.y,
    config.camera.initialPosition.z
  )
  
  // 创建渲染器
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.outputColorSpace = THREE.SRGBColorSpace
  
  // 添加渲染器到DOM
  container.value.appendChild(renderer.domElement)
  
  // 创建轨道控制器
  controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(
    config.camera.targetPosition.x,
    config.camera.targetPosition.y,
    config.camera.targetPosition.z
  )
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.maxPolarAngle = Math.PI * 0.7 // 限制相机最大仰角
  controls.minDistance = 100
  controls.maxDistance = 1000
  
  // 初始化时钟
  clock = new THREE.Clock()
  
  // 创建分组
  cityGroup = new THREE.Group()
  roadGroup = new THREE.Group()
  riverGroup = new THREE.Group()
  parkGroup = new THREE.Group()
  cloudGroup = new THREE.Group()
  trafficGroup = new THREE.Group()
  populationGroup = new THREE.Group()
  sensorGroup = new THREE.Group()
  facilityGroup = new THREE.Group()
  eventGroup = new THREE.Group()
  
  scene.add(cityGroup)
  scene.add(roadGroup)
  scene.add(riverGroup)
  scene.add(parkGroup)
  scene.add(cloudGroup)
  scene.add(trafficGroup)
  scene.add(populationGroup)
  scene.add(sensorGroup)
  scene.add(facilityGroup)
  scene.add(eventGroup)
}

// 创建天空盒
const createSkybox = () => {
  // 创建天空盒材质 - 使用内置的CanvasTexture生成简单纹理
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 1024
  const context = canvas.getContext('2d')
  
  // 创建渐变背景
  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height)
  gradient.addColorStop(0, '#87CEEB') // 浅蓝色
  gradient.addColorStop(1, '#4A90E2') // 深蓝色
  
  context.fillStyle = gradient
  context.fillRect(0, 0, canvas.width, canvas.height)
  
  // 创建纹理
  const skyboxTexture = new THREE.CanvasTexture(canvas)
  
  // 创建天空盒材质
  const skyboxMaterial = new THREE.MeshBasicMaterial({
    map: skyboxTexture,
    side: THREE.BackSide
  })
  
  // 创建天空盒几何体
  const skyboxGeometry = new THREE.BoxGeometry(4000, 4000, 4000)
  skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterial)
  scene.add(skybox)
}

// 创建动态云层
const createClouds = () => {
  // 创建云层材质 - 使用内置的CanvasTexture生成简单纹理
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 1024
  const context = canvas.getContext('2d')
  
  // 创建云层纹理
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  
  // 添加一些随机的白色斑点作为云层
  for (let i = 0; i < 1000; i++) {
    const x = Math.random() * canvas.width
    const y = Math.random() * canvas.height
    const radius = Math.random() * 20 + 5
    
    context.beginPath()
    context.arc(x, y, radius, 0, Math.PI * 2)
    context.fillStyle = 'rgba(255, 255, 255, 0.8)'
    context.fill()
  }
  
  // 创建纹理
  const cloudTexture = new THREE.CanvasTexture(canvas)
  
  // 创建云层材质
  const cloudMaterial = new THREE.MeshBasicMaterial({
    map: cloudTexture,
    transparent: true,
    opacity: 0.7,
    depthWrite: false
  })
  
  // 创建云层几何体
  const cloudGeometry = new THREE.PlaneGeometry(2000, 2000)
  cloudsMesh = new THREE.Mesh(cloudGeometry, cloudMaterial)
  cloudsMesh.rotation.x = -Math.PI / 2
  cloudsMesh.position.y = 300
  cloudGroup.add(cloudsMesh)
  
  // 创建多层云层增加层次感
  for (let i = 1; i < 5; i++) {
    const cloudLayer = new THREE.Mesh(cloudGeometry, cloudMaterial.clone())
    cloudLayer.rotation.x = -Math.PI / 2
    cloudLayer.position.y = 300 + i * 50
    cloudLayer.scale.set(1 + i * 0.2, 1 + i * 0.2, 1)
    cloudLayer.material.opacity = 0.7 - i * 0.1
    cloudGroup.add(cloudLayer)
  }
}

// 创建光照
const createLights = () => {
  // 环境光
  ambientLight = new THREE.AmbientLight(0x404040, config.lighting.ambientIntensity)
  scene.add(ambientLight)
  
  // 方向光（太阳）
  directionalLight = new THREE.DirectionalLight(0xffffff, config.lighting.directionalIntensity)
  directionalLight.position.set(1000, 1000, 1000)
  directionalLight.castShadow = true
  scene.add(directionalLight)
  
  // 调整阴影属性
  directionalLight.shadow.mapSize.width = 4096
  directionalLight.shadow.mapSize.height = 4096
  directionalLight.shadow.camera.near = 0.5
  directionalLight.shadow.camera.far = 2000
  directionalLight.shadow.camera.left = -1000
  directionalLight.shadow.camera.right = 1000
  directionalLight.shadow.camera.top = 1000
  directionalLight.shadow.camera.bottom = -1000
  
  // 点光源（用于夜晚的建筑灯光）
  pointLight = new THREE.PointLight(0xffffff, config.lighting.pointLightIntensity, 100)
  pointLight.position.set(100, 50, 100)
  scene.add(pointLight)
}

// 程序化生成建筑群
const generateBuildings = () => {
  // 建筑材质
  const buildingMaterial = new THREE.MeshLambertMaterial({
    color: config.city.buildingColor
  })
  
  const glassMaterial = new THREE.MeshLambertMaterial({
    color: config.city.buildingGlassColor,
    transparent: true,
    opacity: 0.7
  })
  
  // 生成建筑
  for (let i = 0; i < config.city.buildingCount; i++) {
    // 随机位置
    const x = THREE.MathUtils.randInt(-config.city.size/2, config.city.size/2)
    const z = THREE.MathUtils.randInt(-config.city.size/2, config.city.size/2)
    
    // 随机尺寸
    const width = THREE.MathUtils.randInt(5, 20)
    const depth = THREE.MathUtils.randInt(5, 20)
    const height = THREE.MathUtils.randInt(config.city.minBuildingHeight, config.city.maxBuildingHeight)
    
    // 创建建筑几何体
    const buildingGeometry = new THREE.BoxGeometry(width, height, depth)
    const buildingMesh = new THREE.Mesh(buildingGeometry, buildingMaterial)
    buildingMesh.position.set(x, height/2, z)
    buildingMesh.castShadow = true
    buildingMesh.receiveShadow = true
    
    // 添加建筑到城市组
    cityGroup.add(buildingMesh)
    
    // 添加玻璃幕墙
    if (THREE.MathUtils.randInt(0, 1) === 1) {
      const glassWidth = width * 0.9
      const glassDepth = depth * 0.9
      const glassHeight = height * 0.9
      
      const glassGeometry = new THREE.BoxGeometry(glassWidth, glassHeight, glassDepth)
      const glassMesh = new THREE.Mesh(glassGeometry, glassMaterial)
      glassMesh.position.set(x, height/2, z)
      glassMesh.castShadow = true
      glassMesh.receiveShadow = true
      
      cityGroup.add(glassMesh)
    }
  }
}

// 生成道路网格
const generateRoads = () => {
  // 道路材质
  const roadMaterial = new THREE.MeshLambertMaterial({ color: config.road.color })
  
  // 道路宽度
  const roadWidth = config.road.width
  const roadSpacing = roadWidth + 20
  
  roads = []
  
  // 生成横向道路
  for (let i = -config.city.gridSize/2; i <= config.city.gridSize/2; i++) {
    const roadLength = config.city.size
    const roadGeometry = new THREE.BoxGeometry(roadLength, 0.1, roadWidth)
    const roadMesh = new THREE.Mesh(roadGeometry, roadMaterial)
    roadMesh.position.set(0, 0, i * roadSpacing)
    roadMesh.receiveShadow = true
    roadGroup.add(roadMesh)
    
    // 保存道路信息
    roads.push({
      id: `road-h-${i}`,
      mesh: roadMesh,
      type: 'horizontal',
      position: { x: 0, y: 0, z: i * roadSpacing },
      density: 0
    })
  }
  
  // 生成纵向道路
  for (let i = -config.city.gridSize/2; i <= config.city.gridSize/2; i++) {
    const roadLength = config.city.size
    const roadGeometry = new THREE.BoxGeometry(roadWidth, 0.1, roadLength)
    const roadMesh = new THREE.Mesh(roadGeometry, roadMaterial)
    roadMesh.position.set(i * roadSpacing, 0, 0)
    roadMesh.receiveShadow = true
    roadGroup.add(roadMesh)
    
    // 保存道路信息
    roads.push({
      id: `road-v-${i}`,
      mesh: roadMesh,
      type: 'vertical',
      position: { x: i * roadSpacing, y: 0, z: 0 },
      density: 0
    })
  }
  
  // 生成路口摄像头
  generateCameras()
}

// 生成路口摄像头
const generateCameras = () => {
  cameras = []
  
  // 摄像头材质
  const cameraMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 })
  const cameraGeometry = new THREE.CylinderGeometry(0.5, 0.5, 2, 8)
  
  // 在道路交叉口生成摄像头
  const roadSpacing = config.road.width + 20
  
  for (let i = -config.city.gridSize/2; i <= config.city.gridSize/2; i++) {
    for (let j = -config.city.gridSize/2; j <= config.city.gridSize/2; j++) {
      // 跳过中心位置
      if (i === 0 && j === 0) continue
      
      const cameraMesh = new THREE.Mesh(cameraGeometry, cameraMaterial)
      cameraMesh.position.set(i * roadSpacing, 10, j * roadSpacing)
      cameraMesh.rotation.z = Math.PI / 2
      trafficGroup.add(cameraMesh)
      
      // 添加点击事件
      cameraMesh.userData = {
        cameraId: `camera-${i}-${j}`,
        cameraName: `路口${i}-${j}`
      }
      
      cameras.push({
        id: `camera-${i}-${j}`,
        name: `路口${i}-${j}`,
        position: { x: i * roadSpacing, y: 10, z: j * roadSpacing },
        mesh: cameraMesh
      })
    }
  }
}

// 生成河流
const generateRiver = () => {
  // 河流材质
  const riverMaterial = new THREE.MeshLambertMaterial({
    color: config.river.color,
    transparent: true,
    opacity: 0.8
  })
  
  // 创建河流几何体
  const riverGeometry = new THREE.BoxGeometry(config.city.size * 0.8, 0.5, config.river.width)
  const riverMesh = new THREE.Mesh(riverGeometry, riverMaterial)
  riverMesh.position.set(0, 0.25, 50)
  riverMesh.receiveShadow = true
  riverGroup.add(riverMesh)
  
  // 添加河流反光效果
  const riverReflectMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.3
  })
  
  const riverReflectGeometry = new THREE.PlaneGeometry(config.city.size * 0.8, config.river.width)
  const riverReflectMesh = new THREE.Mesh(riverReflectGeometry, riverReflectMaterial)
  riverReflectMesh.rotation.x = -Math.PI / 2
  riverReflectMesh.position.set(0, 0.5, 50)
  riverGroup.add(riverReflectMesh)
}

// 生成公园绿地
const generateParks = () => {
  // 公园材质
  const parkMaterial = new THREE.MeshLambertMaterial({
    color: config.park.color
  })
  
  // 生成几个大型公园
  for (let i = 0; i < 5; i++) {
    const parkWidth = THREE.MathUtils.randInt(100, 300)
    const parkDepth = THREE.MathUtils.randInt(100, 300)
    
    const parkGeometry = new THREE.BoxGeometry(parkWidth, 0.1, parkDepth)
    const parkMesh = new THREE.Mesh(parkGeometry, parkMaterial)
    
    // 随机位置，但避免与河流重叠
    let x, z
    do {
      x = THREE.MathUtils.randInt(-config.city.size/2 + parkWidth/2, config.city.size/2 - parkWidth/2)
      z = THREE.MathUtils.randInt(-config.city.size/2 + parkDepth/2, config.city.size/2 - parkDepth/2)
    } while (Math.abs(z - 50) < parkDepth/2 + config.river.width/2)
    
    parkMesh.position.set(x, 0.05, z)
    parkMesh.receiveShadow = true
    parkGroup.add(parkMesh)
  }
}

// 初始化后期效果
const initPostProcessing = () => {
  // 创建效果合成器
  composer = new EffectComposer(renderer)
  
  // 添加渲染通道
  const renderPass = new RenderPass(scene, camera)
  composer.addPass(renderPass)
  
  // 添加泛光效果
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    config.postProcessing.bloomStrength,
    config.postProcessing.bloomRadius,
    config.postProcessing.bloomThreshold
  )
  composer.addPass(bloomPass)
  
  // 添加抗锯齿效果
  if (renderer.getPixelRatio() === 1 && !renderer.capabilities.isWebGL2) {
    // 检查SMAAPass是否需要额外的纹理文件
    try {
      const smaaPass = new SMAAPass(window.innerWidth * renderer.getPixelRatio(), window.innerHeight * renderer.getPixelRatio())
      composer.addPass(smaaPass)
    } catch (error) {
      console.error('Error creating SMAAPass:', error)
      // 如果SMAAPass创建失败，使用FXAAPass代替
      const fxaaPass = new FXAAPass(window.innerWidth, window.innerHeight)
      composer.addPass(fxaaPass)
    }
  } else {
    const fxaaPass = new FXAAPass(window.innerWidth, window.innerHeight)
    composer.addPass(fxaaPass)
  }
  

}

// 实现昼夜循环
const updateDayNightCycle = () => {
  // 更新时间
  const delta = clock.getDelta()
  timeOfDay.value += delta / config.animation.dayDuration
  if (timeOfDay.value > 1) timeOfDay.value = 0
  
  // 计算太阳角度
  const sunAngle = timeOfDay.value * Math.PI * 2
  const sunY = Math.sin(sunAngle) * 1000
  const sunX = Math.cos(sunAngle) * 1000
  
  // 更新方向光位置和颜色
  directionalLight.position.set(sunX, sunY, 0)
  
  if (isDay.value) {
    // 白天
    scene.background.set(0x87CEEB)
    ambientLight.color.set(0x404040)
    directionalLight.color.set(0xffffff)
    directionalLight.intensity = config.lighting.directionalIntensity
    pointLight.intensity = 0
  } else if (isSunset.value || isSunrise.value) {
    // 日落或日出
    const sunsetColor = new THREE.Color(config.lighting.sunsetColor)
    scene.background.set(sunsetColor)
    ambientLight.color.set(sunsetColor)
    directionalLight.color.set(sunsetColor)
    directionalLight.intensity = config.lighting.directionalIntensity * 0.5
    pointLight.intensity = config.lighting.pointLightIntensity * 0.5
  } else {
    // 夜晚
    scene.background.set(0x111133)
    ambientLight.color.set(0x222244)
    directionalLight.color.set(0x444466)
    directionalLight.intensity = config.lighting.directionalIntensity * 0.1
    pointLight.intensity = config.lighting.pointLightIntensity
  }
  
  // 更新天空盒
  if (skybox) {
    if (isDay.value) {
      skybox.material.map = new THREE.TextureLoader().load(config.sky.dayTexture)
    } else {
      skybox.material.map = new THREE.TextureLoader().load(config.sky.nightTexture)
    }
    skybox.material.needsUpdate = true
  }
}

// 实现自动飞行动画
const startAutoFlight = () => {
  // 创建飞行路径
  const flightPath = {
    path: [
      { x: 500, y: 300, z: 500 },
      { x: -500, y: 200, z: 500 },
      { x: -500, y: 400, z: -500 },
      { x: 500, y: 150, z: -500 },
      { x: 500, y: 300, z: 500 }
    ],
    target: [
      { x: 0, y: 100, z: 0 },
      { x: 0, y: 100, z: 0 },
      { x: 0, y: 100, z: 0 },
      { x: 0, y: 100, z: 0 },
      { x: 0, y: 100, z: 0 }
    ]
  }
  
  // 使用gsap创建动画
  gsap.to(camera.position, {
    duration: config.animation.flightDuration,
    bezier: flightPath.path,
    ease: 'power1.inOut',
    repeat: -1,
    onUpdate: () => {
      // 更新相机目标
      const progress = gsap.utils.clamp(0, 1, (camera.position.x + 500) / 1000)
      const targetIndex = Math.floor(progress * flightPath.target.length)
      const target = flightPath.target[targetIndex]
      controls.target.set(target.x, target.y, target.z)
    }
  })
}

// 处理窗口大小变化
const handleWindowResize = () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
  
  if (composer) {
    composer.setSize(window.innerWidth, window.innerHeight)
  }
}

// WebSocket连接
let ws = null

// 初始化WebSocket连接
const initWebSocket = () => {
  ws = new WebSocket('ws://localhost:8080/traffic')
  
  ws.onopen = () => {
    console.log('WebSocket连接已建立')
  }
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data)
    updateTrafficData(data)
  }
  
  ws.onerror = (error) => {
    console.error('WebSocket错误:', error)
  }
  
  ws.onclose = () => {
    console.log('WebSocket连接已关闭')
    // 尝试重新连接
    setTimeout(initWebSocket, 5000)
  }
}

// 更新交通数据
const updateTrafficData = (data) => {
  if (data.roads) {
    data.roads.forEach(trafficRoad => {
      const road = roads.find(r => r.id === trafficRoad.id)
      if (road) {
        road.density = trafficRoad.density
        // 根据拥堵程度设置道路颜色
        const color = getTrafficColor(trafficRoad.density)
        road.mesh.material.color.set(color)
      }
    })
  }
  
  if (data.cameras) {
    data.cameras.forEach(cameraData => {
      const camera = cameras.find(c => c.id === cameraData.id)
      if (camera) {
        camera.status = cameraData.status
      }
    })
  }
  
  // 将交通数据传递给TrafficSystem组件
  if (trafficSystem.value) {
    trafficSystem.value.updateTrafficData(data)
  }
}

// 根据拥堵程度获取颜色
const getTrafficColor = (density) => {
  // 绿色：畅通（0-0.3）
  if (density < 0.3) {
    return new THREE.Color(0x00ff00)
  }
  // 黄色：缓慢（0.3-0.7）
  else if (density < 0.7) {
    return new THREE.Color(0xffff00)
  }
  // 红色：拥堵（0.7-1.0）
  else {
    return new THREE.Color(0xff0000)
  }
}

// 鼠标点击事件处理
const handleMouseClick = (event) => {
  // 创建射线投射器
  const raycaster = new THREE.Raycaster()
  const mouse = new THREE.Vector2()
  
  // 计算鼠标位置
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1
  
  // 设置射线投射器
  raycaster.setFromCamera(mouse, camera)
  
  // 检测与摄像头的交点
  const cameraMeshes = cameras.map(cam => cam.mesh)
  const intersects = raycaster.intersectObjects(cameraMeshes)
  
  if (intersects.length > 0) {
    const cameraId = intersects[0].object.userData.cameraId
    // 调用交通系统的选择摄像头方法
    if (trafficSystem.value) {
      trafficSystem.value.selectCamera(cameraId)
    }
    return
  }
  
  // 检测与传感器的交点
  const sensorIntersects = raycaster.intersectObjects(sensorMeshes)
  if (sensorIntersects.length > 0) {
    const entity = sensorIntersects[0].object.userData.entity
    if (populationEnvSystem.value) {
      populationEnvSystem.value.selectEntity(entity)
    }
    return
  }
  
  // 检测与设施的交点
  const facilityIntersects = raycaster.intersectObjects(facilityMeshes)
  if (facilityIntersects.length > 0) {
    const entity = facilityIntersects[0].object.userData.entity
    if (populationEnvSystem.value) {
      populationEnvSystem.value.selectEntity(entity)
    }
    return
  }
  
  // 检测与事件的交点
  const eventIntersects = raycaster.intersectObjects(eventMeshes)
  if (eventIntersects.length > 0) {
    const entity = eventIntersects[0].object.userData.entity
    if (populationEnvSystem.value) {
      populationEnvSystem.value.selectEntity(entity)
    }
    return
  }
}

// 渲染循环
const animate = () => {
  animationFrameId = requestAnimationFrame(animate)
  
  // 更新控制器
  controls.update()
  
  // 更新云层动画
  if (cloudGroup) {
    cloudGroup.children.forEach((cloud, index) => {
      cloud.position.x += config.sky.cloudSpeed * (index + 1)
      cloud.position.z += config.sky.cloudSpeed * (index + 1) * 0.5
      
      // 当云层超出边界时，重置位置
      if (cloud.position.x > config.city.size) {
        cloud.position.x = -config.city.size
      }
      if (cloud.position.z > config.city.size) {
        cloud.position.z = -config.city.size
      }
    })
  }
  
  // 更新人口密度热力图
  updatePopulationGrid()
  
  // 更新应急事件闪烁效果
  const time = clock.getElapsedTime()
  eventMeshes.forEach((eventMesh, index) => {
    const scale = 1 + Math.sin(time * 5 + index) * 0.1
    eventMesh.scale.set(scale, scale, scale)
  })
  
  // 更新昼夜循环
  updateDayNightCycle()
  
  // 渲染场景
  if (composer) {
    composer.render()
  } else {
    renderer.render(scene, camera)
  }
}

// 创建人口密度热力图
const createPopulationGrid = () => {
  const gridSize = 2000
  const cellSize = 100
  const gridMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.5 })
  
  for (let x = -gridSize/2; x < gridSize/2; x += cellSize) {
    for (let z = -gridSize/2; z < gridSize/2; z += cellSize) {
      const cellGeometry = new THREE.PlaneGeometry(cellSize, cellSize)
      const cellMesh = new THREE.Mesh(cellGeometry, gridMaterial.clone())
      cellMesh.rotation.x = -Math.PI / 2
      cellMesh.position.set(x + cellSize/2, 0.1, z + cellSize/2)
      populationGroup.add(cellMesh)
    }
  }
}

// 创建环境传感器
const createEnvironmentSensors = () => {
  const sensorGeometry = new THREE.CylinderGeometry(1, 1, 5, 8)
  
  populationEnvSystem.value.environmentSensors.forEach(sensor => {
    const sensorMaterial = new THREE.MeshBasicMaterial({ color: sensor.color })
    const sensorMesh = new THREE.Mesh(sensorGeometry, sensorMaterial)
    sensorMesh.position.set(sensor.position.x, sensor.position.y, sensor.position.z)
    sensorMesh.userData = { entity: sensor }
    sensorGroup.add(sensorMesh)
    sensorMeshes.push(sensorMesh)
    
    // 添加粒子效果
    const particleGeometry = new THREE.BufferGeometry()
    const particleCount = 100
    const positions = new Float32Array(particleCount * 3)
    
    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 10
      positions[i + 1] = Math.random() * 5
      positions[i + 2] = (Math.random() - 0.5) * 10
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const particleMaterial = new THREE.PointsMaterial({ color: sensor.color, size: 0.2, transparent: true, opacity: 0.5 })
    const particleSystem = new THREE.Points(particleGeometry, particleMaterial)
    particleSystem.position.set(sensor.position.x, sensor.position.y, sensor.position.z)
    sensorGroup.add(particleSystem)
  })
}

// 创建公共设施
const createPublicFacilities = () => {
  const facilityGeometries = {
    hospital: new THREE.CylinderGeometry(2, 2, 15, 8),
    school: new THREE.BoxGeometry(5, 10, 5),
    subway: new THREE.TorusGeometry(3, 1, 8, 16)
  }
  
  populationEnvSystem.value.publicFacilities.forEach(facility => {
    const geometry = facilityGeometries[facility.facilityType] || facilityGeometries.hospital
    const facilityMaterial = new THREE.MeshBasicMaterial({ color: facility.color })
    const facilityMesh = new THREE.Mesh(geometry, facilityMaterial)
    facilityMesh.position.set(facility.position.x, facility.position.y, facility.position.z)
    facilityMesh.userData = { entity: facility }
    facilityGroup.add(facilityMesh)
    facilityMeshes.push(facilityMesh)
  })
}

// 创建应急事件
const createEmergencyEvents = () => {
  const eventGeometry = new THREE.SphereGeometry(3, 8, 8)
  
  populationEnvSystem.value.emergencyEvents.forEach(event => {
    const eventMaterial = new THREE.MeshBasicMaterial({ color: event.color })
    const eventMesh = new THREE.Mesh(eventGeometry, eventMaterial)
    eventMesh.position.set(event.position.x, event.position.y, event.position.z)
    eventMesh.userData = { entity: event }
    eventGroup.add(eventMesh)
    eventMeshes.push(eventMesh)
  })
}

// 更新人口密度热力图
const updatePopulationGrid = () => {
  const currentTime = populationEnvSystem.value.currentTime
  const currentHourData = populationEnvSystem.value.populationData.find(item => item.hour === currentTime)
  
  if (currentHourData) {
    let index = 0
    populationGroup.children.forEach(cell => {
      if (currentHourData.data[index]) {
        const density = currentHourData.data[index].density
        const color = getPopulationColor(density)
        cell.material.color.set(color)
        cell.material.opacity = density * 0.5
      }
      index++
    })
  }
}

// 获取人口密度颜色
const getPopulationColor = (density) => {
  // 颜色渐变：绿色（低）-> 黄色（中）-> 红色（高）
  if (density < 0.3) {
    return new THREE.Color(0x00ff00)
  } else if (density < 0.7) {
    return new THREE.Color(0xffff00)
  } else {
    return new THREE.Color(0xff0000)
  }
}

// 组件挂载时初始化
onMounted(() => {
  initScene()
  createSkybox()
  createClouds()
  createLights()
  generateBuildings()
  generateRoads()
  generateRiver()
  generateParks()
  createPopulationGrid()
  
  // 延迟初始化人口环境系统组件
  setTimeout(() => {
    createEnvironmentSensors()
    createPublicFacilities()
    createEmergencyEvents()
  }, 100)
  
  initPostProcessing()
  startAutoFlight()
  
  // 添加窗口大小变化监听
  window.addEventListener('resize', handleWindowResize)
  
  // 添加鼠标点击事件监听
  window.addEventListener('click', handleMouseClick)
  
  // 初始化WebSocket连接
  initWebSocket()
  
  // 启动渲染循环
  animate()
})

// 组件卸载时清理
onUnmounted(() => {
  // 停止动画循环
  cancelAnimationFrame(animationFrameId)
  
  // 移除窗口大小变化监听
  window.removeEventListener('resize', handleWindowResize)
  
  // 移除鼠标点击事件监听
  window.removeEventListener('click', handleMouseClick)
  
  // 关闭WebSocket连接
  if (ws) {
    ws.close()
  }
  
  // 清理Three.js资源
  scene.clear()
  renderer.dispose()
  composer.dispose()
  
  // 移除渲染器
  container.value.removeChild(renderer.domElement)
})
</script>

<style scoped>
.city-scene-container {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  position: fixed;
  top: 0;
  left: 0;
}
</style>
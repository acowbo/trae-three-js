<template>
  <div class="traffic-system">
    <!-- 交通流量图表 -->
    <div class="traffic-chart">
      <h3>实时流量统计</h3>
      <div ref="chartContainer" class="chart-container"></div>
    </div>
    
    <!-- 摄像头监控画面 -->
    <div v-if="selectedCamera" class="camera-view">
      <h3>摄像头监控 - {{ selectedCamera.name }}</h3>
      <div class="camera-video">
        <div class="placeholder-video">
          <p>摄像头监控画面</p>
          <p>视频文件不存在</p>
        </div>
      </div>
      <button @click="selectedCamera = null" class="close-btn">关闭</button>
    </div>
    
    <!-- 历史回放控制 -->
    <div class="history-control">
      <h3>历史回放</h3>
      <input type="range" v-model="historyTime" min="0" max="24" step="0.5" />
      <span>{{ historyTime }}:00</span>
      <button @click="toggleHistoryPlayback">{{ isPlayingHistory ? '暂停' : '播放' }}</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import * as THREE from 'three'

// 组件引用
const chartContainer = ref(null)
const cameraVideo = ref(null)

// 状态
const selectedCamera = ref(null)
const historyTime = ref(12)
const isPlayingHistory = ref(false)

// WebSocket连接由CityScene.vue管理，这里只接收数据更新

// 交通数据
const trafficData = ref([])
const cameras = ref([])

// 更新交通数据
const updateTrafficData = (data) => {
  trafficData.value = data.roads
  
  // 更新摄像头数据
  if (data.cameras) {
    cameras.value = data.cameras
  }
  
  // 更新图表
  updateChart()
}

// 初始化交通系统
const initTrafficSystem = () => {
  // 模拟初始数据
  const mockData = {
    roads: [
      { id: 'road-1', density: 0.3, color: 0x00ff00 },
      { id: 'road-2', density: 0.7, color: 0xffff00 },
      { id: 'road-3', density: 0.9, color: 0xff0000 }
    ],
    cameras: [
      { id: 'camera-1', name: '路口1', position: { x: 0, y: 10, z: 0 } },
      { id: 'camera-2', name: '路口2', position: { x: 100, y: 10, z: 0 } },
      { id: 'camera-3', name: '路口3', position: { x: 0, y: 10, z: 100 } }
    ]
  }
  
  updateTrafficData(mockData)
}

// 更新图表
const updateChart = () => {
  if (!chartContainer.value) return
  
  // 简单的柱状图实现
  chartContainer.value.innerHTML = ''
  
  trafficData.value.forEach((road, index) => {
    const bar = document.createElement('div')
    bar.className = 'chart-bar'
    bar.style.height = `${road.density * 100}%`
    bar.style.backgroundColor = `#${road.color.toString(16).padStart(6, '0')}`
    bar.style.left = `${index * 10}%`
    bar.title = `道路${index + 1}: ${Math.round(road.density * 100)}%拥堵`
    chartContainer.value.appendChild(bar)
  })
}

// 选择摄像头
const selectCamera = (cameraId) => {
  selectedCamera.value = cameras.value.find(cam => cam.id === cameraId)
}

// 切换历史回放
const toggleHistoryPlayback = () => {
  isPlayingHistory.value = !isPlayingHistory.value
  
  if (isPlayingHistory.value) {
    playHistory()
  }
}

// 播放历史
const playHistory = () => {
  const interval = setInterval(() => {
    if (!isPlayingHistory.value) {
      clearInterval(interval)
      return
    }
    
    historyTime.value += 0.5
    if (historyTime.value > 24) {
      historyTime.value = 0
    }
    
    // 模拟历史数据
    const mockHistoryData = {
      roads: trafficData.value.map(road => ({
        ...road,
        density: Math.random()
      }))
    }
    
    updateTrafficData(mockHistoryData)
  }, 500)
}

// 组件挂载时初始化
onMounted(() => {
  initTrafficSystem()
})

// 监听历史时间变化
watch(historyTime, (newTime) => {
  // 模拟历史数据
  const mockHistoryData = {
    roads: trafficData.value.map(road => ({
      ...road,
      density: Math.random()
    }))
  }
  
  updateTrafficData(mockHistoryData)
})

// 导出功能
const TrafficSystem = {
  selectCamera,
  updateTrafficData
}

defineExpose(TrafficSystem)
</script>

<style scoped>
.traffic-system {
  position: fixed;
  top: 20px;
  right: 20px;
  width: 300px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
  z-index: 1000;
}

.traffic-chart {
  margin-bottom: 20px;
}

.traffic-chart h3 {
  margin: 0 0 10px 0;
  font-size: 16px;
  color: #333;
}

.chart-container {
  width: 100%;
  height: 150px;
  background: #f0f0f0;
  border-radius: 4px;
  position: relative;
  overflow: hidden;
}

.chart-bar {
  position: absolute;
  bottom: 0;
  width: 8%;
  margin: 0 1%;
  border-radius: 4px 4px 0 0;
  transition: height 0.3s ease;
}

.camera-view {
  margin-bottom: 20px;
}

.camera-view h3 {
  margin: 0 0 10px 0;
  font-size: 16px;
  color: #333;
}

.camera-video {
  width: 100%;
  height: 150px;
  background: #000;
  border-radius: 4px;
  margin-bottom: 10px;
  overflow: hidden;
}

.camera-video video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.close-btn {
  width: 100%;
  padding: 8px;
  background: #ff6347;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.close-btn:hover {
  background: #ff4500;
}

.history-control {
  margin-bottom: 20px;
}

.history-control h3 {
  margin: 0 0 10px 0;
  font-size: 16px;
  color: #333;
}

.history-control input[type="range"] {
  width: 100%;
  margin-bottom: 10px;
}

.history-control button {
  width: 100%;
  padding: 8px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.history-control button:hover {
  background: #45a049;
}
</style>
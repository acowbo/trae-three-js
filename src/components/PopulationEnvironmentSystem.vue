<template>
  <div class="population-environment-system">
    <!-- 控制面板 -->
    <div class="control-panel">
      <!-- 人口密度时间轴 -->
      <div class="time-axis">
        <h3>人口密度时间轴</h3>
        <input type="range" v-model="currentTime" min="0" max="24" step="0.5" />
        <span>{{ currentTime }}:00</span>
        <button @click="toggleTimePlayback">{{ isPlayingTime ? '暂停' : '播放' }}</button>
      </div>
      
      <!-- 环境传感器控制面板 -->
      <div class="sensor-control">
        <h3>环境传感器</h3>
        <button @click="toggleSensorVisibility">{{ sensorsVisible ? '隐藏传感器' : '显示传感器' }}</button>
        <button @click="refreshSensorData">刷新数据</button>
      </div>
      
      <!-- 公共设施控制面板 -->
      <div class="facility-control">
        <h3>公共设施</h3>
        <input type="text" v-model="facilitySearch" placeholder="搜索设施..." />
        <select v-model="selectedFacilityType">
          <option value="all">所有设施</option>
          <option value="hospital">医院</option>
          <option value="school">学校</option>
          <option value="subway">地铁站</option>
        </select>
        <button @click="searchFacilities">搜索</button>
      </div>
      
      <!-- 应急事件控制面板 -->
      <div class="event-control">
        <h3>应急事件</h3>
        <button @click="toggleEventVisibility">{{ eventsVisible ? '隐藏事件' : '显示事件' }}</button>
        <button @click="exportReport">导出报告</button>
      </div>
    </div>
    
    <!-- 数据图表 -->
    <div class="data-charts">
      <div class="population-chart">
        <h3>人口密度统计</h3>
        <div ref="populationChartContainer" class="chart-container"></div>
      </div>
      
      <div class="environment-chart">
        <h3>空气质量统计</h3>
        <div ref="environmentChartContainer" class="chart-container"></div>
      </div>
      
      <div class="facility-chart">
        <h3>设施负载统计</h3>
        <div ref="facilityChartContainer" class="chart-container"></div>
      </div>
    </div>
    
    <!-- 详情面板 -->
    <div v-if="selectedEntity" class="detail-panel">
      <h3>{{ selectedEntity.name }}</h3>
      <div class="detail-content">
        <div v-if="selectedEntity.type === 'sensor'">
          <p>空气质量指数: {{ selectedEntity.data.airQuality }}</p>
          <p>PM2.5: {{ selectedEntity.data.pm25 }}</p>
          <p>温度: {{ selectedEntity.data.temperature }}°C</p>
          <p>湿度: {{ selectedEntity.data.humidity }}%</p>
        </div>
        <div v-else-if="selectedEntity.type === 'facility'">
          <p>类型: {{ selectedEntity.facilityType }}</p>
          <p>状态: {{ selectedEntity.status }}</p>
          <p>负载: {{ selectedEntity.load }}%</p>
          <p>位置: {{ selectedEntity.position.x }}, {{ selectedEntity.position.y }}, {{ selectedEntity.position.z }}</p>
        </div>
        <div v-else-if="selectedEntity.type === 'event'">
          <p>类型: {{ selectedEntity.eventType }}</p>
          <p>状态: {{ selectedEntity.status }}</p>
          <p>严重程度: {{ selectedEntity.severity }}</p>
          <p>位置: {{ selectedEntity.position.x }}, {{ selectedEntity.position.y }}, {{ selectedEntity.position.z }}</p>
          <p>建议: {{ selectedEntity.recommendation }}</p>
        </div>
      </div>
      <button @click="selectedEntity = null" class="close-btn">关闭</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import * as THREE from 'three'

// 组件引用
const populationChartContainer = ref(null)
const environmentChartContainer = ref(null)
const facilityChartContainer = ref(null)

// 状态
const currentTime = ref(12)
const isPlayingTime = ref(false)
const sensorsVisible = ref(true)
const eventsVisible = ref(true)
const facilitySearch = ref('')
const selectedFacilityType = ref('all')
const selectedEntity = ref(null)

// 数据
const populationData = ref([])
const environmentSensors = ref([])
const publicFacilities = ref([])
const emergencyEvents = ref([])

// 人口密度热力图网格
let populationGrid = null

// 初始化系统
const initSystem = () => {
  // 生成人口密度数据
  generatePopulationData()
  
  // 生成环境传感器
  generateEnvironmentSensors()
  
  // 生成公共设施
  generatePublicFacilities()
  
  // 生成应急事件
  generateEmergencyEvents()
  
  // 更新图表
  updatePopulationChart()
  updateEnvironmentChart()
  updateFacilityChart()
}

// 生成人口密度数据
const generatePopulationData = () => {
  // 生成24小时的人口密度数据
  for (let hour = 0; hour <= 24; hour += 0.5) {
    const data = []
    // 生成网格数据
    for (let x = -1000; x <= 1000; x += 100) {
      for (let z = -1000; z <= 1000; z += 100) {
        // 模拟人口密度变化
        const density = Math.sin((hour / 24) * Math.PI) * 0.5 + Math.random() * 0.3 + 0.2
        data.push({ x, z, density })
      }
    }
    populationData.value.push({ hour, data })
  }
}

// 生成环境传感器
const generateEnvironmentSensors = () => {
  const sensorTypes = ['air', 'temperature', 'humidity']
  
  for (let i = 0; i < 20; i++) {
    const x = THREE.MathUtils.randInt(-1000, 1000)
    const z = THREE.MathUtils.randInt(-1000, 1000)
    
    // 模拟传感器数据
    const airQuality = THREE.MathUtils.randInt(0, 100)
    const pm25 = THREE.MathUtils.randInt(0, 50)
    const temperature = THREE.MathUtils.randInt(15, 35)
    const humidity = THREE.MathUtils.randInt(40, 80)
    
    // 空气质量颜色
    let airColor = 0x00ff00 // 良好
    if (airQuality > 50) airColor = 0xffff00 // 中等
    if (airQuality > 75) airColor = 0xff0000 // 差
    
    environmentSensors.value.push({
      id: `sensor-${i}`,
      name: `传感器${i}`,
      type: 'sensor',
      position: { x, y: 5, z },
      data: { airQuality, pm25, temperature, humidity },
      color: airColor
    })
  }
}

// 生成公共设施
const generatePublicFacilities = () => {
  const facilityTypes = [
    { type: 'hospital', name: '医院', color: 0xff0000 },
    { type: 'school', name: '学校', color: 0x00ff00 },
    { type: 'subway', name: '地铁站', color: 0x0000ff }
  ]
  
  for (let i = 0; i < 30; i++) {
    const facilityType = facilityTypes[Math.floor(Math.random() * facilityTypes.length)]
    const x = THREE.MathUtils.randInt(-1000, 1000)
    const z = THREE.MathUtils.randInt(-1000, 1000)
    
    // 模拟设施状态
    const status = ['正常', '繁忙', '维护'][Math.floor(Math.random() * 3)]
    const load = Math.floor(Math.random() * 100)
    
    publicFacilities.value.push({
      id: `${facilityType.type}-${i}`,
      name: `${facilityType.name}${i}`,
      type: 'facility',
      facilityType: facilityType.type,
      position: { x, y: 10, z },
      status,
      load,
      color: facilityType.color
    })
  }
}

// 生成应急事件
const generateEmergencyEvents = () => {
  const eventTypes = [
    { type: 'accident', name: '交通事故', color: 0xff0000, severity: '高' },
    { type: 'fire', name: '火灾', color: 0xff6600, severity: '极高' },
    { type: 'medical', name: '医疗急救', color: 0xff00ff, severity: '中' }
  ]
  
  for (let i = 0; i < 5; i++) {
    const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)]
    const x = THREE.MathUtils.randInt(-1000, 1000)
    const z = THREE.MathUtils.randInt(-1000, 1000)
    
    // 模拟事件状态
    const status = ['处理中', '已处理', '待处理'][Math.floor(Math.random() * 3)]
    const recommendation = `立即派遣${eventType.type === 'fire' ? '消防车' : eventType.type === 'medical' ? '救护车' : '警车'}`
    
    emergencyEvents.value.push({
      id: `${eventType.type}-${i}`,
      name: `${eventType.name}${i}`,
      type: 'event',
      eventType: eventType.type,
      position: { x, y: 15, z },
      status,
      severity: eventType.severity,
      color: eventType.color,
      recommendation
    })
  }
}

// 更新人口密度图表
const updatePopulationChart = () => {
  if (!populationChartContainer.value) return
  
  // 简单的柱状图实现
  populationChartContainer.value.innerHTML = ''
  
  const currentHourData = populationData.value.find(item => item.hour === currentTime.value)
  if (currentHourData) {
    // 计算平均密度
    const avgDensity = currentHourData.data.reduce((sum, item) => sum + item.density, 0) / currentHourData.data.length
    
    const bar = document.createElement('div')
    bar.className = 'chart-bar'
    bar.style.height = `${avgDensity * 100}%`
    bar.style.backgroundColor = getPopulationColor(avgDensity)
    bar.title = `平均人口密度: ${Math.round(avgDensity * 100)}%`
    populationChartContainer.value.appendChild(bar)
  }
}

// 更新环境图表
const updateEnvironmentChart = () => {
  if (!environmentChartContainer.value) return
  
  // 简单的空气质量饼图
  environmentChartContainer.value.innerHTML = ''
  
  const goodCount = environmentSensors.value.filter(sensor => sensor.data.airQuality < 50).length
  const moderateCount = environmentSensors.value.filter(sensor => sensor.data.airQuality >= 50 && sensor.data.airQuality < 75).length
  const badCount = environmentSensors.value.filter(sensor => sensor.data.airQuality >= 75).length
  
  const total = goodCount + moderateCount + badCount
  
  const goodPercent = (goodCount / total) * 100
  const moderatePercent = (moderateCount / total) * 100
  const badPercent = (badCount / total) * 100
  
  const pie = document.createElement('div')
  pie.className = 'pie-chart'
  pie.innerHTML = `
    <div class="pie-segment" style="transform: rotate(${goodPercent}deg); background: #00ff00;"></div>
    <div class="pie-segment" style="transform: rotate(${moderatePercent}deg); background: #ffff00;"></div>
    <div class="pie-segment" style="transform: rotate(${badPercent}deg); background: #ff0000;"></div>
  `
  environmentChartContainer.value.appendChild(pie)
}

// 更新设施负载图表
const updateFacilityChart = () => {
  if (!facilityChartContainer.value) return
  
  // 简单的折线图实现
  facilityChartContainer.value.innerHTML = ''
  
  const hospitalLoad = publicFacilities.value.filter(f => f.facilityType === 'hospital').reduce((sum, f) => sum + f.load, 0) / publicFacilities.value.filter(f => f.facilityType === 'hospital').length
  const schoolLoad = publicFacilities.value.filter(f => f.facilityType === 'school').reduce((sum, f) => sum + f.load, 0) / publicFacilities.value.filter(f => f.facilityType === 'school').length
  const subwayLoad = publicFacilities.value.filter(f => f.facilityType === 'subway').reduce((sum, f) => sum + f.load, 0) / publicFacilities.value.filter(f => f.facilityType === 'subway').length
  
  const loads = [hospitalLoad, schoolLoad, subwayLoad]
  const labels = ['医院', '学校', '地铁']
  
  for (let i = 0; i < loads.length; i++) {
    const line = document.createElement('div')
    line.className = 'line-chart-line'
    line.style.height = `${loads[i]}%`
    line.style.left = `${i * 33.33}%`
    line.title = `${labels[i]}平均负载: ${Math.round(loads[i])}%`
    facilityChartContainer.value.appendChild(line)
  }
}

// 获取人口密度颜色
const getPopulationColor = (density) => {
  // 颜色渐变：绿色（低）-> 黄色（中）-> 红色（高）
  if (density < 0.3) {
    return `#${new THREE.Color(0x00ff00).getHexString()}`
  } else if (density < 0.7) {
    return `#${new THREE.Color(0xffff00).getHexString()}`
  } else {
    return `#${new THREE.Color(0xff0000).getHexString()}`
  }
}

// 时间轴播放控制
const toggleTimePlayback = () => {
  isPlayingTime.value = !isPlayingTime.value
  
  if (isPlayingTime.value) {
    playTime()
  }
}

// 播放时间轴
const playTime = () => {
  const interval = setInterval(() => {
    if (!isPlayingTime.value) {
      clearInterval(interval)
      return
    }
    
    currentTime.value += 0.5
    if (currentTime.value > 24) {
      currentTime.value = 0
    }
  }, 500)
}

// 切换传感器可见性
const toggleSensorVisibility = () => {
  sensorsVisible.value = !sensorsVisible.value
}

// 切换事件可见性
const toggleEventVisibility = () => {
  eventsVisible.value = !eventsVisible.value
}

// 刷新传感器数据
const refreshSensorData = () => {
  environmentSensors.value.forEach(sensor => {
    sensor.data.airQuality = THREE.MathUtils.randInt(0, 100)
    sensor.data.pm25 = THREE.MathUtils.randInt(0, 50)
    sensor.data.temperature = THREE.MathUtils.randInt(15, 35)
    sensor.data.humidity = THREE.MathUtils.randInt(40, 80)
    
    // 更新空气质量颜色
    let airColor = 0x00ff00 // 良好
    if (sensor.data.airQuality > 50) airColor = 0xffff00 // 中等
    if (sensor.data.airQuality > 75) airColor = 0xff0000 // 差
    sensor.color = airColor
  })
  
  updateEnvironmentChart()
}

// 搜索设施
const searchFacilities = () => {
  // 这里可以添加搜索逻辑
  console.log('搜索设施:', facilitySearch.value, selectedFacilityType.value)
}

// 导出报告
const exportReport = () => {
  // 简单的导出功能
  const report = {
    timestamp: new Date().toISOString(),
    populationData: populationData.value,
    environmentSensors: environmentSensors.value,
    publicFacilities: publicFacilities.value,
    emergencyEvents: emergencyEvents.value
  }
  
  const dataStr = JSON.stringify(report, null, 2)
  const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)
  
  const exportFileDefaultName = `city-report-${new Date().getTime()}.json`
  
  const linkElement = document.createElement('a')
  linkElement.setAttribute('href', dataUri)
  linkElement.setAttribute('download', exportFileDefaultName)
  linkElement.click()
}

// 选择实体
const selectEntity = (entity) => {
  selectedEntity.value = entity
}

// 监听时间变化
watch(currentTime, (newTime) => {
  updatePopulationChart()
})

// 组件挂载时初始化
onMounted(() => {
  initSystem()
})

// 导出功能
const PopulationEnvironmentSystem = {
  selectEntity,
  populationData,
  environmentSensors,
  publicFacilities,
  emergencyEvents,
  currentTime
}

defineExpose(PopulationEnvironmentSystem)
</script>

<style scoped>
.population-environment-system {
  position: fixed;
  top: 20px;
  left: 20px;
  width: 300px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
  z-index: 1000;
}

.control-panel > div {
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}

.control-panel h3 {
  margin: 0 0 10px 0;
  font-size: 14px;
  color: #333;
}

.time-axis input[type="range"] {
  width: 100%;
  margin-bottom: 5px;
}

.sensor-control button,
.event-control button,
.facility-control button {
  margin-right: 5px;
  margin-bottom: 5px;
  padding: 5px 10px;
  font-size: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
}

.facility-control input[type="text"],
.facility-control select {
  width: 100%;
  margin-bottom: 5px;
  padding: 5px;
  font-size: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.data-charts {
  margin-top: 20px;
}

.data-charts > div {
  margin-bottom: 20px;
}

.data-charts h3 {
  margin: 0 0 10px 0;
  font-size: 14px;
  color: #333;
}

.chart-container {
  width: 100%;
  height: 100px;
  background: #f0f0f0;
  border-radius: 4px;
  position: relative;
  overflow: hidden;
}

.chart-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  transition: height 0.5s ease;
}

.pie-chart {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  position: relative;
  overflow: hidden;
}

.pie-segment {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  transform-origin: 50% 50%;
}

.line-chart-line {
  position: absolute;
  bottom: 0;
  width: 3px;
  background: #333;
  transition: height 0.5s ease;
}

.detail-panel {
  position: fixed;
  top: 20px;
  left: 340px;
  width: 300px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
  z-index: 1000;
}

.detail-panel h3 {
  margin: 0 0 10px 0;
  font-size: 16px;
  color: #333;
}

.detail-content p {
  margin: 5px 0;
  font-size: 14px;
  color: #666;
}

.close-btn {
  margin-top: 10px;
  padding: 5px 10px;
  font-size: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
}
</style>
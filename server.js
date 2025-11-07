import { WebSocketServer } from 'ws';

// 创建WebSocket服务器
const wss = new WebSocketServer({ port: 8080 });

console.log('WebSocket服务器已启动，端口8080');

// 道路ID列表
const roadIds = [];
for (let i = -10; i <= 10; i++) {
  roadIds.push(`road-h-${i}`); // 横向道路
  roadIds.push(`road-v-${i}`); // 纵向道路
}

// 摄像头ID列表
const cameraIds = [];
for (let i = -10; i <= 10; i++) {
  for (let j = -10; j <= 10; j++) {
    if (i === 0 && j === 0) continue;
    cameraIds.push(`camera-${i}-${j}`);
  }
}

// 定期发送交通数据
setInterval(() => {
  const trafficData = {
    roads: roadIds.map(roadId => ({
      id: roadId,
      density: Math.random(), // 随机拥堵程度（0-1）
      color: getTrafficColor(Math.random()) // 根据拥堵程度生成颜色
    })),
    cameras: cameraIds.map(cameraId => ({
      id: cameraId,
      status: Math.random() > 0.5 ? 'online' : 'offline' // 随机在线状态
    }))
  };
  
  // 向所有连接的客户端发送数据
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(trafficData));
    }
  });
}, 1000); // 每秒发送一次数据

// 根据拥堵程度获取颜色
function getTrafficColor(density) {
  // 绿色：畅通（0-0.3）
  if (density < 0.3) {
    return 0x00ff00;
  }
  // 黄色：缓慢（0.3-0.7）
  else if (density < 0.7) {
    return 0xffff00;
  }
  // 红色：拥堵（0.7-1.0）
  else {
    return 0xff0000;
  }
}

// 处理客户端连接
wss.on('connection', (ws) => {
  console.log('客户端已连接');
  
  // 发送初始数据
  const initialData = {
    roads: roadIds.map(roadId => ({
      id: roadId,
      density: Math.random(),
      color: getTrafficColor(Math.random())
    })),
    cameras: cameraIds.map(cameraId => ({
      id: cameraId,
      status: 'online'
    }))
  };
  
  ws.send(JSON.stringify(initialData));
  
  // 处理客户端消息
  ws.on('message', (message) => {
    console.log('收到客户端消息:', message);
  });
  
  // 处理客户端断开连接
  ws.on('close', () => {
    console.log('客户端已断开连接');
  });
});